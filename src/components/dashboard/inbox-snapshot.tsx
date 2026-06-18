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
    <div className="flex h-full flex-col rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Open Conversations
        </p>
        <Link
          href={`/${tenantSlug}/inbox`}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Content */}
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8">
          <MessageSquare className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No open conversations
          </p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-[var(--border)]">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[0];
            return (
              <li
                key={conv.id}
                className="px-4 py-3 transition-colors hover:bg-[var(--bg)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)] leading-tight">
                    {conv.customer?.name ?? "Unknown"}
                  </p>
                  <p className="shrink-0 text-xs text-[var(--text-muted)]">
                    {timeAgo(conv.updatedAt)}
                  </p>
                </div>
                {lastMsg && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
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
