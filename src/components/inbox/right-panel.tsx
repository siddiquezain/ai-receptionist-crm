"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CustomerSnapshotPanel } from "./customer-snapshot";
import { AIActivityLog } from "./ai-activity-log";
import type { CustomerSnapshot, AIActivityEntry } from "@/lib/inbox-queries";

type Tab = "customer" | "ai";

interface RightPanelProps {
  snapshot: CustomerSnapshot | null;
  aiActivity: AIActivityEntry[];
  tenantSlug: string;
  timezone: string;
}

export function RightPanel({
  snapshot,
  aiActivity,
  tenantSlug,
  timezone,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>("customer");

  return (
    <div className="flex h-full flex-col border-l border-[var(--border)]">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)]">
        {(["customer", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === t
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t === "customer" ? "Customer" : "AI Activity"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "customer" ? (
          <CustomerSnapshotPanel
            snapshot={snapshot}
            tenantSlug={tenantSlug}
            timezone={timezone}
          />
        ) : (
          <AIActivityLog entries={aiActivity} />
        )}
      </div>
    </div>
  );
}
