import { Bot, TrendingUp, AlertTriangle, CalendarCheck } from "lucide-react";
import type { AIPerformanceData } from "@/lib/analytics-queries";

interface Metric {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

export function AIPerformance({ data }: { data: AIPerformanceData }) {
  const metrics: Metric[] = [
    {
      label: "Conversations",
      value: data.conversations,
      icon: Bot,
      color: "var(--accent)",
    },
    {
      label: "AI Handled",
      value: data.aiHandled,
      icon: TrendingUp,
      color: "var(--success)",
    },
    {
      label: "Escalated",
      value: data.escalated,
      icon: AlertTriangle,
      color: "var(--warning)",
    },
    {
      label: "Bookings via AI",
      value: data.booked,
      icon: CalendarCheck,
      color: "var(--accent)",
    },
  ];

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          AI Performance
        </p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-lg font-semibold tabular-nums text-[var(--success)]">
            {data.conversionRate}%
          </span>
          <span className="text-xs text-[var(--text-muted)]">conversion</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
          >
            <m.icon className="size-4 shrink-0" style={{ color: m.color }} />
            <div>
              <p className="font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
                {m.value}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Simple funnel bar */}
      {data.conversations > 0 && (
        <div className="mt-4 space-y-1.5">
          <FunnelBar label="Conversations" value={data.conversations} max={data.conversations} color="var(--border)" />
          <FunnelBar label="AI Handled" value={data.aiHandled} max={data.conversations} color="var(--accent)" />
          <FunnelBar label="Bookings" value={data.booked} max={data.conversations} color="var(--success)" />
        </div>
      )}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 rounded-full bg-[var(--border)] h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-[var(--text-muted)]">
        {value}
      </span>
    </div>
  );
}
