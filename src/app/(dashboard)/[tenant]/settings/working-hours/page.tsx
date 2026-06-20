import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkingHoursForm } from "@/components/settings/working-hours-form";

export const metadata: Metadata = { title: "Working Hours" };

interface Props {
  params: Promise<{ tenant: string }>;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function WorkingHoursPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const existingHours = await prisma.workingHours.findMany({
    where: { tenantId: tenant.id, teamMemberId: null },
    select: { dayOfWeek: true, isOpen: true, startTime: true, endTime: true },
  });

  // Build a map for all 7 days, using defaults where missing
  const hoursMap = new Map(existingHours.map((h) => [h.dayOfWeek, h]));
  const days = DAYS.map((name, dow) => ({
    name,
    dow,
    isOpen: hoursMap.get(dow)?.isOpen ?? (dow >= 1 && dow <= 5),
    startTime: hoursMap.get(dow)?.startTime ?? "09:00",
    endTime: hoursMap.get(dow)?.endTime ?? "17:00",
  }));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Working Hours</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Set your business hours. The AI will only book appointments during these times.
        </p>
      </div>
      <WorkingHoursForm tenantId={tenant.id} days={days} />
    </div>
  );
}
