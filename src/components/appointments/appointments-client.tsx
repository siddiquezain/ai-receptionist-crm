"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentsFilters } from "./appointments-filters";
import { AppointmentsTable } from "./appointments-table";
import { AppointmentSlideOver } from "./appointment-slide-over";
import type {
  AppointmentListItem,
  StaffOption,
  ServiceOption,
  CustomerOption,
} from "@/lib/appointments-queries";

interface AppointmentsClientProps {
  appointments: AppointmentListItem[];
  hasMore: boolean;
  staff: StaffOption[];
  services: ServiceOption[];
  customers: CustomerOption[];
  tenantId: string;
  tenantSlug: string;
  timezone: string;
}

export function AppointmentsClient({
  appointments,
  hasMore,
  staff,
  services,
  customers,
  tenantId,
  tenantSlug,
  timezone,
}: AppointmentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const slideOverOpen = selectedId !== null || isCreateMode;

  function handleRowClick(id: string) {
    setIsCreateMode(false);
    setSelectedId(id);
  }

  function handleCreateClick() {
    setSelectedId(null);
    setIsCreateMode(true);
  }

  function handleSlideOverClose() {
    setSelectedId(null);
    setIsCreateMode(false);
  }

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPage = parseInt(params.get("page") ?? "1", 10);
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Appointments
        </h1>
        <Button size="sm" onClick={handleCreateClick}>
          <Plus className="size-3.5" />
          New appointment
        </Button>
      </div>

      {/* Filters */}
      <AppointmentsFilters staff={staff} />

      {/* Table */}
      <AppointmentsTable
        appointments={appointments}
        timezone={timezone}
        hasMore={hasMore}
        onRowClick={handleRowClick}
        onLoadMore={handleLoadMore}
        onCreateClick={handleCreateClick}
      />

      {/* Slide-over */}
      <AppointmentSlideOver
        open={slideOverOpen}
        onClose={handleSlideOverClose}
        appointmentId={isCreateMode ? null : selectedId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        services={services}
        staff={staff}
        customers={customers}
      />
    </>
  );
}
