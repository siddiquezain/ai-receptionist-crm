import { MessageSquare } from "lucide-react";
import { ConversationChannel, ConversationStatus } from "@/types/prisma-enums";
import { timeAgo } from "@/lib/utils";
import type { CustomerConversationItem } from "@/lib/customers-queries";

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat",
  WHATSAPP: "WhatsApp",
};

const STATUS_STYLE: Record<ConversationStatus, { label: string; className: string }> = {
  OPEN:      { label: "Open",      className: "bg-[var(--success-subtle)] border-[var(--success-subtle-border)] text-[var(--success)]" },
  RESOLVED:  { label: "Resolved",  className: "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]" },
  ESCALATED: { label: "Escalated", className: "bg-[var(--warning-subtle)] border-[var(--warning-subtle-border)] text-[var(--warning)]" },
  ARCHIVED:  { label: "Archived",  className: "bg-[var(--surface)] border-[var(--border)] text-[var(--text-disabled)]" },
};

interface CustomerConversationsProps {
  conversations: CustomerConversationItem[];
}

export function CustomerConversations({ conversations }: CustomerConversationsProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="section-label">Conversations</p>
      </div>

      {conversations.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No conversations yet
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {conversations.map((conv) => {
            const s = STATUS_STYLE[conv.status] ?? STATUS_STYLE.OPEN;
            return (
              <li key={conv.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <MessageSquare className="size-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                  {CHANNEL_LABEL[conv.channel] ?? conv.channel}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${s.className}`}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-current" />
                  {s.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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
