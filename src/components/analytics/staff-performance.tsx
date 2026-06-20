import type { StaffPerformanceRow } from "@/lib/analytics-queries";
import { Users } from "lucide-react";

export function StaffPerformance({ data }: { data: StaffPerformanceRow[] }) {
  const maxTotal = Math.max(...data.map((r) => r.total), 1);

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Staff Performance
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <Users className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No staff data</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Staff Member", "Completed", "Cancelled", "No Show", "Total", "Rate"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const rate =
                  row.total > 0
                    ? Math.round((row.completed / row.total) * 100)
                    : 0;
                const barWidth = Math.round((row.total / maxTotal) * 100);

                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                      {row.name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--success)]">
                      {row.completed}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--danger)]">
                      {row.cancelled}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--warning)]">
                      {row.noShow}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm tabular-nums text-[var(--text-primary)]">
                          {row.total}
                        </span>
                        <div className="w-16 rounded-full bg-[var(--border)] h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          rate >= 70
                            ? "text-[var(--success)]"
                            : rate >= 40
                            ? "text-[var(--warning)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
