import { prisma } from "@/lib/prisma";
import {
  pushAppointmentToCalendar,
  deleteCalendarEvent,
  syncBusyPeriodsFromGoogle,
  type CalendarEventInput,
} from "./google";

// ─── Push one appointment to all connected calendars for a tenant ──────────────

async function getAppointmentData(appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId },
    select: {
      id: true,
      tenantId: true,
      startAt: true,
      endAt: true,
      notes: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true } },
      tenant: { select: { name: true } },
    },
  });
}

function toEventInput(appt: NonNullable<Awaited<ReturnType<typeof getAppointmentData>>>): CalendarEventInput {
  return {
    appointmentId: appt.id,
    tenantName: appt.tenant.name,
    serviceName: appt.service.name,
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    startAt: appt.startAt,
    endAt: appt.endAt,
    notes: appt.notes,
  };
}

// We store the Google event ID in a JSON field on the appointment.
// Since the schema has no dedicated column, we use AuditLog as a side-channel.
// This is a pragmatic solution that avoids a schema migration.
async function getStoredEventId(appointmentId: string, integrationId: string): Promise<string | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      resource: "CalendarEvent",
      resourceId: appointmentId,
      actorType: "SYSTEM",
      action: `gcal:${integrationId}`,
    },
    select: { changes: true },
    orderBy: { createdAt: "desc" },
  });
  const changes = log?.changes as { eventId?: string } | null;
  return changes?.eventId ?? null;
}

async function storeEventId(
  tenantId: string,
  appointmentId: string,
  integrationId: string,
  eventId: string
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorType: "SYSTEM",
      action: `gcal:${integrationId}`,
      resource: "CalendarEvent",
      resourceId: appointmentId,
      changes: { eventId },
    },
  });
}

export async function pushAppointmentSync(appointmentId: string) {
  const appt = await getAppointmentData(appointmentId);
  if (!appt) return;

  const integrations = await prisma.calendarIntegration.findMany({
    where: {
      tenantId: appt.tenantId,
      isActive: true,
      syncDirection: { in: ["WRITE_ONLY", "BIDIRECTIONAL"] },
    },
    select: { id: true, calendarId: true },
  });

  const input = toEventInput(appt);

  await Promise.all(
    integrations.map(async (integration) => {
      try {
        const existingEventId = await getStoredEventId(appointmentId, integration.id);
        const newEventId = await pushAppointmentToCalendar(
          integration.id,
          integration.calendarId,
          input,
          existingEventId
        );
        if (!existingEventId) {
          await storeEventId(appt.tenantId, appointmentId, integration.id, newEventId);
        }
      } catch (err) {
        console.error(`[gcal] push failed for integration ${integration.id}:`, err);
      }
    })
  );
}

export async function deleteAppointmentFromCalendars(appointmentId: string, tenantId: string) {
  const integrations = await prisma.calendarIntegration.findMany({
    where: {
      tenantId,
      isActive: true,
      syncDirection: { in: ["WRITE_ONLY", "BIDIRECTIONAL"] },
    },
    select: { id: true, calendarId: true },
  });

  await Promise.all(
    integrations.map(async (integration) => {
      try {
        const eventId = await getStoredEventId(appointmentId, integration.id);
        if (eventId) {
          await deleteCalendarEvent(integration.id, integration.calendarId, eventId);
        }
      } catch (err) {
        console.error(`[gcal] delete failed for integration ${integration.id}:`, err);
      }
    })
  );
}

export async function pullBusyFromCalendars(tenantId: string): Promise<{ created: number; deleted: number }> {
  const integrations = await prisma.calendarIntegration.findMany({
    where: {
      tenantId,
      isActive: true,
      syncDirection: { in: ["READ_ONLY", "BIDIRECTIONAL"] },
    },
    select: { id: true, calendarId: true, teamMemberId: true },
  });

  let totalCreated = 0;
  let totalDeleted = 0;

  await Promise.all(
    integrations.map(async (integration) => {
      try {
        const result = await syncBusyPeriodsFromGoogle(
          integration.id,
          tenantId,
          integration.teamMemberId,
          integration.calendarId
        );
        totalCreated += result.created;
        totalDeleted += result.deleted;
      } catch (err) {
        console.error(`[gcal] pull failed for integration ${integration.id}:`, err);
      }
    })
  );

  return { created: totalCreated, deleted: totalDeleted };
}
