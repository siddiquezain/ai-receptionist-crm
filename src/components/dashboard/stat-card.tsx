import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { StatCardData } from "@/types";

/** Minimal inline SVG sparkline — no external library needed. */
function Sparkline({ data }: { data: number[] }) {
  // Don't render if all zeros (no data yet)
  if (data.every((d) => d === 0)) {
    return <div className="h-6 w-16" />;
  }

  const max = Math.max(...data, 1);
  const W = 64;
  const H = 24;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    // Reserve 2px of padding so the stroke isn't clipped
    H - 1 - (v / max) * (H - 3),
  ] as [number, number]);

  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg width={W} height={H} className="shrink-0 text-[var(--text-muted)] overflow-visible">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({ label, value, delta, deltaLabel, sparkline }: StatCardData) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <Sparkline data={sparkline} />
      </div>

      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>

      <div className="mt-1.5 flex items-center gap-1 text-xs">
        {isPositive && <TrendingUp className="size-3 text-[var(--success)]" />}
        {isNegative && <TrendingDown className="size-3 text-[var(--danger)]" />}
        {!isPositive && !isNegative && <Minus className="size-3 text-[var(--text-muted)]" />}

        {delta !== 0 && (
          <span
            className={
              isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
            }
          >
            {isPositive ? "+" : ""}
            {delta}
          </span>
        )}

        <span className="text-[var(--text-muted)]">{deltaLabel}</span>
      </div>
    </div>
  );
}
