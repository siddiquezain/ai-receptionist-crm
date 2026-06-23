"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mail } from "lucide-react";
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
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName, business_name: values.businessName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) { setLoading(false); toast.error(error.message); return; }
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
    setLoading(false);
    setEmailSent(true);
  }

  if (emailSent) {
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
          Check your email
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          We sent a confirmation link to your email. Click it to activate your account and get
          started.
        </p>
        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Already confirmed?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
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
          Create your account
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Set up your business in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {(
          [
            { id: "fullName",     label: "Full name",      type: "text",     auto: "name",         placeholder: "Jane Smith" },
            { id: "businessName", label: "Business name",  type: "text",     auto: "organization",  placeholder: "Smith & Co Salon" },
            { id: "email",        label: "Work email",     type: "email",    auto: "email",         placeholder: "you@company.com" },
            { id: "password",     label: "Password",       type: "password", auto: "new-password",  placeholder: "Min. 8 characters" },
          ] as const
        ).map(({ id, label, type, auto, placeholder }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {label}
            </Label>
            <Input
              id={id}
              type={type}
              autoComplete={auto}
              placeholder={placeholder}
              disabled={loading}
              {...register(id)}
              className={errors[id] ? "border-[var(--danger)]" : ""}
            />
            {errors[id] && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {errors[id]?.message}
              </p>
            )}
          </div>
        ))}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
