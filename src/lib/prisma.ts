import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaBase =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaBase;
}

const SOFT_DELETE_MODELS = new Set([
  "Customer",
  "Appointment",
  "Conversation",
  "TeamMember",
  "Service",
  "Tenant",
]);

// Use $extends for soft-delete filtering (Prisma 7 — $use is removed)
export const prisma = prismaBase.$extends({
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
          return (prismaBase as unknown as Record<string, { findFirst: (a: unknown) => unknown }>)[
            model.charAt(0).toLowerCase() + model.slice(1)
          ].findFirst({ where: { ...where, deletedAt: null }, ...rest });
        }
        return query(args);
      },
    },
  },
});

export type PrismaTransactionClient = Parameters<
  Parameters<typeof prismaBase.$transaction>[0]
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
