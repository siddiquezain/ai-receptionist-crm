/**
 * Plain TypeScript mirrors of Prisma enums.
 *
 * Import from here in client components instead of "@prisma/client" — Prisma's
 * generated client cannot be bundled for the browser until `prisma generate`
 * has run, which causes Turbopack build failures on Vercel.
 *
 * These values must stay in sync with prisma/schema.prisma.
 */

export const AppointmentStatus = {
  PENDING:     "PENDING",
  CONFIRMED:   "CONFIRMED",
  CANCELLED:   "CANCELLED",
  COMPLETED:   "COMPLETED",
  NO_SHOW:     "NO_SHOW",
  RESCHEDULED: "RESCHEDULED",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const BookingChannel = {
  AI:           "AI",
  MANUAL:       "MANUAL",
  SELF_SERVICE: "SELF_SERVICE",
} as const;
export type BookingChannel = (typeof BookingChannel)[keyof typeof BookingChannel];

export const ConversationChannel = {
  WEB_CHAT:  "WEB_CHAT",
  WHATSAPP:  "WHATSAPP",
} as const;
export type ConversationChannel = (typeof ConversationChannel)[keyof typeof ConversationChannel];

export const ConversationStatus = {
  OPEN:      "OPEN",
  RESOLVED:  "RESOLVED",
  ESCALATED: "ESCALATED",
  ARCHIVED:  "ARCHIVED",
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageRole = {
  USER:      "USER",
  ASSISTANT: "ASSISTANT",
  SYSTEM:    "SYSTEM",
  STAFF:     "STAFF",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const Role = {
  OWNER:   "OWNER",
  ADMIN:   "ADMIN",
  MANAGER: "MANAGER",
  STAFF:   "STAFF",
  VIEWER:  "VIEWER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Plan = {
  STARTER:    "STARTER",
  PRO:        "PRO",
  ENTERPRISE: "ENTERPRISE",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const NotificationType = {
  APPOINTMENT_CONFIRMATION:  "APPOINTMENT_CONFIRMATION",
  APPOINTMENT_REMINDER_24H:  "APPOINTMENT_REMINDER_24H",
  APPOINTMENT_REMINDER_1H:   "APPOINTMENT_REMINDER_1H",
  APPOINTMENT_CANCELLED:     "APPOINTMENT_CANCELLED",
  APPOINTMENT_RESCHEDULED:   "APPOINTMENT_RESCHEDULED",
  FOLLOW_UP:                 "FOLLOW_UP",
  STAFF_NEW_BOOKING:         "STAFF_NEW_BOOKING",
  STAFF_CANCELLATION:        "STAFF_CANCELLATION",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationChannel = {
  EMAIL:    "EMAIL",
  WHATSAPP: "WHATSAPP",
  SMS:      "SMS",
  IN_APP:   "IN_APP",
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const MessagingProvider = {
  EVOLUTION_API: "EVOLUTION_API",
} as const;
export type MessagingProvider = (typeof MessagingProvider)[keyof typeof MessagingProvider];

export const AuditActorType = {
  USER:   "USER",
  SYSTEM: "SYSTEM",
  AI:     "AI",
} as const;
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];

export const JobStatus = {
  PENDING:    "PENDING",
  PROCESSING: "PROCESSING",
  SENT:       "SENT",
  FAILED:     "FAILED",
  CANCELLED:  "CANCELLED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
