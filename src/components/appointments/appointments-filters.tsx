"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { AppointmentStatus } from "@/types/prisma-enums";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffOption } from "@/lib/appointments-queries";

interface AppointmentsFiltersProps {
  staff: StaffOption[];
}

const STATUS_TABS = [
  { label: "All",       value: ""                          },
  { label: "Pending",   value: AppointmentStatus.PENDING   },
  { label: "Confirmed", value: AppointmentStatus.CONFIRMED },
  { label: "Completed", value: AppointmentStatus.COMPLETED },
  { label: "Cancelled", value: AppointmentStatus.CANCELLED },
] as const;

export function AppointmentsFilters({ staff }: AppointmentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const currentStatus  = searchParams.get("status")  ?? "";
  const currentFrom    = searchParams.get("from")     ?? "";
  const currentTo      = searchParams.get("to")       ?? "";
  const currentStaffId = searchParams.get("staffId")  ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status pill tabs */}
      <div
        className="flex items-center gap-px rounded-[var(--radius-md)] p-0.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => updateParams({ status: tab.value })}
              className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-xs)",
                      border: "1px solid var(--border)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParams({ from: e.target.value })}
          className="h-7 w-36 text-xs"
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>–</span>
        <Input
          type="date"
          value={currentTo}
          onChange={(e) => updateParams({ to: e.target.value })}
          className="h-7 w-36 text-xs"
        />
      </div>

      {/* Staff filter */}
      {staff.length > 0 && (
        <Select
          value={currentStaffId || "__all__"}
          onValueChange={(v) =>
            updateParams({ staffId: v === "__all__" ? "" : (v ?? "") })
          }
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
