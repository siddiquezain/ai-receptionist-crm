"use server"

import { prisma } from "@/lib/prisma"
import type { CommandCtx, CommandItem, CommandSection, MatchRange } from "@/components/command-palette/types"

function findMatches(text: string, query: string): MatchRange[] {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const matches: MatchRange[] = []
  let start = 0
  while (true) {
    const idx = lower.indexOf(q, start)
    if (idx === -1) break
    matches.push({ start: idx, end: idx + q.length })
    start = idx + 1
  }
  return matches
}

async function searchCustomers(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.customer.findMany({
    where: {
      tenantId: ctx.tenantId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, name: true, email: true },
  })
  return results.map((c) => ({
    id: `customer-${c.id}`,
    title: c.name,
    subtitle: c.email ?? undefined,
    icon: "User" as const,
    href: `/${ctx.tenantSlug}/customers/${c.id}`,
    section: "customers",
    matches: findMatches(c.name, query),
  }))
}

async function searchAppointments(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      deletedAt: null,
      OR: [
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
        { service: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 5,
    select: {
      id: true,
      startAt: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
  })
  return results.map((a) => ({
    id: `appointment-${a.id}`,
    title: a.customer?.name ?? "Unknown customer",
    subtitle: `${a.service.name} · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(a.startAt))}`,
    icon: "Calendar" as const,
    href: `/${ctx.tenantSlug}/appointments?open=${a.id}`,
    section: "appointments",
    matches: findMatches(a.customer?.name ?? "", query),
  }))
}

async function searchConversations(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.conversation.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { not: "ARCHIVED" },
      customer: { name: { contains: query, mode: "insensitive" } },
    },
    take: 5,
    select: {
      id: true,
      status: true,
      customer: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
  return results.map((c) => ({
    id: `conversation-${c.id}`,
    title: c.customer?.name ?? "Unknown customer",
    subtitle: c.status,
    icon: "MessageSquare" as const,
    href: `/${ctx.tenantSlug}/inbox?conversation=${c.id}`,
    section: "conversations",
    matches: findMatches(c.customer?.name ?? "", query),
  }))
}

export async function globalSearch(
  query: string,
  tenantId: string,
  tenantSlug: string
): Promise<CommandSection[]> {
  if (query.length < 2) return []

  const ctx: CommandCtx = { tenantId, tenantSlug }

  const [customers, appointments, conversations] = await Promise.all([
    searchCustomers(query, ctx),
    searchAppointments(query, ctx),
    searchConversations(query, ctx),
  ])

  return [
    { id: "customers", label: "Customers", items: customers },
    { id: "appointments", label: "Appointments", items: appointments },
    { id: "conversations", label: "Conversations", items: conversations },
  ].filter((s) => s.items.length > 0)
}
