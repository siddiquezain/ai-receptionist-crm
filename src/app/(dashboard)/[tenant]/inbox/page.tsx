import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getConversations,
  getConversationMessages,
  getConversationDetail,
  getConversationCustomerSnapshot,
  getConversationAIActivity,
} from "@/lib/inbox-queries";
import { InboxClient } from "@/components/inbox/inbox-client";

export const metadata: Metadata = { title: "Inbox" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  // Resolve current user's TeamMember for takeover actions
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  let currentTeamMemberId: string | null = null;
  if (supabaseUser) {
    const appUser = await prisma.user.findFirst({
      where: { supabaseAuthId: supabaseUser.id },
      select: { id: true },
    });
    if (appUser) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: appUser.id, tenantId: tenant.id },
        select: { id: true },
      });
      currentTeamMemberId = teamMember?.id ?? null;
    }
  }

  const conversationId =
    typeof sp.conversation === "string" ? sp.conversation : null;

  // Parallel fetch everything
  const [conversations, detail, messages] = await Promise.all([
    getConversations(tenant.id),
    conversationId
      ? getConversationDetail(tenant.id, conversationId)
      : Promise.resolve(null),
    conversationId
      ? getConversationMessages(tenant.id, conversationId)
      : Promise.resolve([]),
  ]);

  // Fetch customer snapshot + AI activity if conversation is selected
  const [customerSnapshot, aiActivity] = await Promise.all([
    detail?.customerId
      ? getConversationCustomerSnapshot(tenant.id, detail.customerId)
      : Promise.resolve(null),
    conversationId
      ? getConversationAIActivity(tenant.id, conversationId)
      : Promise.resolve([]),
  ]);

  return (
    <div className="h-[calc(100vh-var(--navbar-height,56px))] overflow-hidden">
      <InboxClient
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        timezone={tenant.timezone}
        currentTeamMemberId={currentTeamMemberId}
        conversations={conversations}
        selectedConversationId={conversationId}
        selectedConversation={detail}
        initialMessages={messages}
        customerSnapshot={customerSnapshot}
        aiActivity={aiActivity}
      />
    </div>
  );
}
