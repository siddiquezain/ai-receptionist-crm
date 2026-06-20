import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// ─── OAuth2 client factory ─────────────────────────────────────────────────────

export function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  );
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function getAuthUrl(state: string): string {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

// ─── Token management ──────────────────────────────────────────────────────────

export async function getAuthenticatedClient(integrationId: string) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { id: integrationId, isActive: true },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
  });
  if (!integration) throw new Error("Calendar integration not found");

  const client = makeOAuthClient();
  client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.tokenExpiresAt.getTime(),
  });

  // Auto-refresh if token is within 5 min of expiry
  if (integration.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    if (credentials.access_token) {
      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          accessToken: credentials.access_token,
          tokenExpiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000),
        },
      });
      client.setCredentials(credentials);
    }
  }

  return client;
}

// ─── Calendar list ─────────────────────────────────────────────────────────────

export async function listCalendars(
  accessToken: string,
  refreshToken: string
): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const client = makeOAuthClient();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.calendarList.list({ minAccessRole: "writer" });

  return (res.data.items ?? []).map((c) => ({
    id: c.id ?? "",
    summary: c.summary ?? c.id ?? "",
    primary: c.primary ?? false,
  }));
}

// ─── Event push (appointment → Google) ────────────────────────────────────────

export interface CalendarEventInput {
  appointmentId: string;
  tenantName: string;
  serviceName: string;
  customerName: string;
  customerEmail?: string | null;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
}

function buildGoogleEvent(input: CalendarEventInput) {
  return {
    summary: `${input.serviceName} — ${input.customerName}`,
    description: [
      `Booked via AppointEase`,
      input.notes ? `Notes: ${input.notes}` : null,
      `Appointment ID: ${input.appointmentId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: input.startAt.toISOString() },
    end: { dateTime: input.endAt.toISOString() },
    attendees: input.customerEmail
      ? [{ email: input.customerEmail, displayName: input.customerName }]
      : undefined,
    extendedProperties: {
      private: { appointmentId: input.appointmentId },
    },
  };
}

export async function pushAppointmentToCalendar(
  integrationId: string,
  calendarId: string,
  input: CalendarEventInput,
  existingEventId?: string | null
): Promise<string> {
  const auth = await getAuthenticatedClient(integrationId);
  const cal = google.calendar({ version: "v3", auth });
  const event = buildGoogleEvent(input);

  if (existingEventId) {
    const res = await cal.events.update({
      calendarId,
      eventId: existingEventId,
      requestBody: event,
    });
    return res.data.id!;
  } else {
    const res = await cal.events.insert({ calendarId, requestBody: event });
    return res.data.id!;
  }
}

export async function deleteCalendarEvent(
  integrationId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const auth = await getAuthenticatedClient(integrationId);
  const cal = google.calendar({ version: "v3", auth });
  await cal.events.delete({ calendarId, eventId }).catch(() => {});
}

// ─── Busy import (Google → BusyPeriod) ────────────────────────────────────────

export async function syncBusyPeriodsFromGoogle(
  integrationId: string,
  tenantId: string,
  teamMemberId: string | null,
  calendarId: string
): Promise<{ created: number; deleted: number }> {
  const auth = await getAuthenticatedClient(integrationId);
  const cal = google.calendar({ version: "v3", auth });

  const now = new Date();
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

  const res = await cal.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });

  const events = (res.data.items ?? []).filter(
    (e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime
  );

  // Delete old Google-sourced busy periods for this integration
  const deleted = await prisma.busyPeriod.deleteMany({
    where: {
      tenantId,
      teamMemberId: teamMemberId ?? undefined,
      title: { startsWith: "[GCal]" },
    },
  });

  // Insert new busy periods
  await prisma.busyPeriod.createMany({
    data: events.map((e) => ({
      tenantId,
      teamMemberId: teamMemberId ?? null,
      title: `[GCal] ${e.summary ?? "Busy"}`,
      startAt: new Date(e.start!.dateTime!),
      endAt: new Date(e.end!.dateTime!),
      isRecurring: false,
    })),
    skipDuplicates: true,
  });

  await prisma.calendarIntegration.update({
    where: { id: integrationId },
    data: { lastSyncedAt: new Date() },
  });

  return { created: events.length, deleted: deleted.count };
}
