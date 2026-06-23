// src/lib/internal-api/auth.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export class InternalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "InternalApiError";
  }
}

/**
 * Validates the Authorization: Bearer {N8N_API_KEY} header.
 * Throws InternalApiError(401) if missing or invalid.
 */
export async function requireInternalAuth(request: NextRequest): Promise<void> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new InternalApiError(401, "INVALID_API_KEY", "Unauthorized");
  }
  const token = auth.slice(7);
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey || token !== apiKey) {
    throw new InternalApiError(401, "INVALID_API_KEY", "Unauthorized");
  }
}

/**
 * Validates that a tenantId refers to an existing, non-deleted Tenant.
 * Throws InternalApiError(404) if not found.
 */
export async function requireTenant(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) {
    throw new InternalApiError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }
}

/**
 * Converts any error into a NextResponse with the correct status code.
 * Use as the catch handler in every internal API route.
 */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof InternalApiError) {
    return NextResponse.json(
      { error: e.message, code: e.code },
      { status: e.status }
    );
  }
  console.error("[internal-api]", e);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
