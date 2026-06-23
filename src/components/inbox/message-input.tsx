"use client";

import { useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/actions/inbox";
import type { MessageItem } from "@/lib/inbox-queries";

interface MessageInputProps {
  tenantId: string;
  tenantSlug: string;
  conversationId: string;
  isStaffMode: boolean; // true when assignedToId is set
  aiDraft: MessageItem | null; // latest isDraft=true ASSISTANT message
  onDraftDismissed: () => void;
  onMessageSent: (msg: MessageItem) => void;
}

export function MessageInput({
  tenantId,
  tenantSlug,
  conversationId,
  isStaffMode,
  aiDraft,
  onDraftDismissed,
  onMessageSent,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send(content: string) {
    if (!content.trim()) return;
    setSending(true);
    const result = await sendMessage(tenantId, tenantSlug, conversationId, content);
    setSending(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to send message");
      return;
    }
    // Optimistic local message — Realtime will confirm
    onMessageSent({
      id: `local-${Date.now()}`,
      role: "STAFF",
      content: content.trim(),
      isDraft: false,
      createdAt: new Date(),
    });
    setText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(text);
    }
  }

  if (!isStaffMode) {
    return (
      <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        <p className="text-center text-xs text-[var(--text-muted)]">
          Take over to reply — AI is handling this conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2">
      {/* AI draft suggestion */}
      {aiDraft && (
        <div className="rounded-[6px] border border-dashed border-[var(--border)] bg-[var(--bg)] p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Bot className="size-3 text-[var(--text-muted)]" />
            <p className="text-[10px] font-medium text-[var(--text-muted)]">
              AI suggested reply
            </p>
          </div>
          <p className="mb-2 text-sm text-[var(--text-muted)] italic leading-relaxed">
            {aiDraft.content}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => send(aiDraft.content)}
              disabled={sending}
              className="h-7 text-xs"
            >
              {sending && <Loader2 className="mr-1 size-3 animate-spin" />}
              Send
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDraftDismissed}
              className="h-7 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Text input */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          aria-label="Type a message"
          rows={2}
          disabled={sending}
          className="flex-1 resize-none rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        />
        <Button
          onClick={() => send(text)}
          disabled={sending || !text.trim()}
          size="icon"
          aria-label="Send message"
          className="shrink-0"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
