"use client";

import { Calendar, MessageSquare } from "lucide-react";
import { AppointmentStatus, ConversationChannel } from "@prisma/client";
import { timeAgo } from "@/lib/utils";
import type {
  CustomerAppointmentItem,
  CustomerConversationItem,
} from "@/lib/customers-queries";

type ActivityEntry =
  | { type: "appointment"; date: Date; item: CustomerAppointmentItem }
  | { type: "conversation"; date: Date; item: CustomerConversationItem };

const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING:     "Pending appointment",
  CONFIRMED:   "Confirmed appointment",
  CANCELLED:   "Cancelled appointment",
  COMPLETED:   "Completed appointment",
  NO_SHOW:     "No-show appointment",
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

export function CustomerActivity({ appointments, conversations }: CustomerActivityProps) {
  const entries: ActivityEntry[] = [
    ...appointments.map((item) => ({ type: "appointment" as const, date: item.startAt, item })),
    ...conversations.map((item) => ({ type: "conversation" as const, date: item.createdAt, item })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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
        <p className="section-label">Activity</p>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No activity yet
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-3.5 px-5 py-3.5">
              {/* Icon */}
              <div
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                style={
                  entry.type === "appointment"
                    ? { background: "var(--accent-subtle)", color: "var(--accent)" }
                    : { background: "var(--success-subtle)", color: "var(--success)" }
                }
              >
                {entry.type === "appointment" ? (
                  <Calendar className="size-3" />
                ) : (
                  <MessageSquare className="size-3" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {entry.type === "appointment"
                    ? `${APPT_STATUS_LABEL[entry.item.status]} — ${entry.item.service.name}`
                    : (CHANNEL_LABEL[entry.item.channel] ?? entry.item.channel)}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
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
