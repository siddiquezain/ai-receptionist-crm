import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Create account</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Register page — coming in Auth flows plan
      </p>
    </div>
  );
}
