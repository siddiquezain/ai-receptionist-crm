import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAppointments,
  getStaffOptions,
  getServiceOptions,
  APPOINTMENT_SORT_OPTIONS,
} from "@/lib/appointments-queries";
import { parseSortParams } from "@/lib/sorting";
import { AppointmentsClient } from "@/components/appointments/appointments-client";

export const metadata: Metadata = { title: "Appointments" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  // Parse search params
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const status =
    statusParam &&
    Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)
      ? (statusParam as AppointmentStatus)
      : undefined;

  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const staffId = typeof sp.staffId === "string" ? sp.staffId : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;
  const q = typeof sp.q === "string" ? sp.q : "";

  const from = fromParam ? new Date(fromParam + "T00:00:00") : undefined;
  const to = toParam ? new Date(toParam + "T23:59:59") : undefined;

  const spStrings = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  ) as Record<string, string | undefined>;
  const { sort } = parseSortParams(spStrings, APPOINTMENT_SORT_OPTIONS, "date_desc");

  const [{ appointments, hasMore }, staff, services] =
    await Promise.all([
      getAppointments(tenant.id, { status, from, to, staffId, page, q, sort }),
      getStaffOptions(tenant.id),
      getServiceOptions(tenant.id),
    ]);

  return (
    <div className="space-y-4 p-6">
      <AppointmentsClient
        appointments={appointments}
        hasMore={hasMore}
        staff={staff}
        services={services}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        timezone={tenant.timezone}
        sortOptions={APPOINTMENT_SORT_OPTIONS}
        defaultSort={sort}
      />
    </div>
  );
}
