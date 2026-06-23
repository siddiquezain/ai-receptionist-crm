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
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--surface-raised)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["customer", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors"
            style={
              tab === t
                ? { color: "var(--accent)", borderBottom: "2px solid var(--accent)" }
                : { color: "var(--text-muted)", borderBottom: "2px solid transparent" }
            }
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
