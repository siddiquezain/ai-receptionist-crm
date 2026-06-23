import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { InboxConversation } from "@/lib/dashboard-queries";

interface Props {
  conversations: InboxConversation[];
  tenantSlug: string;
}

export function InboxSnapshot({ conversations, tenantSlug }: Props) {
  return (
    <div
      className="flex h-full flex-col rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="section-label">Open Conversations</p>
        <Link
          href={`/${tenantSlug}/inbox`}
          className="text-xs font-medium transition-colors"
          style={{ color: "var(--accent)" }}
        >
          View all
        </Link>
      </div>

      {/* Content */}
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-10">
          <div
            className="flex size-10 items-center justify-center rounded-[var(--radius-lg)]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <MessageSquare className="size-5" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            No open conversations
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
          {conversations.map((conv) => {
            const lastMsg = conv.messages[0];
            return (
              <li
                key={conv.id}
                className="group px-5 py-3.5 transition-colors cursor-default"
                style={{ ["--hover-bg" as string]: "var(--surface)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "var(--surface)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "")
                }
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p
                    className="truncate text-sm font-medium leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {conv.customer?.name ?? "Unknown"}
                  </p>
                  <p className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
                    {timeAgo(conv.updatedAt)}
                  </p>
                </div>
                {lastMsg && (
                  <p
                    className="line-clamp-1 text-xs leading-snug"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {lastMsg.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
