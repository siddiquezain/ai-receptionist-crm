import "dotenv/config";
import postgres from "postgres";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEMO_DATASET_VERSION = "2026-06-v1";
const DEMO_TENANT_SLUG    = "demo-business";

// ─── Client ──────────────────────────────────────────────────────────────────

const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌  Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}
const sql = postgres(dbUrl, { max: 1 });

// ─── Types ───────────────────────────────────────────────────────────────────

type SeedResult    = { created: number; skipped: number };
type ScenarioResult = { appointments: SeedResult; conversations: SeedResult; messages: SeedResult };
type Refs = {
  customers: Map<string, string>;  // email → id
  services:  Map<string, string>;  // name  → id
  members:   Map<string, string>;  // email → id
};

// ─── Logging ─────────────────────────────────────────────────────────────────

function ok(msg: string)   { console.log(`✅  ${msg}`); }
function info(msg: string) { console.log(`ℹ️   ${msg}`); }
function fail(msg: string) { console.error(`❌  ${msg}`); }

// ─── ID generator ────────────────────────────────────────────────────────────

function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random    = Math.random().toString(36).slice(2, 10);
  return `c${timestamp}${random}`;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(n: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

// ─── Load existing refs ──────────────────────────────────────────────────────

async function loadRefs(tenantId: string): Promise<Refs> {
  const [customers, services, members] = await Promise.all([
    sql`SELECT id, email FROM "Customer"   WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL`,
    sql`SELECT id, name  FROM "Service"    WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL AND "isActive" = true`,
    sql`SELECT id, email FROM "TeamMember" WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL AND "isActive" = true`,
  ]);
  return {
    customers: new Map(customers.map(r => [r.email as string, r.id as string])),
    services:  new Map(services.map(r  => [r.name  as string, r.id as string])),
    members:   new Map(members.map(r   => [r.email as string, r.id as string])),
  };
}

// ─── Message seeder ──────────────────────────────────────────────────────────

type MessageInput = { role: "USER" | "ASSISTANT" | "SYSTEM"; content: string };

async function seedMessages(
  conversationId: string,
  messages: MessageInput[],
  baseTime: Date,
): Promise<SeedResult> {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM "Message" WHERE "conversationId" = ${conversationId}
  `;
  if ((count as number) > 0) return { created: 0, skipped: messages.length };

  for (let i = 0; i < messages.length; i++) {
    await sql`
      INSERT INTO "Message" (id, "conversationId", role, content, "createdAt")
      VALUES (${cuid()}, ${conversationId}, ${messages[i].role}, ${messages[i].content},
              ${minutesAfter(baseTime, i * 2)})
    `;
  }
  return { created: messages.length, skipped: 0 };
}

// ─── Customer seeder ─────────────────────────────────────────────────────────

async function seedCustomers(tenantId: string, refs: Refs): Promise<SeedResult> {
  const rows = [
    { name: "Maria Santos",    email: "maria.santos@demo.com",    phone: "+15550101" },
    { name: "James Chen",      email: "james.chen@demo.com",      phone: "+15550102" },
    { name: "Sarah Williams",  email: "sarah.williams@demo.com",  phone: "+15550103" },
    { name: "Ahmed Al-Hassan", email: "ahmed.hassan@demo.com",    phone: "+15550104" },
    { name: "Emma Thompson",   email: "emma.thompson@demo.com",   phone: "+15550105" },
    { name: "Lucas Oliveira",  email: "lucas.oliveira@demo.com",  phone: "+15550106" },
    { name: "Aisha Patel",     email: "aisha.patel@demo.com",     phone: "+15550107" },
    { name: "Daniel Morrison", email: "daniel.morrison@demo.com", phone: "+15550108" },
    { name: "Nina Kovacs",     email: "nina.kovacs@demo.com",     phone: "+15550109" },
    { name: "Carlos Mendez",   email: "carlos.mendez@demo.com",   phone: "+15550110" },
    { name: "Priya Sharma",    email: "priya.sharma@demo.com",    phone: "+15550111" },
    { name: "Michael Torres",  email: "michael.torres@demo.com",  phone: "+15550112" },
  ];

  let created = 0, skipped = 0;
  for (const c of rows) {
    if (refs.customers.has(c.email)) { skipped++; continue; }
    const id = cuid();
    await sql`
      INSERT INTO "Customer" (id, "tenantId", name, email, phone, "createdAt")
      VALUES (${id}, ${tenantId}, ${c.name}, ${c.email}, ${c.phone}, now())
    `;
    refs.customers.set(c.email, id);
    created++;
  }
  ok(`Customers: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// ─── Main (skeleton — scenarios added in later tasks) ────────────────────────

async function main() {
  console.log(`\n🌱  Seeding demo data (${DEMO_DATASET_VERSION})…\n`);

  const [tenant] = await sql`
    SELECT id FROM "Tenant" WHERE slug = ${DEMO_TENANT_SLUG} AND "deletedAt" IS NULL LIMIT 1
  `;
  if (!tenant) {
    fail(`Tenant "${DEMO_TENANT_SLUG}" not found. Run npm run seed:dev first.`);
    process.exit(1);
  }
  const tenantId = tenant.id as string;
  info(`Tenant: ${tenantId}`);

  const refs = await loadRefs(tenantId);

  const customerResult = await seedCustomers(tenantId, refs);

  // Scenario results accumulated here — tasks 3–7 add to this
  const totals = {
    customers:     customerResult,
    appointments:  { created: 0, skipped: 0 },
    conversations: { created: 0, skipped: 0 },
    messages:      { created: 0, skipped: 0 },
  };

  const pad = (n: number) => String(n).padEnd(8);
  console.log("\n─── Demo Seed Summary ──────────────────────────────────────────────");
  console.log(`  Dataset version : ${DEMO_DATASET_VERSION}`);
  console.log("  Entity           Created  Skipped");
  console.log("  ──────────────────────────────────────────────────────────────");
  for (const [k, v] of Object.entries(totals)) {
    console.log(`  ${k.padEnd(16)} ${pad(v.created)}${v.skipped}`);
  }
  console.log("────────────────────────────────────────────────────────────────────");
  console.log(`  Dashboard: http://localhost:3000/${DEMO_TENANT_SLUG}/dashboard\n`);
}

main()
  .catch(e => { fail(String(e)); process.exit(1); })
  .finally(() => sql.end());
