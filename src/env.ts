// src/env.ts
// Called during Next.js server startup. Throws clearly if required vars are missing.

const required: Record<string, string> = {
  DATABASE_URL: "Supabase database connection string",
  NEXT_PUBLIC_SUPABASE_URL: "Supabase project URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase anon key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase service role key (server only)",
  ENCRYPTION_KEY: "64-char hex string for AES-256-GCM (generate with: openssl rand -hex 32)",
  N8N_API_KEY: "Shared secret for internal API auth (generate with: openssl rand -hex 32)",
  N8N_WEBHOOK_SECRET: "HMAC secret for n8n webhook verification",
};

const missing = Object.entries(required)
  .filter(([key]) => !process.env[key])
  .map(([key, desc]) => `  ${key}: ${desc}`);

if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  throw new Error(
    `Missing required environment variables:\n${missing.join("\n")}\n\nCheck your .env.local file.`
  );
}
