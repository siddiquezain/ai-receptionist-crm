import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const SOFT_DELETE_MODELS = new Set([
  "Customer",
  "Appointment",
  "Conversation",
  "TeamMember",
  "Service",
  "Tenant",
]);

const prismaClientSingleton = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const client = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    } as any);

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    console.error("Failed to initialize PrismaClient:", (error as any).message);
    // In development without DATABASE_URL, create a minimal mock
    // that will error if actually used (which is fine for static pages)
    if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
      return new Proxy(
        {},
        {
          get() {
            throw new Error(
              "PrismaClient not initialized: DATABASE_URL not configured"
            );
          },
        }
      ) as unknown as PrismaClient;
    }
    throw error;
  }
};

declare global {
  var prismaExtended: ReturnType<PrismaClient["$extends"]> | undefined;
}

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
            // Downgrade to findFirst so we can add the deletedAt filter
            // (findUnique only accepts unique fields; findFirst accepts any where clause)
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

// Use $extends for soft-delete filtering (Prisma 7 — $use is removed)
const _prismaBase = prismaClientSingleton();
export const prisma = extendPrisma(_prismaBase) as unknown as PrismaClient;

export type PrismaTransactionClient = Parameters<
  Parameters<typeof _prismaBase["$transaction"]>[0]
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
