"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface Props {
  from: string;
  to: string;
}

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyRange = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", newFrom);
      params.set("to", newTo);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const applyPreset = (days: number) => {
    const now = new Date();
    const end = toIso(now);
    const start = toIso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))));
    applyRange(start, end);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Presets */}
      <div className="flex items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {PRESETS.map((preset) => {
          const now = new Date();
          const presetFrom = toIso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (preset.days - 1))));
          const isActive = from === presetFrom;
          return (
            <button
              key={preset.days}
              onClick={() => applyPreset(preset.days)}
              className={`px-3 py-1.5 text-xs transition-colors border-r border-[var(--border)] last:border-r-0 ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => applyRange(e.target.value, to)}
          className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
        <span className="text-xs text-[var(--text-muted)]">→</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => applyRange(from, e.target.value)}
          className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
    </div>
  );
}
