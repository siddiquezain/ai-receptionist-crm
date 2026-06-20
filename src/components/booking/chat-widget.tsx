"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Bot, User, CheckCircle } from "lucide-react";
import type { BookingTenant } from "@/lib/booking-queries";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  tenant: BookingTenant;
}

export function ChatWidget({ tenant }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm the booking assistant for **${tenant.name}**. How can I help you today? You can ask me about our services, availability, or I can book an appointment for you!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  async function send() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: tenant.id,
            conversationId: conversationId ?? undefined,
            message: text,
            channel: "WEB_CHAT",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.error ?? "Something went wrong. Please try again." },
          ]);
          return;
        }

        setConversationId(data.conversationId);
        if (data.appointmentId) setAppointmentId(data.appointmentId);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please check your network and try again." },
        ]);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function renderContent(text: string) {
    // Simple bold (**text**) and line-break support
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] min-h-[400px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <Bot className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">AI Booking Assistant</p>
          <p className="text-xs text-[var(--text-muted)]">{tenant.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          <span className="text-xs text-[var(--text-muted)]">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isUser ? "bg-[var(--accent)] text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]",
                ].join(" ")}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "rounded-tr-sm bg-[var(--accent)] text-white"
                    : "rounded-tl-sm bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)]",
                ].join(" ")}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          );
        })}

        {isPending && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[var(--bg)] border border-[var(--border)] px-3.5 py-3 flex gap-1 items-center">
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                  style={{ animationDelay: `${n * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {appointmentId && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 px-3 py-2.5 text-sm text-[var(--success)]">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Your appointment is confirmed!</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-3 py-3 bg-[var(--bg)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || !!appointmentId}
            placeholder={appointmentId ? "Appointment booked!" : "Type a message… (Enter to send)"}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || isPending || !!appointmentId}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
