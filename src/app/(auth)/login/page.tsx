import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Sign in</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Login page — coming in Auth flows plan
      </p>
    </div>
  );
}
