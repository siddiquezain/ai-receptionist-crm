"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ensureUserWithTenant } from "@/lib/auth-actions";
import { registerSchema, type RegisterFormValues } from "@/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          business_name: values.businessName,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // If session is immediately established (email confirmation disabled in Supabase project)
    if (data.session) {
      try {
        const slug = await ensureUserWithTenant({
          supabaseUserId: data.user!.id,
          email: values.email,
          fullName: values.fullName,
          businessName: values.businessName,
        });
        router.push(`/${slug}/dashboard`);
      } catch {
        setLoading(false);
        toast.error("Account created but setup failed. Please sign in.");
        router.push("/login");
      }
      return;
    }

    // Email confirmation required — show "check your email" state
    setLoading(false);
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
        <div className="text-center space-y-3">
          <div className="text-2xl">✉️</div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Check your email
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            We sent a confirmation link to your email. Click it to activate your
            account and get started.
          </p>
          <p className="text-xs text-[var(--text-muted)] pt-2">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="text-[var(--accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Create your account
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Set up your business on Appointment SaaS in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="fullName"
            className="text-sm text-[var(--text-primary)]"
          >
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            disabled={loading}
            {...register("fullName")}
            className={errors.fullName ? "border-[var(--danger)]" : ""}
          />
          {errors.fullName && (
            <p className="text-xs text-[var(--danger)]">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="businessName"
            className="text-sm text-[var(--text-primary)]"
          >
            Business name
          </Label>
          <Input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Smith & Co Salon"
            disabled={loading}
            {...register("businessName")}
            className={errors.businessName ? "border-[var(--danger)]" : ""}
          />
          {errors.businessName && (
            <p className="text-xs text-[var(--danger)]">
              {errors.businessName.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-sm text-[var(--text-primary)]"
          >
            Work email
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
            <p className="text-xs text-[var(--danger)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-sm text-[var(--text-primary)]"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            disabled={loading}
            {...register("password")}
            className={errors.password ? "border-[var(--danger)]" : ""}
          />
          {errors.password && (
            <p className="text-xs text-[var(--danger)]">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
