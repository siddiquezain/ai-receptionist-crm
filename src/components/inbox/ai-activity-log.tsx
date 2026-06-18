import { Bot } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { AIActivityEntry } from "@/lib/inbox-queries";

interface AIActivityLogProps {
  entries: AIActivityEntry[];
}

export function AIActivityLog({ entries }: AIActivityLogProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10">
        <Bot className="size-8 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">No AI activity yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((entry) => (
        <li key={entry.id} className="px-4 py-3 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              {entry.provider} / {entry.model}
            </p>
            <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
              {timeAgo(entry.createdAt)}
            </p>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {entry.totalTokens} tokens · ${entry.estimatedCostUsd}
          </p>
        </li>
      ))}
    </ul>
  );
}
