import { Bot, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { MessageItem } from "@/lib/inbox-queries";

interface MessageBubbleProps {
  message: MessageItem;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "USER";
  const isStaff = message.role === "STAFF";
  const isAI = message.role === "ASSISTANT" || message.role === "SYSTEM";
  const isDraft = message.isDraft;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar icon */}
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser && "bg-[var(--accent)]/15 text-[var(--accent)]",
          isStaff && "bg-[var(--success)]/15 text-[var(--success)]",
          isAI && "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
        )}
      >
        {isUser && <User className="size-3.5" />}
        {isStaff && <UserCheck className="size-3.5" />}
        {isAI && <Bot className="size-3.5" />}
      </div>

      <div className={cn("max-w-[70%]", isUser && "items-end flex flex-col")}>
        {/* Sender label */}
        <p className="mb-1 text-[10px] font-medium text-[var(--text-muted)]">
          {isUser ? "Customer" : isStaff ? "Staff" : isDraft ? "AI (draft)" : "AI"}
        </p>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-[8px] px-3 py-2 text-sm leading-relaxed",
            isUser &&
              "bg-[var(--accent)] text-white",
            isStaff &&
              "bg-[var(--success)]/10 text-[var(--text-primary)] border border-[var(--success)]/20",
            isAI && !isDraft &&
              "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]",
            isAI && isDraft &&
              "bg-[var(--bg)] text-[var(--text-muted)] border border-dashed border-[var(--border)] italic"
          )}
        >
          {message.content}
        </div>

        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          {timeAgo(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
