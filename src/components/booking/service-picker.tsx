"use client";

import type { BookingService } from "@/lib/booking-queries";

interface Props {
  services: BookingService[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function formatPrice(price: string | null, currency: string) {
  if (!price) return null;
  const num = parseFloat(price);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

export function ServicePicker({ services, selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Choose a Service</h2>
      <div className="grid gap-3">
        {services.map((s) => {
          const isActive = selected === s.id;
          const price = formatPrice(s.price, s.currency);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={[
                "w-full text-left rounded-lg border p-4 transition-colors",
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{s.name}</p>
                  {s.description && (
                    <p className="mt-0.5 text-sm text-[var(--text-muted)] line-clamp-2">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-[var(--text-muted)]">{s.duration} min</p>
                  {price && (
                    <p className="font-semibold text-[var(--accent)]">{price}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
