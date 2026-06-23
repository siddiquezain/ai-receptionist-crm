import { TrendingDown, TrendingUp } from "lucide-react";
import type { StatCardData } from "@/types";

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.every((d) => d === 0)) return <div className="h-8 w-16" />;

  const max = Math.max(...data, 1);
  const W = 64;
  const H = 32;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 2 - (v / max) * (H - 4),
  ] as [number, number]);

  const d =
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const color = positive ? "var(--success)" : data.every((v) => v === 0) ? "var(--border-strong)" : "var(--danger)";

  return (
    <svg width={W} height={H} className="shrink-0 overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function StatCard({ label, value, delta, deltaLabel, sparkline }: StatCardData) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-5"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Label + sparkline */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="section-label"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        <Sparkline data={sparkline} positive={isPositive || (!isPositive && !isNegative)} />
      </div>

      {/* Value */}
      <p
        className="mt-3 font-mono tabular-nums font-semibold"
        style={{ fontSize: "26px", color: "var(--text-primary)", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>

      {/* Delta */}
      <div className="mt-2 flex items-center gap-1.5">
        {isPositive && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium"
            style={{
              background: "var(--success-subtle)",
              color: "var(--success)",
              border: "1px solid var(--success-subtle-border)",
            }}
          >
            <TrendingUp className="size-3" />
            +{delta}
          </span>
        )}
        {isNegative && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium"
            style={{
              background: "var(--danger-subtle)",
              color: "var(--danger)",
              border: "1px solid var(--danger-subtle-border)",
            }}
          >
            <TrendingDown className="size-3" />
            {delta}
          </span>
        )}
        {!isPositive && !isNegative && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No change
          </span>
        )}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {deltaLabel}
        </span>
      </div>
    </div>
  );
}
