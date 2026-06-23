"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CustomerOption } from "@/lib/appointments-queries";

export type ActionResult = { success: boolean; error?: string };

export async function searchCustomersAction(
  query: string,
  tenantId: string
): Promise<CustomerOption[]> {
  if (query.length < 2) return [];
  return prisma.customer.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPrismaUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function uniqueErrorMessage(e: unknown): string {
  const target =
    typeof e === "object" &&
    e !== null &&
    "meta" in e &&
    typeof (e as { meta?: { target?: string[] } }).meta?.target !== "undefined"
      ? ((e as { meta: { target: string[] } }).meta.target ?? [])
      : [];
  if (target.includes("email")) return "A customer with this email already exists";
  if (target.includes("phone")) return "A customer with this phone number already exists";
  return "A customer with these details already exists";
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createCustomer(
  tenantId: string,
  slug: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<ActionResult> {
  try {
    await prisma.customer.create({
      data: {
        tenantId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        tags: data.tags ?? [],
      },
    });
    revalidatePath(`/${slug}/customers`);
    return { success: true };
  } catch (e: unknown) {
    if (isPrismaUniqueError(e)) return { success: false, error: uniqueErrorMessage(e) };
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(
  tenantId: string,
  slug: string,
  id: string,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    tags?: string[];
    source?: string | null;
  }
): Promise<ActionResult> {
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Customer not found" };

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.source !== undefined ? { source: data.source?.trim() || null } : {}),
      },
    });
    revalidatePath(`/${slug}/customers`);
    revalidatePath(`/${slug}/customers/${id}`);
    return { success: true };
  } catch (e: unknown) {
    if (isPrismaUniqueError(e)) return { success: false, error: uniqueErrorMessage(e) };
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(
  tenantId: string,
  slug: string,
  id: string
): Promise<ActionResult> {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Customer not found" };

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath(`/${slug}/customers`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete customer" };
  }
}
