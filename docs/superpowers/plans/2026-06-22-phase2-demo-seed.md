# Phase 2 – Demo Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/seed-demo-data.ts` — a scenario-based, idempotent seed script that populates 12 customers, 24 appointments, 8 WhatsApp conversations, and ~120 messages so every dashboard page shows realistic data.

**Architecture:** Single new file using raw SQL via the `postgres` package, mirroring the style of `seed-dev-user.ts`. Eight named scenario helpers (one per conversation type) each own their customers, appointment, conversation, and messages. A shared `loadRefs` function resolves existing IDs so scenarios never hardcode them. Date helpers compute past/future `Date` objects for realistic appointment distribution.

**Tech Stack:** TypeScript, `postgres` (raw SQL), `tsx`, `.env.local`

## Global Constraints

- Raw SQL only — no Prisma Client
- All helpers idempotent: safe to run multiple times without duplicates
- Reuse existing `Tenant`, `Service`, `TeamMember` records from `seed-dev-user.ts`
- `byokApiKey` is never touched
- All conversations use `channel = 'WHATSAPP'` and `aiHandled = true`
- `DEMO_DATASET_VERSION = "2026-06-v1"` printed in every run summary
- Appointment idempotency key: `(tenantId, customerId, startAt)`
- Conversation idempotency key: `(tenantId, externalId)` — values `demo-conv-001` through `demo-conv-008`
- Message idempotency: skip all messages for a conversation if `COUNT(*) > 0`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/seed-demo-data.ts` | Create | All demo seed logic |
| `package.json` | Modify | Add `seed:demo` script |

---

### Task 1: Scaffold — shared infrastructure

Create the file with all shared code: config, SQL client, type definitions, date utilities, `loadRefs`, `seedMessages`, and a `main()` skeleton. No scenario logic yet.

**Files:**
- Create: `scripts/seed-demo-data.ts`

**Interfaces:**
- Produces:
  - `type SeedResult = { created: number; skipped: number }`
  - `type ScenarioResult = { appointments: SeedResult; conversations: SeedResult; messages: SeedResult }`
  - `type Refs = { customers: Map<string,string>; services: Map<string,string>; members: Map<string,string> }`
  - `function daysAgo(n, hour?, minute?): Date`
  - `function daysFromNow(n, hour?, minute?): Date`
  - `function minutesAfter(d, m): Date`
  - `async function loadRefs(tenantId): Promise<Refs>`
  - `async function seedMessages(conversationId, messages, baseTime): Promise<SeedResult>`
  - `async function seedCustomers(tenantId, refs): Promise<SeedResult>`
  - `const DEMO_TENANT_SLUG`, `const DEMO_DATASET_VERSION`
  - module-level `sql` client

- [ ] **Step 1: Create the file**

```typescript
// scripts/seed-demo-data.ts
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
```

- [ ] **Step 2: Add `seed:demo` to `package.json`**

Open `package.json`. In the `"scripts"` block, add after the `seed:dev` line:

```json
"seed:demo": "tsx --env-file=.env.local scripts/seed-demo-data.ts"
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no output (zero errors)

- [ ] **Step 4: Do a dry run to confirm the scaffold works**

Run: `npm run seed:demo`
Expected output includes:
```
🌱  Seeding demo data (2026-06-v1)…

ℹ️   Tenant: c...
✅  Customers: 12 created, 0 skipped

─── Demo Seed Summary ───
  Dataset version : 2026-06-v1
  Entity           Created  Skipped
  Customers        12       0
  appointments     0        0
  conversations    0        0
  messages         0        0
```

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-demo-data.ts package.json package-lock.json
git commit -m "feat: scaffold seed-demo-data.ts with customers and shared infrastructure"
```

---

### Task 2: Booking scenarios — two completed WhatsApp booking conversations

Two calls to `seedBookingScenario(tenantId, refs, n)` with different customer/date data. Each creates one past `COMPLETED` appointment, one `RESOLVED` conversation, and 11–12 messages.

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Interfaces:**
- Consumes: `loadRefs`, `seedMessages`, `daysAgo`, `minutesAfter`, `SeedResult`, `ScenarioResult`, `Refs`, `cuid`, `sql`, `ok`, `fail`
- Produces: `async function seedBookingScenario(tenantId, refs, n: 1|2): Promise<ScenarioResult>`

- [ ] **Step 1: Insert `seedBookingScenario` before `main()`**

```typescript
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
```

- [ ] **Step 2: Wire both calls into `main()` and accumulate totals**

Replace the comment `// Scenario results accumulated here` block in `main()` with:

```typescript
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
```

- [ ] **Step 3: Run seed and verify**

Run: `npm run seed:demo`
Expected output includes lines like:
```
✅  Booking scenario 1 (maria.santos@demo.com): done
✅  Booking scenario 2 (james.chen@demo.com): done
```
Summary should show `appointments: 2`, `conversations: 2`, `messages: 23`.

- [ ] **Step 4: Verify idempotency**

Run `npm run seed:demo` again.
Expected: summary shows `appointments: 0 created / 2 skipped`, `conversations: 0 / 2`, `messages: 0 / 23`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat: add booking scenarios to demo seed (2 completed WhatsApp conversations)"
```

---

### Task 3: Cancelled and reschedule scenarios

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Interfaces:**
- Consumes: same shared helpers as Task 2
- Produces:
  - `async function seedCancelledScenario(tenantId, refs): Promise<ScenarioResult>`
  - `async function seedRescheduleScenario(tenantId, refs): Promise<ScenarioResult>`

- [ ] **Step 1: Add `seedCancelledScenario` before `main()`**

Lucas Oliveira — cancellation conversation, appointment CANCELLED with reason.

```typescript
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
```

- [ ] **Step 2: Add `seedRescheduleScenario` before `main()`**

Priya Sharma — rescheduling conversation, appointment currently CONFIRMED (upcoming).

```typescript
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
```

- [ ] **Step 3: Wire both into `main()` after the booking scenario calls**

```typescript
  add(await seedCancelledScenario(tenantId, refs));
  add(await seedRescheduleScenario(tenantId, refs));
```

- [ ] **Step 4: Run and verify**

Run: `npm run seed:demo`
Expected: 4 appointments, 4 conversations, ~42 messages in summary.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat: add cancelled and reschedule scenarios to demo seed"
```

---

### Task 4: Informational and follow-up scenarios

Three conversations with no booking outcome (hours inquiry, pricing inquiry, post-appointment check-in).

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Interfaces:**
- Produces:
  - `async function seedInfoScenario(tenantId, refs, n: 1|2): Promise<ScenarioResult>`
  - `async function seedFollowUpScenario(tenantId, refs): Promise<ScenarioResult>`

- [ ] **Step 1: Add `seedInfoScenario` before `main()`**

```typescript
async function seedInfoScenario(
  tenantId: string,
  refs: Refs,
  n: 1 | 2,
): Promise<ScenarioResult> {
  const config = {
    1: { email: "sarah.williams@demo.com", extId: "demo-conv-005", daysBack: 20, hour: 11 },
    2: { email: "michael.torres@demo.com", extId: "demo-conv-006", daysBack: 12, hour: 16 },
  }[n];

  const customerId = refs.customers.get(config.email);
  if (!customerId) {
    fail(`seedInfoScenario(${n}): missing customer ref`);
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  const convStart = daysAgo(config.daysBack, config.hour);

  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = ${config.extId} LIMIT 1
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
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', ${config.extId}, 'RESOLVED',
         true, ${convStart}, ${minutesAfter(convStart, 20)})
    `;
    convResult.created++;
  }

  const msgs1: MessageInput[] = [
    { role: "USER",      content: "Hi! What are your opening hours?" },
    { role: "ASSISTANT", content: "Hello! 👋 Demo Business is open:\n\n📅 Monday–Saturday: 9:00 AM – 6:00 PM\n🚫 Sunday: Closed\n\nIs there anything else I can help you with?" },
    { role: "USER",      content: "And do you have parking nearby?" },
    { role: "ASSISTANT", content: "There is street parking available and a public car park just 2 minutes' walk away. When you book, we'll send the full address. Would you like to schedule an appointment?" },
    { role: "USER",      content: "Maybe next week, I'll think about it" },
    { role: "ASSISTANT", content: "Of course! We'll be here whenever you're ready. Feel free to message us anytime. Have a great day! 😊" },
    { role: "USER",      content: "Thanks!" },
  ];

  const msgs2: MessageInput[] = [
    { role: "USER",      content: "Hi, I wanted to ask — how much does a consultation cost?" },
    { role: "ASSISTANT", content: "Hi there! Great question. Here are our services:\n\n💼 *Consultation* – 30 minutes, $50\n⭐ *Premium Consultation* – 60 minutes, $100\n\nThe Premium gives you twice the time for more in-depth discussion. Would you like to book?" },
    { role: "USER",      content: "What's included in each?" },
    { role: "ASSISTANT", content: "Both sessions are with our qualified team. The standard Consultation covers your core questions in a focused 30-minute session. The Premium adds a full hour for deeper planning, follow-up questions, and personalised recommendations.\n\nMany clients start with the standard and upgrade after their first visit." },
    { role: "USER",      content: "That's helpful, I'll consider it" },
    { role: "ASSISTANT", content: "Take your time! When you're ready just message us and we'll get you booked in right away. 😊" },
    { role: "USER",      content: "Will do, thanks" },
    { role: "ASSISTANT", content: "Looking forward to it! Have a great day 👋" },
  ];

  const msgResult = await seedMessages(convId, n === 1 ? msgs1 : msgs2, convStart);

  ok(`Info scenario ${n} (${config.email}): done`);
  return { appointments: { created: 0, skipped: 0 }, conversations: convResult, messages: msgResult };
}
```

- [ ] **Step 2: Add `seedFollowUpScenario` before `main()`**

Nina Kovacs — post-appointment check-in. Her `COMPLETED` appointment is also created here.

```typescript
async function seedFollowUpScenario(tenantId: string, refs: Refs): Promise<ScenarioResult> {
  const customerId = refs.customers.get("nina.kovacs@demo.com");
  const serviceId  = refs.services.get("Premium Consultation");
  const memberId   = refs.members.get("sarah@demo.com") ?? null;
  if (!customerId || !serviceId) {
    fail("seedFollowUpScenario: missing refs");
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  const apptStart   = daysAgo(11, 13);
  const apptEnd     = minutesAfter(apptStart, 60);
  const convStart   = daysAgo(9, 10);   // follow-up 2 days after appointment

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
         ${apptStart}, ${apptEnd}, 'COMPLETED', 'AI', ${daysAgo(14, 10)}, ${daysAgo(14, 10)})
    `;
    apptResult.created++;
  }

  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = 'demo-conv-007' LIMIT 1
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
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', 'demo-conv-007', 'RESOLVED',
         true, ${convStart}, ${minutesAfter(convStart, 15)})
    `;
    convResult.created++;
  }

  const messages: MessageInput[] = [
    { role: "ASSISTANT", content: "Hi Nina! 👋 This is Demo Business. We just wanted to check in after your Premium Consultation on Monday. How did everything go?" },
    { role: "USER",      content: "It was really great, thank you! Very helpful session" },
    { role: "ASSISTANT", content: "Wonderful to hear! We're so glad it was useful. Is there anything else we can help you with, or any follow-up questions from the session?" },
    { role: "USER",      content: "No, I think I have everything I need for now. I'll definitely be back" },
    { role: "ASSISTANT", content: "That's great to hear, Nina! We look forward to seeing you again. Feel free to message us anytime 😊" },
    { role: "USER",      content: "Will do. Thanks again!" },
    { role: "ASSISTANT", content: "Take care! 👋" },
  ];
  const msgResult = await seedMessages(convId, messages, convStart);

  ok(`Follow-up scenario (nina.kovacs@demo.com): done`);
  return { appointments: apptResult, conversations: convResult, messages: msgResult };
}
```

- [ ] **Step 3: Wire into `main()` after reschedule calls**

```typescript
  add(await seedInfoScenario(tenantId, refs, 1));
  add(await seedInfoScenario(tenantId, refs, 2));
  add(await seedFollowUpScenario(tenantId, refs));
```

- [ ] **Step 4: Run and verify**

Run: `npm run seed:demo`
Expected summary: 6 appointments, 7 conversations, ~75 messages.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat: add informational and follow-up scenarios to demo seed"
```

---

### Task 5: Active booking scenario — Emma Thompson (OPEN conversation)

One `OPEN` conversation cut off mid-flow. Appointment in `PENDING` status.

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Interfaces:**
- Produces: `async function seedActiveBookingScenario(tenantId, refs): Promise<ScenarioResult>`

- [ ] **Step 1: Add `seedActiveBookingScenario` before `main()`**

```typescript
async function seedActiveBookingScenario(tenantId: string, refs: Refs): Promise<ScenarioResult> {
  const customerId = refs.customers.get("emma.thompson@demo.com");
  const serviceId  = refs.services.get("Premium Consultation");
  const memberId   = refs.members.get("sarah@demo.com") ?? null;
  if (!customerId || !serviceId) {
    fail("seedActiveBookingScenario: missing refs");
    return { appointments: { created: 0, skipped: 0 }, conversations: { created: 0, skipped: 0 }, messages: { created: 0, skipped: 0 } };
  }

  // Appointment tentatively held — pending confirmation
  const apptStart = daysFromNow(2, 14);
  const apptEnd   = minutesAfter(apptStart, 60);
  const convStart = daysAgo(0, 9);    // started this morning

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
         "startAt", "endAt", status, "bookedVia", "createdAt")
      VALUES
        (${apptId}, ${tenantId}, ${customerId}, ${serviceId}, ${memberId},
         ${apptStart}, ${apptEnd}, 'PENDING', 'AI', ${convStart})
    `;
    apptResult.created++;
  }

  const convResult: SeedResult = { created: 0, skipped: 0 };
  const [existingConv] = await sql`
    SELECT id FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "externalId" = 'demo-conv-008' LIMIT 1
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
        (${convId}, ${tenantId}, ${customerId}, 'WHATSAPP', 'demo-conv-008', 'OPEN',
         true, ${convStart}, ${minutesAfter(convStart, 14)})
    `;
    await sql`UPDATE "Appointment" SET "conversationId" = ${convId} WHERE id = ${apptId}`;
    convResult.created++;
  }

  // Conversation is mid-flow — AI is waiting for Emma's confirmation
  const messages: MessageInput[] = [
    { role: "USER",      content: "Hello, can I book an appointment?" },
    { role: "ASSISTANT", content: "Hi there! Welcome to Demo Business. I'd be happy to help you book. What's your name?" },
    { role: "USER",      content: "Emma Thompson" },
    { role: "ASSISTANT", content: "Hi Emma! Nice to meet you. We have two services:\n\n• *Consultation* – 30 min ($50)\n• *Premium Consultation* – 60 min ($100)\n\nWhich would you like?" },
    { role: "USER",      content: "The premium one please, I need more time to go through everything" },
    { role: "ASSISTANT", content: "Great choice! Premium Consultation – 60 minutes at $100. We're open Monday–Saturday, 9:00 AM–6:00 PM.\n\nWhat date works for you?" },
    { role: "USER",      content: "What about this Friday?" },
    { role: "ASSISTANT", content: "Friday works! I have the following times available:\n\n• 9:00 AM\n• 11:00 AM\n• 2:00 PM\n• 4:00 PM\n\nWhich time would you prefer, Emma?" },
    { role: "USER",      content: "2pm please" },
    { role: "ASSISTANT", content: "Perfect! Just to confirm:\n\n📅 *Premium Consultation* – 60 min\n📆 Friday at 2:00 PM\n👤 Emma Thompson\n💰 $100\n\nShall I go ahead and book this for you?" },
  ];
  // Conversation ends here — waiting for Emma's reply. Status remains OPEN.
  const msgResult = await seedMessages(convId, messages, convStart);

  ok(`Active booking scenario (emma.thompson@demo.com): OPEN — awaiting customer reply`);
  return { appointments: apptResult, conversations: convResult, messages: msgResult };
}
```

- [ ] **Step 2: Wire into `main()` after follow-up call**

```typescript
  add(await seedActiveBookingScenario(tenantId, refs));
```

- [ ] **Step 3: Run and verify**

Run: `npm run seed:demo`
Expected: 8 conversations in summary (7 RESOLVED + 1 OPEN). Emma's conversation has 8 messages. The last message is the AI asking for confirmation with no USER reply.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat: add active booking scenario to demo seed (Emma Thompson, OPEN conversation)"
```

---

### Task 6: Historical appointments — analytics data without conversations

Remaining 16 appointments spread across 4 weeks. All customer IDs come from refs (populated by seedCustomers). No conversations — these represent phone/walk-in bookings.

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Interfaces:**
- Produces: `async function seedHistoricalAppointments(tenantId, refs): Promise<SeedResult>`

- [ ] **Step 1: Add `seedHistoricalAppointments` before `main()`**

```typescript
async function seedHistoricalAppointments(tenantId: string, refs: Refs): Promise<SeedResult> {
  const c  = refs.customers;
  const s  = refs.services;
  const m  = refs.members.get("sarah@demo.com") ?? null;
  const cs = s.get("Consultation")!;
  const ps = s.get("Premium Consultation")!;

  type ApptRow = {
    customerId: string; serviceId: string; startAt: Date;
    status: string; cancelledAt?: Date; cancellationReason?: string; confirmedAt?: Date;
  };

  const appts: ApptRow[] = [
    // Week -4
    { customerId: c.get("ahmed.hassan@demo.com")!,    serviceId: ps, startAt: daysAgo(25, 14), status: "COMPLETED" },
    { customerId: c.get("aisha.patel@demo.com")!,     serviceId: cs, startAt: daysAgo(24, 11), status: "COMPLETED" },
    { customerId: c.get("nina.kovacs@demo.com")!,     serviceId: cs, startAt: daysAgo(23, 14), status: "CANCELLED",
      cancelledAt: daysAgo(24, 9), cancellationReason: "personal reasons" },
    // Week -3
    { customerId: c.get("carlos.mendez@demo.com")!,   serviceId: ps, startAt: daysAgo(18, 15), status: "COMPLETED" },
    { customerId: c.get("sarah.williams@demo.com")!,  serviceId: cs, startAt: daysAgo(17, 11), status: "NO_SHOW" },
    { customerId: c.get("aisha.patel@demo.com")!,     serviceId: ps, startAt: daysAgo(15, 13), status: "COMPLETED" },
    // Week -2
    { customerId: c.get("maria.santos@demo.com")!,    serviceId: ps, startAt: daysAgo(11, 10), status: "COMPLETED" },
    { customerId: c.get("carlos.mendez@demo.com")!,   serviceId: cs, startAt: daysAgo(10, 15), status: "COMPLETED" },
    { customerId: c.get("michael.torres@demo.com")!,  serviceId: cs, startAt: daysAgo(10, 9),  status: "NO_SHOW" },
    { customerId: c.get("michael.torres@demo.com")!,  serviceId: ps, startAt: daysAgo(8, 14),  status: "CANCELLED",
      cancelledAt: daysAgo(9, 10), cancellationReason: "rescheduling" },
    // Week -1
    { customerId: c.get("james.chen@demo.com")!,      serviceId: ps, startAt: daysAgo(5, 10),  status: "COMPLETED" },
    { customerId: c.get("ahmed.hassan@demo.com")!,    serviceId: cs, startAt: daysAgo(5, 14),  status: "COMPLETED" },
    { customerId: c.get("carlos.mendez@demo.com")!,   serviceId: ps, startAt: daysAgo(3, 13),  status: "COMPLETED" },
    { customerId: c.get("aisha.patel@demo.com")!,     serviceId: cs, startAt: daysAgo(2, 10),  status: "COMPLETED" },
    // Upcoming
    { customerId: c.get("daniel.morrison@demo.com")!, serviceId: cs, startAt: daysFromNow(2, 14), status: "CONFIRMED",
      confirmedAt: daysAgo(1, 10) },
    { customerId: c.get("ahmed.hassan@demo.com")!,    serviceId: ps, startAt: daysFromNow(5, 14), status: "CONFIRMED",
      confirmedAt: daysAgo(2, 11) },
  ];

  let created = 0, skipped = 0;

  for (const row of appts) {
    if (!row.customerId || !row.serviceId) continue; // skip if ref missing (guard)

    const endAt = minutesAfter(row.startAt, row.serviceId === ps ? 60 : 30);

    const [existing] = await sql`
      SELECT id FROM "Appointment"
      WHERE "tenantId" = ${tenantId}
        AND "customerId" = ${row.customerId}
        AND "startAt" = ${row.startAt}
      LIMIT 1
    `;
    if (existing) { skipped++; continue; }

    await sql`
      INSERT INTO "Appointment"
        (id, "tenantId", "customerId", "serviceId", "teamMemberId",
         "startAt", "endAt", status, "bookedVia",
         "confirmedAt", "cancelledAt", "cancellationReason", "createdAt")
      VALUES
        (${cuid()}, ${tenantId}, ${row.customerId}, ${row.serviceId}, ${m},
         ${row.startAt}, ${endAt}, ${row.status}, 'MANUAL',
         ${row.confirmedAt ?? null}, ${row.cancelledAt ?? null},
         ${row.cancellationReason ?? null}, ${minutesAfter(row.startAt, -60)})
    `;
    created++;
  }

  ok(`Historical appointments: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}
```

- [ ] **Step 2: Wire into `main()` and accumulate appointment totals separately**

Add after `seedActiveBookingScenario` call:

```typescript
  const historicalResult = await seedHistoricalAppointments(tenantId, refs);
  totals.appointments.created += historicalResult.created;
  totals.appointments.skipped += historicalResult.skipped;
```

- [ ] **Step 3: Run and verify**

Run: `npm run seed:demo`
Expected summary:
```
  customers        12       0
  appointments     24       0
  conversations    8        0
  messages         ~90      0
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat: add historical appointments to demo seed for analytics data"
```

---

### Task 7: Full run, idempotency check, and final commit

- [ ] **Step 1: Run seed:dev to ensure fresh setup, then run seed:demo**

```bash
npm run seed:dev
npm run seed:demo
```

Expected: all entities created, zero errors, summary matches expected counts.

- [ ] **Step 2: Run seed:demo a second time**

```bash
npm run seed:demo
```

Expected: every `Created` column reads `0`, every `Skipped` column reads the full count. Zero errors.

- [ ] **Step 3: Spot-check the data via Supabase SQL editor**

Run these queries in the Supabase SQL editor or via `psql`:

```sql
-- Customer count
SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo-business');

-- Appointment status distribution
SELECT status, COUNT(*) FROM "Appointment"
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo-business')
GROUP BY status ORDER BY status;

-- Conversation status distribution
SELECT status, channel, COUNT(*) FROM "Conversation"
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo-business')
GROUP BY status, channel ORDER BY status;

-- Message count per conversation
SELECT c."externalId", COUNT(m.id) AS msg_count
FROM "Conversation" c
LEFT JOIN "Message" m ON m."conversationId" = c.id
WHERE c."tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo-business')
GROUP BY c."externalId" ORDER BY c."externalId";

-- Active conversation (should be OPEN, last message from ASSISTANT)
SELECT m.role, LEFT(m.content, 60) AS preview, m."createdAt"
FROM "Message" m
JOIN "Conversation" c ON c.id = m."conversationId"
WHERE c."externalId" = 'demo-conv-008'
ORDER BY m."createdAt";
```

Expected results:
- 12 customers
- Appointments: 14 COMPLETED, 3 CONFIRMED, 2 PENDING, 3 CANCELLED, 2 NO_SHOW
- 7 RESOLVED conversations + 1 OPEN conversation, all WHATSAPP
- demo-conv-008 has 8 messages, last role = ASSISTANT

- [ ] **Step 4: Commit plan doc**

```bash
git add docs/superpowers/plans/2026-06-22-phase2-demo-seed.md
git commit -m "docs: add Phase 2 demo seed implementation plan"
```

---

## Extension Point Reference

To add a new scenario in a future phase, follow this pattern:

```typescript
// 1. Add the function before main()
async function seedAbandonedBookingScenario(tenantId: string, refs: Refs): Promise<ScenarioResult> {
  // customer sends intent, AI asks for details, customer goes silent
  // conversation status: OPEN, no appointment created
  // externalId: "demo-conv-009"
  ...
}

// 2. Add the call in main() after existing scenarios
add(await seedAbandonedBookingScenario(tenantId, refs));
```

Available `externalId` slots for future conversations: `demo-conv-009` onwards.
