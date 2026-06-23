"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getFirstTenantSlug } from "@/lib/auth-actions";
import { loginSchema, type LoginFormValues } from "@/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) { setLoading(false); toast.error(error.message); return; }
    const slug = await getFirstTenantSlug(data.user.id);
    if (slug) { router.push(`/${slug}/dashboard`); } else { router.push("/register"); }
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
          Sign in
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Welcome back. Enter your credentials to continue.
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs transition-colors"
              style={{ color: "var(--accent)" }}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={loading}
            {...register("password")}
            className={errors.password ? "border-[var(--danger)]" : ""}
          />
          {errors.password && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium transition-colors" style={{ color: "var(--accent)" }}>
          Create one
        </Link>
      </p>
    </div>
  );
}
