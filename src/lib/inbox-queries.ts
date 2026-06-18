import {
  ConversationChannel,
  ConversationStatus,
  MessageRole,
} from "@prisma/client";
import { prisma } from "./prisma";

// ─── Exported types ───────────────────────────────────────────────────────────

export type ConversationListItem = {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  assignedToId: string | null;
  updatedAt: Date;
  customer: { name: string } | null;
  lastMessage: { content: string; role: MessageRole } | null;
};

export type ConversationDetail = {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  assignedToId: string | null;
  customerId: string | null;
};

export type MessageItem = {
  id: string;
  role: MessageRole;
  content: string;
  isDraft: boolean;
  createdAt: Date;
};

export type CustomerSnapshot = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  tags: string[];
  totalAppointments: number;
  nextAppointment: {
    id: string;
    startAt: Date;
    status: import("@prisma/client").AppointmentStatus;
    service: { name: string };
  } | null;
};

export type AIActivityEntry = {
  id: string;
  createdAt: Date;
  provider: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: string;
};

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getConversations(
  tenantId: string
): Promise<ConversationListItem[]> {
  const convs = await prisma.conversation.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      channel: true,
      status: true,
      assignedToId: true,
      updatedAt: true,
      customer: { select: { name: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, role: true },
      },
    },
  });

  // Float ESCALATED to top, then sort by updatedAt desc
  return convs
    .map((c) => ({
      id: c.id,
      channel: c.channel,
      status: c.status,
      assignedToId: c.assignedToId,
      updatedAt: c.updatedAt,
      customer: c.customer,
      lastMessage: c.messages[0] ?? null,
    }))
    .sort((a, b) => {
      if (a.status === "ESCALATED" && b.status !== "ESCALATED") return -1;
      if (b.status === "ESCALATED" && a.status !== "ESCALATED") return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

export async function getConversationMessages(
  tenantId: string,
  conversationId: string
): Promise<MessageItem[]> {
  // Verify tenant ownership
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  });
  if (!conv) return [];

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      role: true,
      content: true,
      isDraft: true,
      createdAt: true,
    } as any,
  });

  return messages as unknown as MessageItem[];
}

export async function getConversationDetail(
  tenantId: string,
  conversationId: string
): Promise<ConversationDetail | null> {
  return prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: {
      id: true,
      channel: true,
      status: true,
      assignedToId: true,
      customerId: true,
    },
  });
}

export async function getConversationCustomerSnapshot(
  tenantId: string,
  customerId: string
): Promise<CustomerSnapshot | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      tags: true,
      _count: { select: { appointments: true } },
    },
  });
  if (!customer) return null;

  const nextAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId,
      customerId,
      startAt: { gte: new Date() },
      status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      status: true,
      service: { select: { name: true } },
    },
  });

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    tags: customer.tags,
    totalAppointments: customer._count.appointments,
    nextAppointment,
  };
}

export async function getConversationAIActivity(
  tenantId: string,
  conversationId: string
): Promise<AIActivityEntry[]> {
  const records = await prisma.aIUsageRecord.findMany({
    where: { tenantId, conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      provider: true,
      model: true,
      totalTokens: true,
      estimatedCostUsd: true,
    },
  });

  return records.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    provider: r.provider,
    model: r.model,
    totalTokens: r.totalTokens,
    estimatedCostUsd: r.estimatedCostUsd.toString(),
  }));
}
