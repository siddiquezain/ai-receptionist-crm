"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TrendDataPoint } from "@/lib/dashboard-queries";

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-5 h-full"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="section-label">Appointments — last 7 days</p>
      </div>
      <ResponsiveContainer width="100%" height={152}>
        <BarChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -28 }} barCategoryGap="35%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              boxShadow: "var(--shadow-md)",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "var(--text-secondary)", fontWeight: 500, marginBottom: 2 }}
            itemStyle={{ color: "var(--text-primary)" }}
            cursor={{ fill: "var(--accent-subtle)", opacity: 0.6 }}
          />
          <Bar
            dataKey="appointments"
            fill="var(--accent)"
            radius={[3, 3, 0, 0] as [number, number, number, number]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
