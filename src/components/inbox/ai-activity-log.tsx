import { Bot } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { AIActivityEntry } from "@/lib/inbox-queries";

interface AIActivityLogProps {
  entries: AIActivityEntry[];
}

export function AIActivityLog({ entries }: AIActivityLogProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 px-4 py-12">
        <div
          className="flex size-10 items-center justify-center rounded-[var(--radius-lg)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Bot className="size-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No AI activity yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
      {entries.map((entry) => (
        <li key={entry.id} className="px-4 py-3 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {entry.provider} / {entry.model}
            </p>
            <p className="shrink-0 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {timeAgo(entry.createdAt)}
            </p>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {entry.totalTokens} tokens · ${entry.estimatedCostUsd}
          </p>
        </li>
      ))}
    </ul>
  );
}
