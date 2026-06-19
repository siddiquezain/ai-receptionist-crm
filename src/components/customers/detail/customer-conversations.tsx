import { MessageSquare } from "lucide-react";
import { ConversationChannel, ConversationStatus } from "@prisma/client";
import { timeAgo, cn } from "@/lib/utils";
import type { CustomerConversationItem } from "@/lib/customers-queries";

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat",
  WHATSAPP: "WhatsApp",
};

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  ESCALATED: {
    label: "Escalated",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
};

interface CustomerConversationsProps {
  conversations: CustomerConversationItem[];
}

export function CustomerConversations({
  conversations,
}: CustomerConversationsProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Conversations
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No conversations yet
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {conversations.map((conv) => {
            const status = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.OPEN;
            return (
              <li
                key={conv.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <MessageSquare className="size-4 shrink-0 text-[var(--text-muted)]" />
                <div className="flex-1 text-sm text-[var(--text-primary)]">
                  {CHANNEL_LABEL[conv.channel] ?? conv.channel}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    status.className
                  )}
                >
                  {status.label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {timeAgo(conv.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
