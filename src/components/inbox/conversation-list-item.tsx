import { timeAgo } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/inbox-queries";
import type { ConversationStatus } from "@/types/prisma-enums";

const STATUS_DOT: Record<ConversationStatus, string> = {
  OPEN:      "var(--success)",
  ESCALATED: "var(--warning)",
  RESOLVED:  "var(--text-muted)",
  ARCHIVED:  "var(--text-muted)",
};


interface ConversationListItemProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationListItemRow({ conversation, isSelected, onClick }: ConversationListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3.5 py-3 text-left transition-colors"
      style={{
        background: isSelected ? "var(--accent-subtle)" : undefined,
        borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "var(--surface)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <span
          className="mt-[5px] size-1.5 shrink-0 rounded-full"
          style={{ background: STATUS_DOT[conversation.status] }}
        />

        <div className="min-w-0 flex-1">
          {/* Name + time */}
          <div className="flex items-center justify-between gap-1">
            <p
              className="truncate text-sm font-medium"
              style={{ color: isSelected ? "var(--accent)" : "var(--text-primary)" }}
            >
              {conversation.customer?.name ?? "Unknown"}
            </p>
            <p className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
              {timeAgo(conversation.updatedAt)}
            </p>
          </div>

          {/* Channel badge + message preview */}
          <div className="mt-0.5 flex items-center gap-1.5">
            {conversation.channel === "WHATSAPP" && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                WhatsApp
              </span>
            )}
            {conversation.channel === "WEB_CHAT" && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Web Chat
              </span>
            )}
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              {conversation.lastMessage?.content ?? "No messages yet"}
            </p>
          </div>

          {/* Escalated badge */}
          {conversation.status === "ESCALATED" && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-px text-[10px] font-medium"
              style={{
                background: "var(--warning-subtle)",
                color: "var(--warning)",
                border: "1px solid var(--warning-subtle-border)",
              }}
            >
              Needs attention
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
