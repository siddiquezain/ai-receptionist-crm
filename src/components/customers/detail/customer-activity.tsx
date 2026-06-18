"use client";

import { Calendar, MessageSquare } from "lucide-react";
import { AppointmentStatus, ConversationChannel } from "@prisma/client";
import { timeAgo, cn } from "@/lib/utils";
import type {
  CustomerAppointmentItem,
  CustomerConversationItem,
} from "@/lib/customers-queries";

type ActivityEntry =
  | { type: "appointment"; date: Date; item: CustomerAppointmentItem }
  | { type: "conversation"; date: Date; item: CustomerConversationItem };

const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pending appointment",
  CONFIRMED: "Confirmed appointment",
  CANCELLED: "Cancelled appointment",
  COMPLETED: "Completed appointment",
  NO_SHOW: "No-show appointment",
  RESCHEDULED: "Rescheduled appointment",
};

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat conversation",
  WHATSAPP: "WhatsApp conversation",
};

interface CustomerActivityProps {
  appointments: CustomerAppointmentItem[];
  conversations: CustomerConversationItem[];
}

export function CustomerActivity({
  appointments,
  conversations,
}: CustomerActivityProps) {
  const entries: ActivityEntry[] = [
    ...appointments.map((item) => ({
      type: "appointment" as const,
      date: item.startAt,
      item,
    })),
    ...conversations.map((item) => ({
      type: "conversation" as const,
      date: item.createdAt,
      item,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Activity
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No activity yet
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  entry.type === "appointment"
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-[var(--success)]/10 text-[var(--success)]"
                )}
              >
                {entry.type === "appointment" ? (
                  <Calendar className="size-3" />
                ) : (
                  <MessageSquare className="size-3" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-primary)]">
                  {entry.type === "appointment"
                    ? `${APPT_STATUS_LABEL[entry.item.status]} — ${entry.item.service.name}`
                    : CHANNEL_LABEL[entry.item.channel] ?? entry.item.channel}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {timeAgo(entry.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
