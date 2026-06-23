import { Suspense } from "react";
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
import { ConversationSkeleton } from "@/components/ui/skeletons";

export const metadata: Metadata = { title: "Inbox" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function InboxLoadingFallback() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </div>
    </div>
  );
}

interface LoaderProps {
  tenantSlug: string;
  conversationId: string | null;
}

async function InboxDataLoader({ tenantSlug, conversationId }: LoaderProps) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
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
  );
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const conversationId =
    typeof sp.conversation === "string" ? sp.conversation : null;

  return (
    <div className="h-dvh overflow-hidden">
      <Suspense fallback={<InboxLoadingFallback />}>
        <InboxDataLoader tenantSlug={slug} conversationId={conversationId} />
      </Suspense>
    </div>
  );
}
