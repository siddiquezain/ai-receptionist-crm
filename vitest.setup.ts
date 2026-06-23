// vitest.setup.ts
process.env.N8N_API_KEY = "test-api-key-32-bytes-minimum-length-ok";
process.env.N8N_WEBHOOK_SECRET = "test-webhook-secret-32-bytes-min-ok";
process.env.ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars for AES-256
process.env.DATABASE_URL = "postgresql://test"; // prevents prisma init errors in unit tests
