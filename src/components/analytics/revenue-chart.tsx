"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { RevenueDataPoint } from "@/lib/analytics-queries";

export function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Revenue
        </p>
        <p className="font-mono text-lg font-semibold tabular-nums text-[var(--text-primary)]">
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
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
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
