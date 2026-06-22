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

// ─── Booking scenario seeder ─────────────────────────────────────────────────

async function seedBookingScenario(
  tenantId: string,
  refs: Refs,
  n: 1 | 2,
): Promise<ScenarioResult> {
  const config = {
    1: { email: "maria.santos@demo.com",  service: "Consultation",         extId: "demo-conv-001", daysBack: 25, apptHour: 10, convHour: 9  },
    2: { email: "james.chen@demo.com",    service: "Consultation",         extId: "demo-conv-002", daysBack: 18, apptHour: 9,  convHour: 8  },
  }[n];

  const customerId = refs.customers.get(config.email);
  const serviceId  = refs.services.get(config.service);
  const memberId   = refs.members.get("sarah@demo.com") ?? null;

  if (!customerId || !serviceId) {
    fail(`seedBookingScenario(${n}): missing customer or service ref`);
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  const apptStart = daysAgo(config.daysBack, config.apptHour);
  const apptEnd   = minutesAfter(apptStart, 30);
  const convStart = daysAgo(config.daysBack, config.convHour);

  // ── Appointment ──────────────────────────────────────────────────────────
  const apptResult: SeedResult = { created: 0, skipped: 0 };
  const [existingAppt] = await sql`
    SELECT id FROM "Appointment"
    WHERE "tenantId" = ${tenantId} AND "customerId" = ${customerId} AND "startAt" = ${apptStart}
    LIMIT 1
  `;
  let apptId: string;
  if (existingAppt) {
    apptId = existingAppt.id as string;
    apptResult.skipped++;
  } else {
    apptId = cuid();
    await sql`
      INSERT INTO "Appointment"
        (id, "tenantId", "customerId", "serviceId", "teamMemberId",
         "startAt", "endAt", status, "bookedVia", "confirmedAt", "createdAt")
      VALUES
        (${apptId}, ${tenantId}, ${customerId}, ${serviceId}, ${memberId},
         ${apptStart}, ${apptEnd}, 'COMPLETED', 'AI', ${convStart}, ${convStart})
    `;
    apptResult.created++;
  }

  // ── Conversation ─────────────────────────────────────────────────────────
  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = ${config.extId}
    LIMIT 1
  `;
  let convId: string;
  if (existingConv) {
    convId = existingConv.id as string;
    convResult.skipped++;
  } else {
    convId = cuid();
    await sql`
      INSERT INTO "Conversation"
        (id, "tenantId", "customerId", channel, "externalId", status,
         "aiHandled", "createdAt", "updatedAt")
      VALUES
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', ${config.extId}, 'RESOLVED',
         true, ${convStart}, ${apptEnd})
    `;
    await sql`UPDATE "Appointment" SET "conversationId" = ${convId} WHERE id = ${apptId}`;
    convResult.created++;
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  const msgs1: MessageInput[] = [
    { role: "USER",      content: "Hi there! I'd like to book an appointment please 😊" },
    { role: "ASSISTANT", content: "Hello! Welcome to Demo Business. I'd be happy to help you schedule. May I have your name?" },
    { role: "USER",      content: "Sure, it's Maria Santos" },
    { role: "ASSISTANT", content: "Hi Maria! We have two services available:\n\n• *Consultation* – 30 min ($50)\n• *Premium Consultation* – 60 min ($100)\n\nWhich would you prefer?" },
    { role: "USER",      content: "The regular consultation please" },
    { role: "ASSISTANT", content: "Perfect! The Consultation is 30 minutes at $50. We're open Monday–Saturday, 9:00 AM–6:00 PM.\n\nWhat date and time works best for you?" },
    { role: "USER",      content: "How about Tuesday at 10am?" },
    { role: "ASSISTANT", content: "Tuesday at 10:00 AM works! To confirm:\n\n📅 *Consultation* – 30 min\n📆 Tuesday at 10:00 AM\n👤 Maria Santos\n💰 $50\n\nShall I book this?" },
    { role: "USER",      content: "Yes please!" },
    { role: "ASSISTANT", content: "Your appointment is confirmed! ✅\n\n📅 Consultation – 30 min\n📆 Tuesday at 10:00 AM\n💰 $50\n\nWe look forward to seeing you, Maria! Reply *CANCEL* if you need to cancel." },
    { role: "SYSTEM",    content: `[Appointment booked via AI — ID: ${apptId}]` },
    { role: "USER",      content: "Thank you so much! See you then 👍" },
  ];

  const msgs2: MessageInput[] = [
    { role: "USER",      content: "Hello, I need to book an appointment" },
    { role: "ASSISTANT", content: "Hi there! Welcome to Demo Business. What's your name?" },
    { role: "USER",      content: "James Chen" },
    { role: "ASSISTANT", content: "Hi James! Here are our services:\n\n• *Consultation* – 30 min ($50)\n• *Premium Consultation* – 60 min ($100)\n\nWhich would you like?" },
    { role: "USER",      content: "The consultation please" },
    { role: "ASSISTANT", content: "Great! Consultation – 30 min at $50. We're available Monday–Saturday, 9:00 AM–6:00 PM.\n\nWhat day and time suits you?" },
    { role: "USER",      content: "Monday at 9am" },
    { role: "ASSISTANT", content: "Monday at 9:00 AM — perfect. To confirm:\n\n📅 *Consultation* – 30 min\n📆 Monday at 9:00 AM\n👤 James Chen\n💰 $50\n\nShall I book this?" },
    { role: "USER",      content: "Yes, go ahead" },
    { role: "ASSISTANT", content: "Done! ✅\n\nConsultation – Monday at 9:00 AM. We'll see you then, James! Message us anytime if you need to make changes." },
    { role: "SYSTEM",    content: `[Appointment booked via AI — ID: ${apptId}]` },
  ];

  const msgResult = await seedMessages(convId, n === 1 ? msgs1 : msgs2, convStart);

  ok(`Booking scenario ${n} (${config.email}): done`);
  return { appointments: apptResult, conversations: convResult, messages: msgResult };
}

// ─── Cancelled scenario seeder ──────────────────────────────────────────────

async function seedCancelledScenario(tenantId: string, refs: Refs): Promise<ScenarioResult> {
  const customerId = refs.customers.get("lucas.oliveira@demo.com");
  const serviceId  = refs.services.get("Consultation");
  const memberId   = refs.members.get("sarah@demo.com") ?? null;
  if (!customerId || !serviceId) {
    fail("seedCancelledScenario: missing refs");
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  const apptStart   = daysAgo(17, 14);
  const apptEnd     = minutesAfter(apptStart, 30);
  const convStart   = daysAgo(18, 10);
  const cancelledAt = daysAgo(17, 9);

  const apptResult: SeedResult = { created: 0, skipped: 0 };
  const [existingAppt] = await sql`
    SELECT id FROM "Appointment"
    WHERE "tenantId" = ${tenantId} AND "customerId" = ${customerId} AND "startAt" = ${apptStart}
    LIMIT 1
  `;
  let apptId: string;
  if (existingAppt) {
    apptId = existingAppt.id as string; apptResult.skipped++;
  } else {
    apptId = cuid();
    await sql`
      INSERT INTO "Appointment"
        (id, "tenantId", "customerId", "serviceId", "teamMemberId",
         "startAt", "endAt", status, "bookedVia", "cancelledAt", "cancellationReason", "createdAt")
      VALUES
        (${apptId}, ${tenantId}, ${customerId}, ${serviceId}, ${memberId},
         ${apptStart}, ${apptEnd}, 'CANCELLED', 'AI', ${cancelledAt}, 'schedule conflict', ${convStart})
    `;
    apptResult.created++;
  }

  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = 'demo-conv-003' LIMIT 1
  `;
  let convId: string;
  if (existingConv) {
    convId = existingConv.id as string; convResult.skipped++;
  } else {
    convId = cuid();
    await sql`
      INSERT INTO "Conversation"
        (id, "tenantId", "customerId", channel, "externalId", status,
         "aiHandled", "createdAt", "updatedAt")
      VALUES
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', 'demo-conv-003', 'RESOLVED',
         true, ${convStart}, ${cancelledAt})
    `;
    await sql`UPDATE "Appointment" SET "conversationId" = ${convId} WHERE id = ${apptId}`;
    convResult.created++;
  }

  const messages: MessageInput[] = [
    { role: "USER",      content: "Hi, I need to cancel my appointment" },
    { role: "ASSISTANT", content: "Hi there! I can help with that. Could I have your name please?" },
    { role: "USER",      content: "Lucas Oliveira" },
    { role: "ASSISTANT", content: "Thanks Lucas. I can see your Consultation scheduled for tomorrow. May I ask why you need to cancel? This helps us improve." },
    { role: "USER",      content: "I have a schedule conflict, really sorry about that" },
    { role: "ASSISTANT", content: "No worries at all, Lucas! Your appointment has been cancelled. We hope to see you again soon — just message us whenever you'd like to rebook. 😊" },
    { role: "SYSTEM",    content: `[Appointment cancelled — reason: schedule conflict — ID: ${apptId}]` },
    { role: "USER",      content: "Thank you for understanding. I'll rebook soon!" },
    { role: "ASSISTANT", content: "Sounds great! We'll be here whenever you're ready. Take care! 👋" },
  ];
  const msgResult = await seedMessages(convId, messages, convStart);

  ok(`Cancelled scenario (lucas.oliveira@demo.com): done`);
  return { appointments: apptResult, conversations: convResult, messages: msgResult };
}

// ─── Reschedule scenario seeder ──────────────────────────────────────────────

async function seedRescheduleScenario(tenantId: string, refs: Refs): Promise<ScenarioResult> {
  const customerId = refs.customers.get("priya.sharma@demo.com");
  const serviceId  = refs.services.get("Consultation");
  const memberId   = refs.members.get("sarah@demo.com") ?? null;
  if (!customerId || !serviceId) {
    fail("seedRescheduleScenario: missing refs");
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  // Original slot was Monday — conversation moved it to Wednesday (upcoming)
  const apptStart   = daysFromNow(3, 10);
  const apptEnd     = minutesAfter(apptStart, 30);
  const convStart   = daysAgo(5, 15);
  const confirmedAt = daysAgo(5, 16);

  const apptResult: SeedResult = { created: 0, skipped: 0 };
  const [existingAppt] = await sql`
    SELECT id FROM "Appointment"
    WHERE "tenantId" = ${tenantId} AND "customerId" = ${customerId} AND "startAt" = ${apptStart}
    LIMIT 1
  `;
  let apptId: string;
  if (existingAppt) {
    apptId = existingAppt.id as string; apptResult.skipped++;
  } else {
    apptId = cuid();
    await sql`
      INSERT INTO "Appointment"
        (id, "tenantId", "customerId", "serviceId", "teamMemberId",
         "startAt", "endAt", status, "bookedVia", "confirmedAt", "createdAt")
      VALUES
        (${apptId}, ${tenantId}, ${customerId}, ${serviceId}, ${memberId},
         ${apptStart}, ${apptEnd}, 'CONFIRMED', 'AI', ${confirmedAt}, ${convStart})
    `;
    apptResult.created++;
  }

  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = 'demo-conv-004' LIMIT 1
  `;
  let convId: string;
  if (existingConv) {
    convId = existingConv.id as string; convResult.skipped++;
  } else {
    convId = cuid();
    await sql`
      INSERT INTO "Conversation"
        (id, "tenantId", "customerId", channel, "externalId", status,
         "aiHandled", "createdAt", "updatedAt")
      VALUES
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', 'demo-conv-004', 'RESOLVED',
         true, ${convStart}, ${confirmedAt})
    `;
    await sql`UPDATE "Appointment" SET "conversationId" = ${convId} WHERE id = ${apptId}`;
    convResult.created++;
  }

  const messages: MessageInput[] = [
    { role: "USER",      content: "Hi, I have an appointment booked for Monday but need to change the day" },
    { role: "ASSISTANT", content: "Hi there! Happy to help with rescheduling. Could I have your name?" },
    { role: "USER",      content: "Priya Sharma" },
    { role: "ASSISTANT", content: "Hi Priya! I can see your Consultation on Monday. What day works better for you?" },
    { role: "USER",      content: "Could I move it to Wednesday instead? Same time if possible" },
    { role: "ASSISTANT", content: "Wednesday at 10:00 AM works perfectly. To confirm the change:\n\n📅 *Consultation* – 30 min\n📆 Wednesday at 10:00 AM\n👤 Priya Sharma\n\nShall I update your booking?" },
    { role: "USER",      content: "Yes please, that's great" },
    { role: "ASSISTANT", content: "Done! ✅ Your appointment has been moved to Wednesday at 10:00 AM. See you then, Priya!" },
    { role: "SYSTEM",    content: `[Appointment rescheduled to Wednesday 10:00 AM — ID: ${apptId}]` },
    { role: "USER",      content: "Perfect, thank you!" },
  ];
  const msgResult = await seedMessages(convId, messages, convStart);

  ok(`Reschedule scenario (priya.sharma@demo.com): done`);
  return { appointments: apptResult, conversations: convResult, messages: msgResult };
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

  const totals = {
    customers:     customerResult,
    appointments:  { created: 0, skipped: 0 },
    conversations: { created: 0, skipped: 0 },
    messages:      { created: 0, skipped: 0 },
  };

  function add(r: ScenarioResult) {
    totals.appointments.created  += r.appointments.created;
    totals.appointments.skipped  += r.appointments.skipped;
    totals.conversations.created += r.conversations.created;
    totals.conversations.skipped += r.conversations.skipped;
    totals.messages.created      += r.messages.created;
    totals.messages.skipped      += r.messages.skipped;
  }

  add(await seedBookingScenario(tenantId, refs, 1));
  add(await seedBookingScenario(tenantId, refs, 2));
  add(await seedCancelledScenario(tenantId, refs));
  add(await seedRescheduleScenario(tenantId, refs));

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
