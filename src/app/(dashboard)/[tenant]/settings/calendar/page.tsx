import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CalendarPanel } from "@/components/settings/calendar-panel";

export const metadata: Metadata = { title: "Calendar Sync" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CalendarSettingsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const integrations = await prisma.calendarIntegration.findMany({
    where: { tenantId: tenant.id, teamMemberId: null },
    select: {
      id: true,
      calendarId: true,
      syncDirection: true,
      lastSyncedAt: true,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Calendar Sync</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Connect Google Calendar to sync appointments and block availability.
        </p>
      </div>

      {sp.connected && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 px-4 py-3 text-sm text-[var(--success)]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Google Calendar connected successfully!
        </div>
      )}

      {sp.error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {sp.error === "access_denied"
            ? "Google Calendar access was denied."
            : sp.error === "missing_tokens"
            ? "Could not retrieve calendar tokens. Please try again."
            : sp.error === "no_calendar"
            ? "No writable Google Calendar found for your account."
            : `Connection error: ${sp.error}`}
        </div>
      )}

      <CalendarPanel
        tenantSlug={slug}
        integrations={integrations.map((i) => ({
          ...i,
          syncDirection: i.syncDirection as string,
          lastSyncedAt: i.lastSyncedAt,
        }))}
      />
    </div>
  );
}
