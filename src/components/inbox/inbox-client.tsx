"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConversationList } from "./conversation-list";
import {
  ConversationFilters,
  ConversationFilterState,
  DEFAULT_FILTER_STATE,
  applyConversationFilter,
} from "./conversation-filters";
import { MessageThread } from "./message-thread";
import { EscalationBanner } from "./escalation-banner";
import { ThreadHeader } from "./thread-header";
import { MessageInput } from "./message-input";
import { RightPanel } from "./right-panel";
import { takeoverConversation } from "@/lib/actions/inbox";
import { toast } from "sonner";
import type {
  ConversationListItem,
  ConversationDetail,
  MessageItem,
  CustomerSnapshot,
  AIActivityEntry,
} from "@/lib/inbox-queries";

interface InboxClientProps {
  tenantId: string;
  tenantSlug: string;
  timezone: string;
  currentTeamMemberId: string | null;
  conversations: ConversationListItem[];
  selectedConversationId: string | null;
  selectedConversation: ConversationDetail | null;
  initialMessages: MessageItem[];
  customerSnapshot: CustomerSnapshot | null;
  aiActivity: AIActivityEntry[];
}

export function InboxClient({
  tenantId,
  tenantSlug,
  timezone,
  currentTeamMemberId,
  conversations: initialConversations,
  selectedConversationId,
  selectedConversation: initialSelectedConversation,
  initialMessages,
  customerSnapshot,
  aiActivity,
}: InboxClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local state — patched by Realtime
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(initialConversations);
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetail | null>(initialSelectedConversation);
  const [dismissedDraftId, setDismissedDraftId] = useState<string | null>(null);
  const [takingOver, setTakingOver] = useState(false);
  const [filter, setFilter] = useState<ConversationFilterState>(DEFAULT_FILTER_STATE);

  // Sync props → state on conversation switch (render-phase, not an effect)
  const [prevConversationId, setPrevConversationId] = useState(selectedConversationId);
  if (selectedConversationId !== prevConversationId) {
    setPrevConversationId(selectedConversationId);
    setMessages(initialMessages);
    setSelectedConversation(initialSelectedConversation);
    setDismissedDraftId(null);
  }

  // ── Realtime: new messages in selected conversation ──────────────────────────
  useEffect(() => {
    if (!selectedConversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${selectedConversationId}`)
      .on(
        "postgres_changes" as Parameters<
          ReturnType<typeof supabase.channel>["on"]
        >[0],
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${selectedConversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          const newMsg: MessageItem = {
            id: row.id as string,
            role: row.role as MessageItem["role"],
            content: row.content as string,
            isDraft: (row.isDraft as boolean | null | undefined) ?? false,
            createdAt: new Date(row.createdAt as string),
          };
          setMessages((prev) => {
            // Avoid duplicates (optimistic messages have local- prefix ids)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Replace matching optimistic message if content matches
            const withoutOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("local-") &&
                  m.content === newMsg.content &&
                  m.role === newMsg.role
                )
            );
            return [...withoutOptimistic, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  // ── Realtime: conversation status changes ────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversations-${tenantId}`)
      .on(
        "postgres_changes" as Parameters<
          ReturnType<typeof supabase.channel>["on"]
        >[0],
        {
          event: "UPDATE",
          schema: "public",
          table: "Conversation",
          filter: `tenantId=eq.${tenantId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          // Update conversation in list
          setConversations((prev) =>
            prev
              .map((c) =>
                c.id === row.id
                  ? {
                      ...c,
                      status: row.status as ConversationListItem["status"],
                      assignedToId: row.assignedToId as string | null,
                    }
                  : c
              )
              .sort((a, b) => {
                if (a.status === "ESCALATED" && b.status !== "ESCALATED")
                  return -1;
                if (b.status === "ESCALATED" && a.status !== "ESCALATED")
                  return 1;
                return b.updatedAt.getTime() - a.updatedAt.getTime();
              })
          );
          // Update selected conversation if it's the one that changed
          if (row.id === selectedConversationId) {
            setSelectedConversation((prev) =>
              prev
                ? {
                    ...prev,
                    status: row.status as ConversationDetail["status"],
                    assignedToId: row.assignedToId as string | null,
                  }
                : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, selectedConversationId]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function selectConversation(id: string) {
    startTransition(() => {
      router.replace(`${pathname}?conversation=${id}`);
    });
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const filteredConversations = applyConversationFilter(conversations, filter);

  const isStaffMode =
    selectedConversation !== null && selectedConversation.assignedToId !== null;

  const latestAIDraft =
    isStaffMode
      ? messages
          .filter(
            (m) =>
              m.role === "ASSISTANT" &&
              m.isDraft &&
              m.id !== dismissedDraftId
          )
          .at(-1) ?? null
      : null;

  // ── Escalation banner ────────────────────────────────────────────────────────
  async function handleEscalationTakeover() {
    if (!selectedConversationId || !currentTeamMemberId) return;
    setTakingOver(true);
    const result = await takeoverConversation(
      tenantId,
      tenantSlug,
      selectedConversationId,
      currentTeamMemberId
    );
    setTakingOver(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to take over");
    }
    // Realtime will update local state
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation list */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-[var(--border)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Inbox
          </p>
        </div>
        <ConversationFilters
          conversations={conversations}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && conversations.length > 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
              <MessageSquare className="h-7 w-7 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">
                {filter.status !== "ALL"
                  ? `No ${filter.status.toLowerCase()} conversations`
                  : "No conversations match the current filters"}
              </p>
              <button
                onClick={() => setFilter(DEFAULT_FILTER_STATE)}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversationId}
              onSelect={selectConversation}
            />
          )}
        </div>
      </div>

      {/* Middle: Thread */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Escalation banner */}
            {selectedConversation.status === "ESCALATED" &&
              !selectedConversation.assignedToId && (
                <EscalationBanner
                  onTakeover={handleEscalationTakeover}
                  isTakingOver={takingOver}
                />
              )}

            {/* Thread header */}
            <ThreadHeader
              conversation={selectedConversation}
              customerName={customerSnapshot?.name ?? null}
              tenantId={tenantId}
              tenantSlug={tenantSlug}
              currentTeamMemberId={currentTeamMemberId}
              onConversationUpdated={(patch) =>
                setSelectedConversation((prev) =>
                  prev ? { ...prev, ...patch } : prev
                )
              }
            />

            {/* Messages — dimmed while navigating */}
            <div
              className={`flex-1 overflow-hidden flex flex-col ${isPending ? "opacity-50" : ""}`}
            >
              <MessageThread messages={messages} />
            </div>

            {/* Input */}
            <MessageInput
              tenantId={tenantId}
              tenantSlug={tenantSlug}
              conversationId={selectedConversationId!}
              isStaffMode={isStaffMode}
              aiDraft={latestAIDraft}
              onDraftDismissed={() =>
                setDismissedDraftId(latestAIDraft?.id ?? null)
              }
              onMessageSent={(msg) =>
                setMessages((prev) => [...prev, msg])
              }
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <MessageSquare className="size-10 text-[var(--border)]" />
            <p className="text-sm text-[var(--text-muted)]">
              Select a conversation to get started.
            </p>
          </div>
        )}
      </div>

      {/* Right: Panel */}
      {selectedConversation && (
        <div className="hidden lg:block w-[320px] shrink-0 overflow-hidden">
          <RightPanel
            snapshot={customerSnapshot}
            aiActivity={aiActivity}
            tenantSlug={tenantSlug}
            timezone={timezone}
          />
        </div>
      )}
    </div>
  );
}
