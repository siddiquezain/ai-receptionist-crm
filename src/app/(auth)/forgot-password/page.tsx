"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div
        className="rounded-[var(--radius-xl)] p-7 text-center"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[var(--radius-lg)]"
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-subtle-border)",
          }}
        >
          <Mail className="size-5" style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Check your inbox
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          If an account exists for that email, we sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-xl)] p-7"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Reset your password
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={loading}
            {...register("email")}
            className={errors.email ? "border-[var(--danger)]" : ""}
          />
          {errors.email && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Remember your password?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
