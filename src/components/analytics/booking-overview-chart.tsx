"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BookingDataPoint } from "@/lib/analytics-queries";

export function BookingOverviewChart({ data }: { data: BookingDataPoint[] }) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Booking Overview
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            cursor={{ fill: "var(--bg)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "var(--text-muted)" }}
            iconSize={8}
          />
          <Bar dataKey="booked" name="Booked" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="cancelled" name="Cancelled" fill="var(--danger)" radius={[3, 3, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
