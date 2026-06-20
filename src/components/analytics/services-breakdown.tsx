"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ServiceBreakdown } from "@/lib/analytics-queries";

export function ServicesBreakdown({ data }: { data: ServiceBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
        <p className="text-sm text-[var(--text-muted)]">No service data</p>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Services Breakdown
      </p>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: "var(--text-primary)" }}
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
            formatter={(value, name) => [
              name === "revenue" ? `$${Number(value ?? 0).toFixed(2)}` : value,
              name === "revenue" ? "Revenue" : "Bookings",
            ]}
          />
          <Bar dataKey="count" name="count" fill="var(--accent)" radius={[0, 3, 3, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
