/**
 * Development seed script — creates a Supabase Auth user and the matching
 * DB records (User → Tenant → TenantMember) so you can log into the app,
 * then seeds reference data: Services, WorkingHours, AISettings, TeamMember.
 *
 * Usage:
 *   npm run seed:dev
 *
 * Credentials created:
 *   Email:    admin@demo.com
 *   Password: Admin1234!
 *   URL:      http://localhost:3000/demo-business/dashboard
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEV_EMAIL = "admin@demo.com";
const DEV_PASSWORD = "Admin1234!";
const DEV_NAME = "Admin User";
const DEV_BUSINESS = "Demo Business";
const DEV_SLUG = "demo-business";

const SYSTEM_PROMPT = `You are a professional appointment booking assistant for Demo Business.
Your role is to help customers schedule, reschedule, or cancel appointments via WhatsApp.
Always be polite, concise, and helpful.
When collecting information, ask one question at a time.
Never share internal system details, pricing structures, or staff information unless asked directly.
If you are unsure about availability, always defer to the booking system rather than guessing.`;

// ─── Clients ─────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}
if (!dbUrl) {
  console.error("❌  Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = postgres(dbUrl, { max: 1 });

// ─── Types ───────────────────────────────────────────────────────────────────

type SeedResult = { created: number; skipped: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`✅  ${msg}`); }
function info(msg: string) { console.log(`ℹ️   ${msg}`); }
function fail(msg: string) { console.error(`❌  ${msg}`); }

function cuid(): string {
  // Simple cuid-like ID for seeding purposes
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `c${timestamp}${random}`;
}

// ─── Seed helpers ────────────────────────────────────────────────────────────

async function seedServices(tenantId: string): Promise<SeedResult> {
  const services = [
    {
      name: "Consultation",
      description: "30-minute consultation session",
      duration: 30,
      bufferTime: 0,
      price: "50.00",
      currency: "USD",
    },
    {
      name: "Premium Consultation",
      description: "60-minute in-depth consultation",
      duration: 60,
      bufferTime: 0,
      price: "100.00",
      currency: "USD",
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const service of services) {
    const existing = await sql`
      SELECT id FROM "Service"
      WHERE "tenantId" = ${tenantId} AND name = ${service.name}
      LIMIT 1
    `;

    if (existing.length > 0) {
      info(`  Service "${service.name}" already exists — skipping`);
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO "Service" (id, "tenantId", name, description, duration, "bufferTime", price, currency, "isActive", "createdAt")
      VALUES (
        ${cuid()}, ${tenantId}, ${service.name}, ${service.description},
        ${service.duration}, ${service.bufferTime}, ${service.price},
        ${service.currency}, true, now()
      )
    `;
    ok(`  Service "${service.name}" created`);
    created++;
  }

  return { created, skipped };
}

async function seedWorkingHours(tenantId: string): Promise<SeedResult> {
  const days = [
    { dayOfWeek: 0, isOpen: false },  // Sunday — closed
    { dayOfWeek: 1, isOpen: true },   // Monday
    { dayOfWeek: 2, isOpen: true },   // Tuesday
    { dayOfWeek: 3, isOpen: true },   // Wednesday
    { dayOfWeek: 4, isOpen: true },   // Thursday
    { dayOfWeek: 5, isOpen: true },   // Friday
    { dayOfWeek: 6, isOpen: true },   // Saturday
  ];

  let created = 0;
  let skipped = 0;

  for (const day of days) {
    const existing = await sql`
      SELECT id FROM "WorkingHours"
      WHERE "tenantId" = ${tenantId}
        AND "dayOfWeek" = ${day.dayOfWeek}
        AND "teamMemberId" IS NULL
      LIMIT 1
    `;

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO "WorkingHours" (id, "tenantId", "teamMemberId", "dayOfWeek", "startTime", "endTime", "isOpen")
      VALUES (${cuid()}, ${tenantId}, NULL, ${day.dayOfWeek}, '09:00', '18:00', ${day.isOpen})
    `;
    created++;
  }

  return { created, skipped };
}

async function seedAISettings(tenantId: string): Promise<SeedResult> {
  const existing = await sql`
    SELECT id FROM "AISettings" WHERE "tenantId" = ${tenantId} LIMIT 1
  `;

  if (existing.length > 0) {
    info(`  AISettings already exists — skipping`);
    return { created: 0, skipped: 1 };
  }

  await sql`
    INSERT INTO "AISettings" (
      id, "tenantId", provider, model, temperature, "systemPrompt",
      "maxTokens", "autoBook", "requireConfirm", "byokApiKey", "createdAt", "updatedAt"
    )
    VALUES (
      ${cuid()}, ${tenantId}, 'google', 'gemini-2.0-flash', 0.7, ${SYSTEM_PROMPT},
      1000, true, false, NULL, now(), now()
    )
  `;
  ok(`  AISettings created (provider: google / gemini-2.0-flash)`);
  return { created: 1, skipped: 0 };
}

async function seedTeamMember(tenantId: string): Promise<SeedResult> {
  const existing = await sql`
    SELECT id FROM "TeamMember"
    WHERE "tenantId" = ${tenantId} AND email = 'sarah@demo.com'
    LIMIT 1
  `;

  if (existing.length > 0) {
    info(`  TeamMember sarah@demo.com already exists — skipping`);
    return { created: 0, skipped: 1 };
  }

  await sql`
    INSERT INTO "TeamMember" (id, "tenantId", "userId", name, email, role, "isActive", "createdAt")
    VALUES (${cuid()}, ${tenantId}, NULL, 'Sarah Johnson', 'sarah@demo.com', 'Staff', true, now())
  `;
  ok(`  TeamMember "Sarah Johnson" created`);
  return { created: 1, skipped: 0 };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Seeding development user…\n");

  // 1. Create or fetch Supabase Auth user (admin API bypasses email confirmation)
  let supabaseUserId: string;

  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    fail(`Failed to list Supabase users: ${listError.message}`);
    process.exit(1);
  }

  const existing = listData.users.find((u) => u.email === DEV_EMAIL);

  if (existing) {
    info(`Supabase Auth user already exists (id: ${existing.id})`);
    supabaseUserId = existing.id;

    // Ensure email is confirmed
    if (!existing.email_confirmed_at) {
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
        });
      if (updateError) {
        fail(`Failed to confirm email: ${updateError.message}`);
        process.exit(1);
      }
      ok("Email confirmed");
    }
  } else {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEV_NAME, business_name: DEV_BUSINESS },
      });

    if (createError || !created.user) {
      fail(`Failed to create Supabase user: ${createError?.message}`);
      process.exit(1);
    }

    supabaseUserId = created.user.id;
    ok(`Created Supabase Auth user (id: ${supabaseUserId})`);
  }

  // 2. Upsert User record in DB
  const existingUser = await sql`
    SELECT id FROM "User"
    WHERE "supabaseAuthId" = ${supabaseUserId}
    LIMIT 1
  `;

  let userId: string;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    info(`User record already exists (id: ${userId})`);
  } else {
    userId = cuid();
    await sql`
      INSERT INTO "User" (id, "supabaseAuthId", email, name, "createdAt")
      VALUES (${userId}, ${supabaseUserId}, ${DEV_EMAIL}, ${DEV_NAME}, now())
    `;
    ok(`User record created (id: ${userId})`);
  }

  // 3. Check if user already has a tenant membership
  const existingMembership = await sql`
    SELECT tm.id, t.id AS "tenantId", t.slug
    FROM "TenantMember" tm
    JOIN "Tenant" t ON t.id = tm."tenantId"
    WHERE tm."userId" = ${userId}
      AND t."deletedAt" IS NULL
    LIMIT 1
  `;

  let tenantSlug: string;
  let tenantId: string;

  if (existingMembership.length > 0) {
    tenantSlug = existingMembership[0].slug;
    tenantId = existingMembership[0].tenantId;
    info(`Tenant membership already exists → /${tenantSlug}/dashboard`);
  } else {
    // Ensure slug is unique
    let slug = DEV_SLUG;
    let attempt = 0;
    while (true) {
      const conflict = await sql`
        SELECT id FROM "Tenant" WHERE slug = ${slug} AND "deletedAt" IS NULL LIMIT 1
      `;
      if (conflict.length === 0) break;
      attempt++;
      slug = `${DEV_SLUG}-${attempt}`;
    }

    tenantId = cuid();
    const memberId = cuid();

    await sql`
      INSERT INTO "Tenant" (id, name, slug, plan, timezone, "createdAt")
      VALUES (${tenantId}, ${DEV_BUSINESS}, ${slug}, 'STARTER', 'UTC', now())
    `;
    ok(`Tenant created (slug: ${slug})`);

    await sql`
      INSERT INTO "TenantMember" (id, "userId", "tenantId", role, "createdAt")
      VALUES (${memberId}, ${userId}, ${tenantId}, 'OWNER', now())
    `;
    ok(`TenantMember created with OWNER role`);

    tenantSlug = slug;
  }

  // 4–7. Seed reference data
  console.log("\n─── Seeding reference data ─────────────────────────────────────\n");

  const results = {
    services:     await seedServices(tenantId),
    workingHours: await seedWorkingHours(tenantId),
    aiSettings:   await seedAISettings(tenantId),
    teamMember:   await seedTeamMember(tenantId),
  };

  // 8. Print credentials and summary
  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("  Dev credentials ready");
  console.log("─────────────────────────────────────────────────────────────────");
  console.log(`  Email    : ${DEV_EMAIL}`);
  console.log(`  Password : ${DEV_PASSWORD}`);
  console.log(`  Login    : http://localhost:3000/login`);
  console.log(`  Dashboard: http://localhost:3000/${tenantSlug}/dashboard`);
  console.log("─────────────────────────────────────────────────────────────────");

  const pad = (n: number) => String(n).padEnd(8);
  console.log("\n─── Seed Summary ─────────────────────────────────────────────────");
  console.log("  Entity           Created  Skipped");
  console.log("  ───────────────────────────────────────────────────────────────");
  console.log(`  Services         ${pad(results.services.created)}${results.services.skipped}`);
  console.log(`  WorkingHours     ${pad(results.workingHours.created)}${results.workingHours.skipped}`);
  console.log(`  AISettings       ${pad(results.aiSettings.created)}${results.aiSettings.skipped}`);
  console.log(`  TeamMember       ${pad(results.teamMember.created)}${results.teamMember.skipped}`);
  console.log("─────────────────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    fail(String(e));
    process.exit(1);
  })
  .finally(() => sql.end());
