// src/lib/audit.ts
import { prisma } from "@/lib/prisma";
import { AuditActorType } from "@prisma/client";

interface LogAuditParams {
  tenantId: string;
  actorId?: string;
  actorType?: AuditActorType;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Errors are intentionally swallowed —
 * audit logging must never disrupt the primary user action.
 *
 * Call AFTER the primary database write succeeds.
 */
export async function logAudit({
  tenantId,
  actorId,
  actorType = AuditActorType.USER,
  action,
  resource,
  resourceId,
  changes,
}: LogAuditParams): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        tenantId,
        actorId: actorId ?? null,
        actorType,
        action,
        resource,
        resourceId,
        changes: changes ? (changes as object) : undefined,
      },
    })
    .catch(() => {
      // Intentionally swallowed: audit failures must not disrupt user actions.
    });
}
