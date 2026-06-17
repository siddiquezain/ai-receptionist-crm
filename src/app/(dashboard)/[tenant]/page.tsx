import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Overview page — coming in Dashboard Overview plan
      </p>
    </div>
  );
}
