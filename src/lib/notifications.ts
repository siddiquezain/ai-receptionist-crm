import { prisma } from "./prisma";

// ─── Queue helpers ─────────────────────────────────────────────────────────────

type NotificationJobType =
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_REMINDER_24H"
  | "APPOINTMENT_REMINDER_1H"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_RESCHEDULED"
  | "FOLLOW_UP"
  | "STAFF_NEW_BOOKING"
  | "STAFF_CANCELLATION";

async function queueEmail(
  tenantId: string,
  type: NotificationJobType,
  recipient: string,
  payload: Record<string, unknown>,
  scheduledFor: Date
) {
  await prisma.notificationJob.create({
    data: {
      tenantId,
      type,
      channel: "EMAIL",
      recipient,
      payload: payload as Parameters<typeof prisma.notificationJob.create>[0]["data"]["payload"],
      status: "PENDING",
      scheduledFor,
    },
  });
}

// ─── Per-event queuing ─────────────────────────────────────────────────────────

export async function queueBookingNotifications(appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId },
    select: {
      id: true,
      tenantId: true,
      startAt: true,
      status: true,
      notes: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true, phone: true } },
      tenant: { select: { name: true, slug: true } },
    },
  });
  if (!appt) return;

  const now = new Date();
  const startAt = appt.startAt;
  const tenantId = appt.tenantId;

  const payload = {
    appointmentId: appt.id,
    tenantName: appt.tenant.name,
    tenantSlug: appt.tenant.slug,
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    customerPhone: appt.customer.phone,
    serviceName: appt.service.name,
    date: startAt.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }),
    time: startAt.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    }),
    notes: appt.notes ?? undefined,
  };

  const jobs: Array<{
    type: NotificationJobType;
    recipient: string;
    scheduledFor: Date;
  }> = [];

  // Customer confirmation — send immediately
  if (appt.customer.email) {
    jobs.push({
      type: "APPOINTMENT_CONFIRMATION",
      recipient: appt.customer.email,
      scheduledFor: now,
    });
  }

  // 24h reminder
  const remind24h = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
  if (remind24h > now && appt.customer.email) {
    jobs.push({
      type: "APPOINTMENT_REMINDER_24H",
      recipient: appt.customer.email,
      scheduledFor: remind24h,
    });
  }

  // 1h reminder
  const remind1h = new Date(startAt.getTime() - 60 * 60 * 1000);
  if (remind1h > now && appt.customer.email) {
    jobs.push({
      type: "APPOINTMENT_REMINDER_1H",
      recipient: appt.customer.email,
      scheduledFor: remind1h,
    });
  }

  // Staff notification — find tenant owner/admin emails
  const staffEmails = await prisma.tenantMember.findMany({
    where: {
      tenantId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { user: { select: { email: true } } },
  });

  for (const sm of staffEmails) {
    if (sm.user?.email) {
      jobs.push({
        type: "STAFF_NEW_BOOKING",
        recipient: sm.user.email,
        scheduledFor: now,
      });
    }
  }

  await Promise.all(
    jobs.map((j) => queueEmail(tenantId, j.type, j.recipient, payload, j.scheduledFor))
  );
}

export async function queueCancellationNotifications(appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId },
    select: {
      id: true,
      tenantId: true,
      startAt: true,
      notes: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true, phone: true } },
      tenant: { select: { name: true, slug: true } },
    },
  });
  if (!appt) return;

  const now = new Date();
  const tenantId = appt.tenantId;

  const payload = {
    appointmentId: appt.id,
    tenantName: appt.tenant.name,
    tenantSlug: appt.tenant.slug,
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    customerPhone: appt.customer.phone,
    serviceName: appt.service.name,
    date: appt.startAt.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }),
    time: appt.startAt.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    }),
    notes: appt.notes ?? undefined,
  };

  const jobs: Array<{ type: NotificationJobType; recipient: string }> = [];

  if (appt.customer.email) {
    jobs.push({ type: "APPOINTMENT_CANCELLED", recipient: appt.customer.email });
  }

  const staffEmails = await prisma.tenantMember.findMany({
    where: { tenantId, role: { in: ["OWNER", "ADMIN"] } },
    select: { user: { select: { email: true } } },
  });

  for (const sm of staffEmails) {
    if (sm.user?.email) {
      jobs.push({ type: "STAFF_CANCELLATION", recipient: sm.user.email });
    }
  }

  await Promise.all(
    jobs.map((j) =>
      queueEmail(tenantId, j.type, j.recipient, payload, now)
    )
  );

  // Cancel any pending reminders for this appointment
  await prisma.notificationJob.updateMany({
    where: {
      tenantId,
      status: "PENDING",
      type: { in: ["APPOINTMENT_REMINDER_24H", "APPOINTMENT_REMINDER_1H"] },
      payload: { path: ["appointmentId"], equals: appointmentId },
    },
    data: { status: "CANCELLED" },
  });
}
