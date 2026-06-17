# Auth Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three auth stub pages (login, register, forgot-password) with real Supabase Auth flows, wiring up Prisma User + Tenant + TenantMember creation on first sign-up, and redirecting users to their tenant dashboard after authentication.

**Architecture:** Client Components handle form state via React Hook Form + Zod. Browser-side Supabase client handles signIn/signUp/reset calls. A Next.js Route Handler at `/api/auth/callback` exchanges the Supabase auth code for a session and creates Prisma records from Supabase user metadata. Server Actions (`src/lib/auth-actions.ts`) handle Prisma reads/writes called after successful client-side auth. The root page becomes an auth-aware redirect. `sonner` (already installed) handles toast notifications.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (@supabase/ssr@0.12, @supabase/supabase-js@2), Prisma 7 (client generated), React Hook Form 7, Zod 4, Sonner 2, shadcn/ui components.

---

## File Map

### Created by this plan

```
src/
├── validators/
│   └── auth.ts                          # Zod schemas: loginSchema, registerSchema, forgotPasswordSchema
│
├── lib/
│   └── auth-actions.ts                  # Server Actions: getFirstTenantSlug, ensureUserWithTenant
│
├── app/
│   ├── page.tsx                         # Replace default page — auth-aware redirect to /login or /{slug}/dashboard
│   │
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts             # Exchange Supabase auth code → session, create Prisma records, redirect
│   │
│   └── (auth)/
│       ├── login/
│       │   └── page.tsx                 # Real login form (email + password, RHF + Zod, Supabase signInWithPassword)
│       ├── register/
│       │   └── page.tsx                 # Real register form (name + email + password + business name)
│       └── forgot-password/
│           └── page.tsx                 # Forgot password form (email, Supabase resetPasswordForEmail)
```

### Modified by this plan

```
src/app/(auth)/layout.tsx                # Already exists — no changes needed
src/app/(dashboard)/[tenant]/layout.tsx  # Already exists — no changes needed
```

---

## Task 1: Zod Validators

**Files:**
- Create: `src/validators/auth.ts`

- [ ] **Step 1: Write auth validators**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/validators/auth.ts`:

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/validators/auth.ts && git commit -m "feat: add auth form Zod validators"
```

---

## Task 2: Server Auth Actions

**Files:**
- Create: `src/lib/auth-actions.ts`

These Server Actions are called from Client Components after successful Supabase auth. They handle all Prisma reads and writes.

- [ ] **Step 1: Write auth-actions.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/auth-actions.ts`:

```typescript
"use server";

import { prisma } from "./prisma";
import { slugify } from "./utils";

/**
 * Returns the slug of the first tenant the user belongs to, or null if none.
 * Called after login to determine where to redirect.
 */
export async function getFirstTenantSlug(
  supabaseUserId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUserId },
    select: {
      memberships: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          tenant: {
            select: { slug: true },
          },
        },
      },
    },
  });
  return user?.memberships[0]?.tenant.slug ?? null;
}

/**
 * Idempotent: creates (or retrieves) the User, Tenant, and TenantMember for a
 * newly registered Supabase user. Safe to call multiple times — skips creation
 * if records already exist.
 *
 * Returns the tenant slug.
 */
export async function ensureUserWithTenant(params: {
  supabaseUserId: string;
  email: string;
  fullName: string;
  businessName: string;
}): Promise<string> {
  const { supabaseUserId, email, fullName, businessName } = params;

  // Upsert User
  const user = await prisma.user.upsert({
    where: { supabaseAuthId: supabaseUserId },
    update: {},
    create: {
      supabaseAuthId: supabaseUserId,
      email,
      name: fullName,
    },
  });

  // Check if user already has a tenant membership
  const existing = await prisma.tenantMember.findFirst({
    where: { userId: user.id },
    include: { tenant: { select: { slug: true } } },
  });
  if (existing) return existing.tenant.slug;

  // Generate unique slug from business name
  const baseSlug = slugify(businessName);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.tenant.findFirst({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create Tenant + TenantMember in a transaction
  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        name: businessName,
        slug,
      },
    });
    await tx.tenantMember.create({
      data: {
        userId: user.id,
        tenantId: t.id,
        role: "OWNER",
      },
    });
    return t;
  });

  return tenant.slug;
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/lib/auth-actions.ts && git commit -m "feat: add server actions for user+tenant creation and tenant slug lookup"
```

---

## Task 3: Auth Callback Route Handler

**Files:**
- Create: `src/app/api/auth/callback/route.ts`

This route is called by Supabase after email confirmation or OAuth. It exchanges the code for a session, creates Prisma records (using Supabase user metadata set during signUp), and redirects to the tenant dashboard.

- [ ] **Step 1: Write route.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/api/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserWithTenant } from "@/lib/auth-actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { user } = data;
  const meta = user.user_metadata as {
    full_name?: string;
    business_name?: string;
  };

  // If metadata is present (registration flow), create Prisma records
  if (meta?.full_name && meta?.business_name) {
    try {
      const slug = await ensureUserWithTenant({
        supabaseUserId: user.id,
        email: user.email!,
        fullName: meta.full_name,
        businessName: meta.business_name,
      });
      return NextResponse.redirect(`${origin}/${slug}/dashboard`);
    } catch {
      return NextResponse.redirect(`${origin}/login?error=setup_failed`);
    }
  }

  // Login flow — user already has records
  if (next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(origin);
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/app/api/auth/callback/ && git commit -m "feat: add Supabase auth callback route handler"
```

---

## Task 4: Root Page — Auth-Aware Redirect

**Files:**
- Modify: `src/app/page.tsx`

Replace the default Next.js starter page with a server component that checks auth and redirects appropriately.

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFirstTenantSlug } from "@/lib/auth-actions";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = await getFirstTenantSlug(user.id);

  if (slug) {
    redirect(`/${slug}/dashboard`);
  }

  // Authenticated but no tenant yet (edge case — incomplete registration)
  redirect("/register");
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/app/page.tsx && git commit -m "feat: replace root page with auth-aware redirect"
```

---

## Task 5: Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

Client Component. Uses Supabase browser client for `signInWithPassword`. On success, calls `getFirstTenantSlug` Server Action then navigates to the tenant dashboard. Error states shown via `sonner` toast.

- [ ] **Step 1: Rewrite login/page.tsx**

Replace the entire contents of `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(auth)/login/page.tsx` with:

```tsx
"use client";

import type { Metadata } from "next";
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const slug = await getFirstTenantSlug(data.user.id);

    if (slug) {
      router.push(`/${slug}/dashboard`);
    } else {
      // User authenticated but has no tenant — send to register to complete setup
      router.push("/register");
    }
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Sign in
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-[var(--text-primary)]">
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
            <p className="text-xs text-[var(--danger)]">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm text-[var(--text-primary)]"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--accent)] hover:underline"
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
            <p className="text-xs text-[var(--danger)]">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[var(--accent)] hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
```

Note: `metadata` export cannot coexist with `"use client"`. The login metadata (`title: "Login"`) is handled by the `(auth)/layout.tsx` template — no separate metadata needed per page.

- [ ] **Step 2: Add Sonner Toaster to root layout**

The `<Toaster>` component from `sonner` must be mounted once in the root layout. Open `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/layout.tsx` and add it inside `<Providers>`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Appointment SaaS",
    template: "%s | Appointment SaaS",
  },
  description: "AI-powered appointment booking for businesses of all sizes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/app/\(auth\)/login/page.tsx src/app/layout.tsx && git commit -m "feat: implement login page with email/password auth and Sonner toasts"
```

---

## Task 6: Register Page

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

Client Component. Calls `supabase.auth.signUp()` with user metadata (`full_name`, `business_name`). Supabase routes to `/api/auth/callback` after email confirmation, which creates the Prisma records. If Supabase is configured to auto-confirm (no email required), the user is immediately logged in — in that case, call `ensureUserWithTenant` directly and redirect.

- [ ] **Step 1: Rewrite register/page.tsx**

Replace the entire contents of `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(auth)/register/page.tsx` with:

```tsx
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add "src/app/(auth)/register/page.tsx" && git commit -m "feat: implement register page with Supabase signUp and Prisma tenant creation"
```

---

## Task 7: Forgot Password Page

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`

Client Component. Calls `supabase.auth.resetPasswordForEmail`. Shows a success state after submission — no redirects needed.

- [ ] **Step 1: Rewrite forgot-password/page.tsx**

Replace the entire contents of `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(auth)/forgot-password/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/validators/auth";
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
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
        <div className="text-center space-y-3">
          <div className="text-2xl">📬</div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Check your inbox
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            If an account exists for that email, we sent a password reset link.
          </p>
          <Link
            href="/login"
            className="block mt-4 text-sm text-[var(--accent)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Reset your password
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-sm text-[var(--text-primary)]"
          >
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
            <p className="text-xs text-[var(--danger)]">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Remember your password?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add "src/app/(auth)/forgot-password/page.tsx" && git commit -m "feat: implement forgot password page with Supabase resetPasswordForEmail"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 2: Start dev server and verify routes**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npm run dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
echo ""
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/register
echo ""
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/forgot-password
echo ""
pkill -f "next dev" 2>/dev/null || true
```
Expected: three `200` responses.

- [ ] **Step 3: Final commit if needed**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git status && git add -A && git diff --staged --name-only
```
Only commit if there are uncommitted changes:
```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git commit -m "chore: auth flows complete — TypeScript 0 errors, all routes 200" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered? | Task |
|---|---|---|
| Login with email + password | ✓ | Task 5 |
| Register with name + email + password + business | ✓ | Task 6 |
| Forgot password flow | ✓ | Task 7 |
| Supabase Auth callback (email confirmation) | ✓ | Task 3 |
| User + Tenant + TenantMember creation on sign-up | ✓ | Task 2 + 3 |
| Redirect to `/{slug}/dashboard` after auth | ✓ | Tasks 2, 5, 6 |
| Root page redirect for authenticated users | ✓ | Task 4 |
| OWNER role assigned to tenant creator | ✓ | Task 2 |
| Slug auto-generated from business name | ✓ | Task 2 (`slugify`) |
| Slug uniqueness check with suffix fallback | ✓ | Task 2 |
| Toast error messages | ✓ | Tasks 5, 6, 7 |
| Form validation (Zod, inline errors) | ✓ | Tasks 1, 5, 6, 7 |
| "Check email" state when confirmation required | ✓ | Task 6 |

### Placeholder Scan

None found. All steps contain complete, runnable code.

### Type Consistency Check

- `LoginFormValues`, `RegisterFormValues`, `ForgotPasswordFormValues` defined in Task 1, consumed in Tasks 5, 6, 7 ✓
- `ensureUserWithTenant` params object `{ supabaseUserId, email, fullName, businessName }` defined in Task 2, called identically in Tasks 3 and 6 ✓
- `getFirstTenantSlug(supabaseUserId: string)` defined in Task 2, called identically in Tasks 4 and 5 ✓
- Supabase user metadata keys `full_name` and `business_name` set in Task 6 signUp, read in Task 3 callback — consistent snake_case ✓

---

## Next Plans (in order)

1. `2026-06-18-dashboard-shell.md` — Sidebar, topbar, workspace switcher, active nav state
2. `2026-06-18-dashboard-overview.md` — KPI strip, charts, inbox snapshot, today's timeline
3. `2026-06-18-appointments.md` — Calendar, list view, slide-over panel
4. `2026-06-18-customers.md` — CRM table, detail panel
5. `2026-06-18-inbox.md` — 3-column chat, realtime, staff takeover
6. `2026-06-18-analytics.md` — Charts, heatmap, CSV export
7. `2026-06-18-settings.md` — Working hours, team, AI settings, profile
8. `2026-06-18-booking-page.md` — Public slot picker
9. `2026-06-18-api-routes.md` — AI chat, WhatsApp webhook, upload
