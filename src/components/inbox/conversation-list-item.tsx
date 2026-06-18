import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/inbox-queries";
import type { ConversationStatus } from "@prisma/client";

const STATUS_DOT: Record<ConversationStatus, string> = {
  OPEN: "bg-[var(--success)]",
  ESCALATED: "bg-[var(--warning)]",
  RESOLVED: "bg-[var(--text-muted)]",
  ARCHIVED: "bg-[var(--text-muted)]",
};

const CHANNEL_LABEL = {
  WEB_CHAT: "Web",
  WHATSAPP: "WhatsApp",
} as const;

interface ConversationListItemProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationListItemRow({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-3 text-left transition-colors hover:bg-[var(--bg)]",
        isSelected && "bg-[var(--bg)]"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            STATUS_DOT[conversation.status]
          )}
        />

        <div className="min-w-0 flex-1">
          {/* Name + time */}
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {conversation.customer?.name ?? "Unknown"}
            </p>
            <p className="shrink-0 text-xs text-[var(--text-muted)]">
              {timeAgo(conversation.updatedAt)}
            </p>
          </div>

          {/* Channel badge + message preview */}
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="shrink-0 rounded-sm bg-[var(--accent)]/10 px-1 py-px text-[10px] font-medium text-[var(--accent)]">
              {CHANNEL_LABEL[conversation.channel]}
            </span>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {conversation.lastMessage?.content ?? "No messages yet"}
            </p>
          </div>

          {/* Escalated badge */}
          {conversation.status === "ESCALATED" && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-sm bg-[var(--warning)]/10 px-1.5 py-px text-[10px] font-medium text-[var(--warning)]">
              Needs attention
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
