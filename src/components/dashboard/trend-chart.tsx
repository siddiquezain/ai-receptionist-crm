"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendDataPoint } from "@/lib/dashboard-queries";

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4 h-full">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Appointments — last 7 days
      </p>
      <ResponsiveContainer width="100%" height={148}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
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
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            itemStyle={{ color: "var(--text-primary)" }}
            cursor={{ fill: "var(--bg)" }}
          />
          <Bar
            dataKey="appointments"
            fill="var(--accent)"
            radius={[3, 3, 0, 0] as [number, number, number, number]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
