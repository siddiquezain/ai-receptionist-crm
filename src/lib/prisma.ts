import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// ─── Adapter ─────────────────────────────────────────────────────────────────
// Prisma 7 requires a driver adapter. PrismaPg uses the `pg` package and reads
// DATABASE_URL from the environment automatically.

function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaPg({ connectionString });
}

// ─── Soft-delete extension ────────────────────────────────────────────────────

const SOFT_DELETE_MODELS = new Set([
  "Customer",
  "Appointment",
  "Conversation",
  "TeamMember",
  "Service",
  "Tenant",
]);

// ─── Singleton ────────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof extendPrisma> | undefined;
};

function extendPrisma(client: PrismaClient): ReturnType<PrismaClient["$extends"]> {
  return client.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const { where, ...rest } = args as { where: Record<string, unknown> };
            return (client as unknown as Record<string, { findFirst: (a: unknown) => unknown }>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ].findFirst({ where: { ...where, deletedAt: null }, ...rest });
          }
          return query(args);
        },
      },
    },
  });
}

function createPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = createAdapter();
  const client = new PrismaClient({ adapter });
  const extended = extendPrisma(client);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = extended;
  }

  return extended;
}

export const prisma = createPrisma() as unknown as PrismaClient;

export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Set the RLS tenant context for the current transaction.
 * Must be called inside a $transaction before any tenant-scoped query.
 */
export async function setTenantContext(
  tx: PrismaTransactionClient,
  tenantId: string
) {
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
}
