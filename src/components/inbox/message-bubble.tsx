import { Bot, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { MessageItem } from "@/lib/inbox-queries";

interface MessageBubbleProps {
  message: MessageItem;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser  = message.role === "USER";
  const isStaff = message.role === "STAFF";
  const isAI    = message.role === "ASSISTANT" || message.role === "SYSTEM";
  const isDraft = message.isDraft;

  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      {/* Role icon */}
      <div
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
        style={
          isUser
            ? { background: "var(--accent-subtle)", color: "var(--accent)" }
            : isStaff
            ? { background: "var(--success-subtle)", color: "var(--success)" }
            : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }
        }
      >
        {isUser  && <User      className="size-3" />}
        {isStaff && <UserCheck className="size-3" />}
        {isAI    && <Bot       className="size-3" />}
      </div>

      <div className={cn("max-w-[72%]", isUser && "items-end flex flex-col")}>
        {/* Sender label */}
        <p className="mb-1 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          {isUser ? "Customer" : isStaff ? "Staff" : isDraft ? "AI (draft)" : "AI"}
        </p>

        {/* Bubble */}
        <div
          className="rounded-[var(--radius-lg)] px-3 py-2 text-sm leading-relaxed"
          style={
            isUser
              ? { background: "var(--accent)", color: "#fff" }
              : isStaff
              ? {
                  background: "var(--success-subtle)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--success-subtle-border)",
                }
              : isDraft
              ? {
                  background: "var(--surface)",
                  color: "var(--text-muted)",
                  border: "1px dashed var(--border-strong)",
                  fontStyle: "italic",
                }
              : {
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }
          }
        >
          {message.content}
        </div>

        <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {timeAgo(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
