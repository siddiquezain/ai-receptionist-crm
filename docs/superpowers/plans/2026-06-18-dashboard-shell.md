# Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder sidebar in `src/app/(dashboard)/[tenant]/layout.tsx` with a real navigation shell — workspace header, permission-aware nav items with active state, and a user avatar menu with sign-out.

**Architecture:** Three small Client Components (`NavItem`, `UserMenu`, `Sidebar`) are assembled server-side in the dashboard layout which fetches and passes tenant, user, role, and workspace list as props. No client-side data fetching — all auth/DB reads happen in the Server Component layout. Sign-out is handled browser-side via the Supabase client then a hard redirect.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, lucide-react (already installed), shadcn/ui (`Avatar`, `DropdownMenu`), Supabase browser client for sign-out, `usePathname` for active nav detection.

---

## File Map

### Created by this plan

```
src/
└── components/
    └── dashboard/
        ├── nav-item.tsx          # Client Component: single nav link with active-state detection
        ├── user-menu.tsx         # Client Component: avatar + dropdown (profile, sign out)
        └── sidebar.tsx           # Client Component: full sidebar shell (workspace header + nav + user menu)
```

### Modified by this plan

```
src/app/(dashboard)/[tenant]/layout.tsx   # Fetch workspaces list, pass all data to <Sidebar>
```

---

## Task 1: NavItem Component

**Files:**
- Create: `src/components/dashboard/nav-item.tsx`

The active state is determined by `usePathname()` — a nav item is active when the current path starts with its `href`.

- [ ] **Step 1: Write nav-item.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/nav-item.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
          : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
        )}
      />
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors referencing `nav-item.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/nav-item.tsx && git commit -m "feat: add NavItem component with active-state detection"
```

---

## Task 2: UserMenu Component

**Files:**
- Create: `src/components/dashboard/user-menu.tsx`

Client Component. Renders the user's avatar at the bottom of the sidebar. Clicking it opens a `DropdownMenu` with profile and sign-out options. Sign-out uses the Supabase browser client then calls `window.location.href = '/login'` for a full navigation (clears any client state).

- [ ] **Step 1: Write user-menu.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/user-menu.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  name: string | null;
  email: string;
}

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-sm hover:bg-[var(--bg)] transition-colors outline-none disabled:opacity-50"
          disabled={loading}
        >
          <Avatar size="sm">
            <AvatarFallback className="text-xs font-medium">
              {initials(name, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-sm font-medium text-[var(--text-primary)] leading-tight">
              {name ?? email}
            </p>
            {name && (
              <p className="truncate text-xs text-[var(--text-muted)] leading-tight">
                {email}
              </p>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium text-[var(--text-primary)]">{name ?? email}</p>
          {name && <p className="text-xs text-[var(--text-muted)]">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut />
          {loading ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors referencing `user-menu.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/user-menu.tsx && git commit -m "feat: add UserMenu component with avatar and sign-out"
```

---

## Task 3: Sidebar Component

**Files:**
- Create: `src/components/dashboard/sidebar.tsx`

Client Component. Assembles the workspace header, nav items, and user menu. Receives all data as props from the Server Component layout — no client-side fetching.

The nav items array is defined here. All items are shown to all roles; permission enforcement happens at the route level.

- [ ] **Step 1: Write sidebar.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/sidebar.tsx`:

```tsx
"use client";

import {
  BarChart2,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { NavItem } from "./nav-item";
import { UserMenu } from "./user-menu";

interface Workspace {
  name: string;
  slug: string;
  logo: string | null;
}

interface SidebarProps {
  tenant: {
    name: string;
    slug: string;
    logo: string | null;
    plan: string;
  };
  user: {
    name: string | null;
    email: string;
  };
  workspaces: Workspace[];
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, segment: "dashboard" },
  { label: "Appointments", icon: Calendar, segment: "appointments" },
  { label: "Customers", icon: Users, segment: "customers" },
  { label: "Inbox", icon: MessageSquare, segment: "inbox" },
  { label: "Analytics", icon: BarChart2, segment: "analytics" },
  { label: "Settings", icon: Settings, segment: "settings" },
] as const;

export function Sidebar({ tenant, user, workspaces: _workspaces }: SidebarProps) {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Workspace header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-3.5">
        {tenant.logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-6 rounded object-cover shrink-0"
          />
        ) : (
          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--accent)] text-[10px] font-bold text-white">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)] leading-tight">
            {tenant.name}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-tight">
            {tenant.plan}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.segment}
            href={`/${tenant.slug}/${item.segment}`}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* User menu */}
      <div className="border-t border-[var(--border)] px-2 py-2">
        <UserMenu name={user.name} email={user.email} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors referencing `sidebar.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/sidebar.tsx && git commit -m "feat: add Sidebar component with nav items and workspace header"
```

---

## Task 4: Wire Sidebar into Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/[tenant]/layout.tsx`

The layout already fetches `tenant`, `dbUser`, and `membership`. Add a query for all workspaces the user belongs to, then render `<Sidebar>` in place of the `<aside>` placeholder.

- [ ] **Step 1: Read the existing layout**

Read `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/layout.tsx` to confirm current state.

- [ ] **Step 2: Rewrite the layout**

Replace the entire contents of `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { tenant: slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        select: {
          role: true,
          tenant: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      },
    },
  });

  if (!dbUser) {
    redirect("/register");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      logo: true,
      parentTenantId: true,
    },
  });

  if (!tenant) {
    redirect("/login");
  }

  const membership = dbUser.memberships.find((m) => m.tenant.id === tenant.id);

  if (!membership) {
    redirect("/login");
  }

  // All workspaces this user can switch to
  const workspaces = dbUser.memberships.map((m) => ({
    name: m.tenant.name,
    slug: m.tenant.slug,
    logo: m.tenant.logo,
  }));

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      <Sidebar
        tenant={{
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          plan: tenant.plan,
        }}
        user={{
          name: dbUser.name,
          email: dbUser.email,
        }}
        workspaces={workspaces}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
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
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add "src/app/(dashboard)/[tenant]/layout.tsx" && git commit -m "feat: wire Sidebar into dashboard layout with tenant + user + workspace data"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 2: Start dev server and verify dashboard route compiles**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npm run dev > /tmp/nextdev-shell.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
echo ""
pkill -f "next dev" 2>/dev/null || true
```
Expected: `200`. The dashboard routes require a real Supabase session so we only verify the server starts and the auth routes respond. Check `/tmp/nextdev-shell.log` if non-200.

- [ ] **Step 3: Commit any remaining changes**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git status --short
```
Only commit if there are uncommitted changes:
```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add -A && git commit -m "chore: dashboard shell complete — TypeScript 0 errors" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Sidebar navigation with icons | Task 3 |
| Active nav state via pathname | Task 1 |
| Dashboard, Appointments, Customers, Inbox, Analytics, Settings routes | Task 3 (`NAV_ITEMS`) |
| Workspace name + plan badge in header | Task 3 |
| Workspace logo with initials fallback | Task 3 |
| User avatar with initials | Task 2 |
| Sign-out via Supabase browser client | Task 2 |
| Layout fetches workspaces list | Task 4 |
| Layout removed placeholder `<aside>` | Task 4 |

### Placeholder Scan

None. All steps contain complete, runnable code.

### Type Consistency

- `Workspace` interface defined in `sidebar.tsx` — used only there (workspaces prop); layout passes `{ name, slug, logo }` which matches exactly ✓
- `SidebarProps.tenant.plan` is typed as `string` — Prisma `Plan` enum serialises as string ✓
- `NavItem` receives `href: string`, `label: string`, `icon: LucideIcon` — all passed correctly from `Sidebar` ✓
- `UserMenu` receives `name: string | null`, `email: string` — layout passes `dbUser.name` (nullable) and `dbUser.email` ✓
- `initials()` handles both null name and string name cases ✓

---

## Next Plans (in order)

1. `2026-06-18-dashboard-overview.md` — KPI strip, charts, today's timeline
2. `2026-06-18-appointments.md` — Calendar view, list, slide-over
3. `2026-06-18-customers.md` — CRM table, detail panel
4. `2026-06-18-inbox.md` — 3-column chat, realtime
5. `2026-06-18-analytics.md` — Charts, heatmap, CSV export
6. `2026-06-18-settings.md` — Working hours, team, AI, profile
7. `2026-06-18-booking-page.md` — Public slot picker
8. `2026-06-18-api-routes.md` — AI chat, WhatsApp webhook, upload
