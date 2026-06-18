/**
 * Development seed script — creates a Supabase Auth user and the matching
 * DB records (User → Tenant → TenantMember) so you can log into the app.
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
    SELECT tm.id, t.slug
    FROM "TenantMember" tm
    JOIN "Tenant" t ON t.id = tm."tenantId"
    WHERE tm."userId" = ${userId}
      AND t."deletedAt" IS NULL
    LIMIT 1
  `;

  let tenantSlug: string;

  if (existingMembership.length > 0) {
    tenantSlug = existingMembership[0].slug;
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

    const tenantId = cuid();
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

  // 4. Print credentials
  console.log("\n─────────────────────────────────────────");
  console.log("  Dev credentials ready");
  console.log("─────────────────────────────────────────");
  console.log(`  Email    : ${DEV_EMAIL}`);
  console.log(`  Password : ${DEV_PASSWORD}`);
  console.log(`  Login    : http://localhost:3000/login`);
  console.log(`  Dashboard: http://localhost:3000/${tenantSlug}/dashboard`);
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    fail(String(e));
    process.exit(1);
  })
  .finally(() => sql.end());
