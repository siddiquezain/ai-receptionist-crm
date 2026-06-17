import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Reset password</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Forgot password page — coming in Auth flows plan
      </p>
    </div>
  );
}
