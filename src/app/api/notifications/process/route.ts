import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import {
  appointmentConfirmation,
  appointmentReminder,
  appointmentCancelled,
  staffNewBooking,
  staffCancellation,
  type AppointmentEmailPayload,
  type StaffEmailPayload,
} from "@/lib/email/templates";

// Protect this route with a shared secret — call from cron job / Vercel Cron
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const BATCH_SIZE = 50;

function buildEmailContent(
  type: string,
  payload: Record<string, unknown>
): { subject: string; html: string } | null {
  const p = payload as unknown as AppointmentEmailPayload & StaffEmailPayload;

  switch (type) {
    case "APPOINTMENT_CONFIRMATION":
      return {
        subject: `Confirmed: ${p.serviceName} on ${p.date}`,
        html: appointmentConfirmation(p),
      };
    case "APPOINTMENT_REMINDER_24H":
      return {
        subject: `Reminder: ${p.serviceName} tomorrow at ${p.time}`,
        html: appointmentReminder(p, "24h"),
      };
    case "APPOINTMENT_REMINDER_1H":
      return {
        subject: `Reminder: ${p.serviceName} in 1 hour`,
        html: appointmentReminder(p, "1h"),
      };
    case "APPOINTMENT_CANCELLED":
      return {
        subject: `Cancelled: ${p.serviceName} on ${p.date}`,
        html: appointmentCancelled(p),
      };
    case "STAFF_NEW_BOOKING":
      return {
        subject: `New booking: ${p.customerName} — ${p.serviceName} on ${p.date}`,
        html: staffNewBooking(p),
      };
    case "STAFF_CANCELLATION":
      return {
        subject: `Cancelled: ${p.customerName} — ${p.serviceName} on ${p.date}`,
        html: staffCancellation(p),
      };
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Claim a batch atomically using a two-step approach:
  // 1. Find pending jobs due now
  // 2. Mark them PROCESSING before sending (prevents duplicate sends on retry)
  const due = await prisma.notificationJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
      channel: "EMAIL",
    },
    take: BATCH_SIZE,
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });

  if (due.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const ids = due.map((j) => j.id);

  await prisma.notificationJob.updateMany({
    where: { id: { in: ids } },
    data: { status: "PROCESSING", lastAttemptAt: now },
  });

  // Reload with full data
  const jobs = await prisma.notificationJob.findMany({
    where: { id: { in: ids } },
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    jobs.map(async (job) => {
      const content = buildEmailContent(job.type, job.payload as Record<string, unknown>);
      if (!content) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: "FAILED", failureReason: "Unknown notification type", attempts: { increment: 1 } },
        });
        failed++;
        return;
      }

      const result = await sendEmail({
        to: job.recipient,
        subject: content.subject,
        html: content.html,
      });

      if (result.success) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
        });
        sent++;
      } else {
        const attempts = job.attempts + 1;
        // Retry up to 3 times with exponential backoff
        const shouldRetry = attempts < 3;
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: shouldRetry ? "PENDING" : "FAILED",
            failureReason: result.error,
            attempts: { increment: 1 },
            scheduledFor: shouldRetry
              ? new Date(now.getTime() + Math.pow(2, attempts) * 60 * 1000)
              : undefined,
          },
        });
        failed++;
      }
    })
  );

  return NextResponse.json({ processed: jobs.length, sent, failed });
}

// GET is used by Vercel Cron (which sends GET + Authorization header automatically)
export async function GET(request: NextRequest) {
  return POST(request);
}
