"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bot, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  takeoverConversation,
  releaseConversation,
  resolveConversation,
} from "@/lib/actions/inbox";
import type { ConversationDetail } from "@/lib/inbox-queries";
import type { ConversationChannel } from "@prisma/client";

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat",
  WHATSAPP: "WhatsApp",
};

interface ThreadHeaderProps {
  conversation: ConversationDetail;
  customerName: string | null;
  tenantId: string;
  tenantSlug: string;
  currentTeamMemberId: string | null;
  onConversationUpdated: (patch: Partial<ConversationDetail>) => void;
}

export function ThreadHeader({
  conversation,
  customerName,
  tenantId,
  tenantSlug,
  currentTeamMemberId,
  onConversationUpdated,
}: ThreadHeaderProps) {
  const [busy, setBusy] = useState(false);

  const isAssignedToCurrentUser =
    currentTeamMemberId !== null &&
    conversation.assignedToId === currentTeamMemberId;

  const isAssigned = conversation.assignedToId !== null;

  async function handleTakeover() {
    if (!currentTeamMemberId) return;
    setBusy(true);
    const result = await takeoverConversation(
      tenantId,
      tenantSlug,
      conversation.id,
      currentTeamMemberId
    );
    setBusy(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to take over");
      return;
    }
    onConversationUpdated({ assignedToId: currentTeamMemberId });
  }

  async function handleRelease() {
    setBusy(true);
    const result = await releaseConversation(
      tenantId,
      tenantSlug,
      conversation.id
    );
    setBusy(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to release");
      return;
    }
    onConversationUpdated({ assignedToId: null });
  }

  async function handleResolve() {
    setBusy(true);
    const result = await resolveConversation(
      tenantId,
      tenantSlug,
      conversation.id
    );
    setBusy(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to resolve");
      return;
    }
    onConversationUpdated({ assignedToId: null, status: "RESOLVED" });
  }

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {customerName ?? "Unknown"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-[var(--text-muted)]">
            {CHANNEL_LABEL[conversation.channel]}
          </span>
          {isAssigned && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                <UserCheck className="size-3" />
                {isAssignedToCurrentUser ? "You have taken over" : "Assigned to staff"}
              </span>
            </>
          )}
          {!isAssigned && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Bot className="size-3" />
                AI handling
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {!isAssigned && currentTeamMemberId && conversation.status !== "RESOLVED" && (
          <Button size="sm" variant="outline" onClick={handleTakeover} disabled={busy}>
            Take over
          </Button>
        )}
        {isAssigned && isAssignedToCurrentUser && (
          <Button size="sm" variant="outline" onClick={handleRelease} disabled={busy}>
            Release to AI
          </Button>
        )}
        {conversation.status !== "RESOLVED" && (
          <Button size="sm" variant="ghost" onClick={handleResolve} disabled={busy}>
            Resolve
          </Button>
        )}
        {conversation.status === "RESOLVED" && (
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Resolved
          </span>
        )}
      </div>
    </div>
  );
}
