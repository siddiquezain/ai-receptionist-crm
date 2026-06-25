# UI Polish Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dashboard into a premium, perceived-speed-optimized SaaS product by applying a cohesive design system across tokens, components, layout, and every page — with zero changes to business logic.

**Architecture:** Token-driven (CSS custom properties in `globals.css`), component-driven (CVA variants, Framer Motion), applied bottom-up: tokens → primitives → layout → pages. All changes are purely presentational. The app uses Base UI for accessible primitives, CVA for variant systems, and Tailwind CSS v4. The `data-table` CSS class (in globals.css) drives all table styling, not the `Table` component from `table.tsx`.

**Tech Stack:** Tailwind CSS v4, Base UI (`@base-ui/react`), CVA, Framer Motion v11, Next.js 16 App Router, Geist Sans/Mono, `tw-animate-css`

**Spec:** `docs/superpowers/specs/2026-06-25-ui-polish-sprint-design.md`

**Note on testing:** This sprint is purely visual. There is no jsdom/JSDOM test environment set up (vitest runs in `node` mode). Verification steps are: `npx tsc --noEmit` for type safety and manual inspection in the dev server (`npm run dev`). Any TypeScript errors must be resolved before committing.

---

## File Map

**New files:**
- `src/components/ui/empty-state.tsx` — reusable empty state pattern
- `src/components/ui/page-transition.tsx` — Framer Motion page wrapper
- `src/app/(dashboard)/[tenant]/loading.tsx` — root tenant skeleton
- `src/app/(dashboard)/[tenant]/dashboard/loading.tsx` — dashboard page skeleton
- `src/app/(dashboard)/[tenant]/appointments/loading.tsx` — appointments skeleton
- `src/app/(dashboard)/[tenant]/customers/loading.tsx` — customers skeleton
- `src/app/(dashboard)/[tenant]/inbox/loading.tsx` — inbox skeleton
- `src/app/(dashboard)/[tenant]/analytics/loading.tsx` — analytics skeleton
- `src/app/(dashboard)/[tenant]/settings/loading.tsx` — settings skeleton

**Modified files:**
- `src/app/globals.css` — all new tokens, typography, utility updates, shimmer keyframe
- `src/components/ui/skeleton.tsx` — shimmer + SkeletonText, SkeletonCard, SkeletonTableRow
- `src/components/ui/button.tsx` — Framer Motion press + `isLoading` prop
- `src/components/ui/card.tsx` — refined shadow, radius, padding
- `src/components/ui/input.tsx` — `h-10` primary height, improved focus ring
- `src/components/dashboard/nav-item.tsx` — left-border active indicator, token classes
- `src/components/dashboard/sidebar.tsx` — grouped nav sections, token-driven classes
- `src/components/dashboard/stat-card.tsx` — `.display` class on value number
- `src/components/appointments/appointment-status-badge.tsx` — inline CVA-style token classes
- `src/components/appointments/appointments-table.tsx` — skeleton state, updated empty state
- `src/app/(dashboard)/[tenant]/layout.tsx` — PageTransition wrapper

---

## Task 1: Update Design Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add new tokens to `:root`**

In `globals.css`, inside the `:root { }` block, add the following after the existing `--surface-raised` line and update the values listed:

```css
/* Replace existing accent tokens */
--accent: #1d4ed8;
--accent-hover: #1e40af;
--accent-subtle: #eff6ff;
--accent-subtle-border: #bfdbfe;

/* Add fourth surface layer */
--surface-overlay: #f0f2ff;

/* Update radius tokens */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;

/* Replace shadow tokens — larger spread, lower opacity */
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.04);
--shadow-sm: 0 2px 8px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04);
--shadow-md: 0 4px 16px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04);
--shadow-lg: 0 8px 32px rgb(0 0 0 / 0.08), 0 4px 8px rgb(0 0 0 / 0.04);
--shadow-xl: 0 16px 48px rgb(0 0 0 / 0.10), 0 8px 16px rgb(0 0 0 / 0.04);

/* Motion tokens */
--duration-instant: 80ms;
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-default: cubic-bezier(0.2, 0, 0, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Blur tokens */
--blur-sm: 4px;
--blur-md: 8px;
--blur-lg: 16px;
--blur-xl: 24px;

/* Z-index tokens */
--z-base: 0;
--z-raised: 10;
--z-dropdown: 100;
--z-sticky: 200;
--z-overlay: 300;
--z-modal: 400;
--z-toast: 500;
--z-tooltip: 600;
```

- [ ] **Step 2: Update dark mode tokens in `.dark { }`**

Add `--surface-overlay` and update `--surface` for blue undertone:

```css
/* In .dark { } block — update these specific values: */
--surface: #111318;
--surface-overlay: #1e2030;

/* Replace dark mode shadow tokens */
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.2);
--shadow-sm: 0 2px 8px rgb(0 0 0 / 0.25), 0 1px 2px rgb(0 0 0 / 0.2);
--shadow-md: 0 4px 16px rgb(0 0 0 / 0.25), 0 2px 4px rgb(0 0 0 / 0.2);
--shadow-lg: 0 8px 32px rgb(0 0 0 / 0.30), 0 4px 8px rgb(0 0 0 / 0.2);
--shadow-xl: 0 16px 48px rgb(0 0 0 / 0.35), 0 8px 16px rgb(0 0 0 / 0.2);
```

- [ ] **Step 3: Update typography utility classes**

Replace the entire `/* ─── Typography scale ───────────────────────────────────────────────────── */` section:

```css
/* ─── Typography scale ───────────────────────────────────────────────────── */

/* Tailwind v4 override — custom px scale */
.text-xs   { font-size: 12px;   line-height: 1.45; }
.text-sm   { font-size: 13px;   line-height: 1.5;  }
.text-base { font-size: 14px;   line-height: 1.5;  }
.text-lg   { font-size: 16px;   line-height: 1.5;  }
.text-xl   { font-size: 18px;   line-height: 1.4;  }
.text-2xl  { font-size: 24px;   line-height: 1.3;  }
.text-3xl  { font-size: 30px;   line-height: 1.25; }
.text-4xl  { font-size: 36px;   line-height: 1.2;  }
```

- [ ] **Step 4: Update utility classes and add new ones**

Replace the `.page-title` block and add new utilities. Find and replace the entire `/* ─── Utility: page header ───────────────────────────────────────────────── */` through the end of `.section-label` block:

```css
/* ─── Utility: page header ───────────────────────────────────────────────── */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.page-title {
  font-size: 20px;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  line-height: 1.3;
}

/* ─── Utility: display (stat card numbers) ───────────────────────────────── */

.display {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

/* ─── Utility: reading body (form labels, descriptions, slide-over content) */

.reading-body {
  font-size: 16px;
  line-height: 1.65;
}

/* ─── Utility: section label ─────────────────────────────────────────────── */

.section-label {
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
```

- [ ] **Step 5: Update the data-table CSS**

Replace the entire `/* ─── Utility: table ───────────────────────────────────────── */` section:

```css
/* ─── Utility: table ─────────────────────────────────────────────────────── */

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead tr {
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--surface-raised);
  backdrop-filter: blur(var(--blur-sm));
}

.data-table thead th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background var(--duration-fast) var(--ease-default);
  cursor: pointer;
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: var(--surface-raised);
}

.data-table tbody td {
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-primary);
}
```

- [ ] **Step 6: Update the transition defaults and add shimmer keyframe**

Replace the `/* ─── Transition defaults ───────────────────────────── */` section and append the shimmer keyframe after it:

```css
/* ─── Transition defaults ────────────────────────────────────────────────── */

a,
button {
  transition-property: color, background-color, border-color, opacity, transform;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-default);
}

/* ─── Skeleton shimmer ───────────────────────────────────────────────────── */

@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
```

- [ ] **Step 7: Verify type safety**

```bash
npx tsc --noEmit
```

Expected: no errors (globals.css is not type-checked, so this just confirms no TS regressions from importing changes).

- [ ] **Step 8: Start dev server and visually verify tokens are applied**

```bash
npm run dev
```

Open the dashboard. Confirm: border radii look slightly softer, nav active item blue is deeper, no layout breakage.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css
git commit -m "design: update design tokens — radius, shadows, motion, blur, z-index, typography"
```

---

## Task 2: Install Framer Motion

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install**

```bash
npm install framer-motion@^11
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('framer-motion'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install framer-motion v11"
```

---

## Task 3: Skeleton — Shimmer + Variants

**Files:**
- Modify: `src/components/ui/skeleton.tsx`

The current skeleton uses `animate-pulse` (opacity fade). Replace with a gradient shimmer sweep. Add three purpose-built variants used in `loading.tsx` files.

- [ ] **Step 1: Replace skeleton.tsx with shimmer-based implementation**

```tsx
import { cn } from "@/lib/utils"

/** Base shimmer skeleton — replaces animate-pulse with a gradient sweep */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--surface-raised) 25%, var(--surface-overlay) 50%, var(--surface-raised) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
      {...props}
    />
  )
}

/** Inline text placeholder. width controls how wide it appears. */
function SkeletonText({
  width = "100%",
  size = "sm",
  className,
}: {
  width?: string | number
  size?: "sm" | "base"
  className?: string
}) {
  const h = size === "base" ? "h-4" : "h-3.5"
  return (
    <Skeleton
      className={cn(h, "rounded-sm", className)}
      style={{ width }}
    />
  )
}

/** Matches a stat card shell (label + number + delta row). */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] p-5 space-y-3",
        className
      )}
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between">
        <SkeletonText width={96} size="sm" />
        <Skeleton className="h-8 w-16 rounded-sm" />
      </div>
      <SkeletonText width={72} size="base" className="h-7" />
      <SkeletonText width={120} size="sm" />
    </div>
  )
}

/** Matches a data table row (5 columns: customer, service, staff, date, status). */
function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <tr
      className={cn("border-b border-[var(--border)]", className)}
      aria-hidden="true"
    >
      <td className="px-4 py-3.5"><SkeletonText width={120} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={96} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={80} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={110} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={64} /></td>
    </tr>
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow }
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/skeleton.tsx
git commit -m "design: replace skeleton pulse with shimmer, add SkeletonText/Card/TableRow"
```

---

## Task 4: Button — Press Feedback + Loading State

**Files:**
- Modify: `src/components/ui/button.tsx`

Add Framer Motion `whileTap` press feedback and an `isLoading` prop that swaps children for a spinner while holding the button width stable.

- [ ] **Step 1: Replace button.tsx**

```tsx
"use client"

import { motion } from "framer-motion"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const MotionButtonPrimitive = motion.create(ButtonPrimitive)

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <MotionButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || disabled}
      whileTap={{ scale: isLoading ? 1 : 0.97 }}
      transition={{ duration: 0.08, ease: [0.34, 1.56, 0.64, 1] }}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        children
      )}
    </MotionButtonPrimitive>
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors. If `motion.create` has a type issue with `ButtonPrimitive`, add `as any` to `motion.create(ButtonPrimitive as any)` only as a last resort.

- [ ] **Step 3: Start dev server and test press feedback**

```bash
npm run dev
```

Click any button — it should compress to 97% scale on press and spring back. Confirm loading spinner works by temporarily adding `isLoading` to one button in the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "design: add framer-motion press feedback and isLoading state to Button"
```

---

## Task 5: Card — Shadows, Radius, Padding

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Replace card.tsx**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] text-sm text-[var(--text-primary)] [--card-spacing:--spacing(6)] shadow-[var(--shadow-sm)] data-[size=sm]:[--card-spacing:--spacing(4)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1.5 px-[--card-spacing] pt-[--card-spacing] has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base font-semibold leading-snug tracking-[-0.01em] group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--text-muted)]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-[--card-spacing] pb-[--card-spacing]", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-[var(--border)] bg-[var(--surface)] px-[--card-spacing] py-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "design: refine Card shadows, radius, and padding"
```

---

## Task 6: Input — Height and Focus Ring

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Replace input.tsx**

```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // h-10 for primary forms; callers can override with h-8 for dense contexts
        "h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] transition-[border-color,box-shadow] outline-none",
        "placeholder:text-[var(--text-disabled)]",
        "focus-visible:border-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent)]/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-50",
        "aria-invalid:border-[var(--danger)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--danger)]/30",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "dark:bg-white/5 dark:disabled:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Check visually in dev server**

Open any settings or form page. Input should be 40px tall (h-10), have a stronger blue ring on focus, and placeholder text should be clearly lighter than typed text.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "design: increase input height to h-10, improve focus ring"
```

---

## Task 7: NavItem — Left-Border Active Indicator

**Files:**
- Modify: `src/components/dashboard/nav-item.tsx`

Replace the inline-style active background with token-driven classes and add a 2px left border accent on active items.

- [ ] **Step 1: Replace nav-item.tsx**

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
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
        isActive
          ? "border-l-2 border-[var(--accent)] bg-[var(--surface-overlay)] text-[var(--accent)] pl-[9px]"
          : "border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] pl-[9px]"
      )}
    >
      <Icon
        className={cn(
          "size-[15px] shrink-0 transition-colors",
          isActive
            ? "text-[var(--accent)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        )}
      />
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Check active state in dev server**

Navigate between pages. The active nav item should show a blue left bar, blue background tint, and blue text. Inactive items hover with a subtle gray fill.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/nav-item.tsx
git commit -m "design: add left-border active indicator to NavItem"
```

---

## Task 8: Sidebar — Grouped Nav + Token Classes

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`

Remove all inline `style={{}}` props. Group nav items into two sections ("Overview", "Manage"). Add section labels between groups.

- [ ] **Step 1: Replace sidebar.tsx**

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

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",  icon: LayoutDashboard, segment: "dashboard"  },
      { label: "Analytics",  icon: BarChart2,        segment: "analytics"  },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Appointments", icon: Calendar,      segment: "appointments" },
      { label: "Customers",    icon: Users,          segment: "customers"    },
      { label: "Inbox",        icon: MessageSquare,  segment: "inbox"        },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Settings", icon: Settings, segment: "settings" },
    ],
  },
] as const;

export function Sidebar({ tenant, user, workspaces: _workspaces }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      {/* Workspace header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--sidebar-border)] px-3 py-[13px]">
        {tenant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-[22px] shrink-0 rounded-[var(--radius-sm)] object-cover shadow-[var(--shadow-xs)]"
          />
        ) : (
          <div className="flex size-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[10px] font-semibold text-white shadow-[var(--shadow-xs)]">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-[var(--text-primary)]">
            {tenant.name}
          </p>
          <p className="text-[10px] font-medium uppercase leading-snug tracking-[0.05em] text-[var(--text-muted)]">
            {tenant.plan}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="section-label mb-1 px-2.5 py-1">{group.label}</p>
            <div className="space-y-px">
              {group.items.map((item) => (
                <NavItem
                  key={item.segment}
                  href={`/${tenant.slug}/${item.segment}`}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User menu */}
      <div className="border-t border-[var(--sidebar-border)] px-2 py-2">
        <UserMenu name={user.name} email={user.email} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Check sidebar in dev server**

The sidebar should show three groups with uppercase section labels, a deep-blue active bar on the current page, and token-driven borders (no inline styles).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/sidebar.tsx
git commit -m "design: refactor Sidebar — grouped nav, token classes, no inline styles"
```

---

## Task 9: AppointmentStatusBadge — Component-Based Styling

**Files:**
- Modify: `src/components/appointments/appointment-status-badge.tsx`
- Modify: `src/app/globals.css` (remove old `.status-*` classes)

Remove the globals.css `.status-*` utility classes and move all badge styling directly into the component using token-based Tailwind classes.

- [ ] **Step 1: Replace appointment-status-badge.tsx**

```tsx
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/prisma-enums";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-[var(--warning-subtle)] border-[var(--warning-subtle-border)] text-[var(--warning)]",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-[var(--success-subtle)] border-[var(--success-subtle-border)] text-[var(--success)]",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-[var(--danger-subtle)] border-[var(--danger-subtle-border)] text-[var(--danger)]",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]",
  },
  NO_SHOW: {
    label: "No Show",
    className:
      "bg-[var(--danger-subtle)] border-[var(--danger-subtle-border)] text-[var(--danger)]",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className:
      "bg-[var(--warning-subtle)] border-[var(--warning-subtle-border)] text-[var(--warning)]",
  },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  className,
}: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        config.className,
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: Remove status utility classes from globals.css**

In `globals.css`, delete the entire `/* ─── Utility: status badge ─────── */` block (lines containing `.status-badge`, `.status-badge-dot`, `.status-pending`, `.status-confirmed`, `.status-cancelled`, `.status-completed`, `.status-no-show`, `.status-rescheduled`). These are now handled by the component.

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Check badges in dev server**

Open the appointments page. Status badges should render as pill-shaped with a colored dot and the correct semantic color per status.

- [ ] **Step 5: Apply identical treatment to ConversationStatus**

Check whether a dedicated conversation status badge component exists by searching:

```bash
grep -r "ConversationStatus" src/components --include="*.tsx" -l
```

For any component that renders a conversation status inline (look for `OPEN`, `RESOLVED`, `ESCALATED`, `ARCHIVED` display logic), extract or update it to use the same pattern as `AppointmentStatusBadge` above — `inline-flex`, `rounded-full`, `border`, token-based color classes, dot indicator. The color mapping is:

```
OPEN      → success-subtle / success-subtle-border / success
RESOLVED  → surface / border / text-muted
ESCALATED → warning-subtle / warning-subtle-border / warning
ARCHIVED  → surface / border / text-disabled
```

- [ ] **Step 6: Commit**

```bash
git add src/components/appointments/appointment-status-badge.tsx src/app/globals.css
git commit -m "design: move status badge styling from globals.css into component"
```

---

## Task 10: EmptyState Component

**Files:**
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  subtext: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  heading,
  subtext,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <Icon className="size-6 text-[var(--text-muted)]" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-[var(--text-primary)]">{heading}</p>
        <p className="text-sm text-[var(--text-muted)]">{subtext}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AppointmentsTable to use EmptyState**

In `src/components/appointments/appointments-table.tsx`, replace the inline empty-state block with the new component:

```tsx
"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import { formatDate } from "@/lib/utils";
import type { AppointmentListItem } from "@/lib/appointments-queries";

interface AppointmentsTableProps {
  appointments: AppointmentListItem[];
  timezone: string;
  hasMore: boolean;
  onRowClick: (id: string) => void;
  onLoadMore: () => void;
  onCreateClick: () => void;
}

export function AppointmentsTable({
  appointments,
  timezone,
  hasMore,
  onRowClick,
  onLoadMore,
  onCreateClick,
}: AppointmentsTableProps) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        heading="No appointments found"
        subtext="Adjust your filters or create a new appointment."
        action={{ label: "New appointment", onClick: onCreateClick }}
      />
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {["Customer", "Service", "Staff", "Date & Time", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr
                key={appt.id}
                onClick={() => onRowClick(appt.id)}
              >
                <td className="font-medium text-[var(--text-primary)]">
                  {appt.customer?.name ?? "Unknown"}
                </td>
                <td className="text-[var(--text-secondary)]">
                  {appt.service.name}
                  <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                    {appt.service.duration}m
                  </span>
                </td>
                <td className="text-[var(--text-secondary)]">
                  {appt.teamMember?.name ?? "—"}
                </td>
                <td className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                </td>
                <td>
                  <AppointmentStatusBadge status={appt.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-[var(--border)] px-5 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/empty-state.tsx src/components/appointments/appointments-table.tsx
git commit -m "design: add EmptyState component, apply to appointments table"
```

---

## Task 11: PageTransition + Layout Update

**Files:**
- Create: `src/components/ui/page-transition.tsx`
- Modify: `src/app/(dashboard)/[tenant]/layout.tsx`

- [ ] **Step 1: Create page-transition.tsx**

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
        className="flex min-h-full flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Update layout.tsx to wrap children with PageTransition**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";

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
      <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg)]">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test page transitions in dev server**

Navigate between Appointments, Customers, Inbox. Each navigation should have a crisp 150ms opacity fade — confirming the route changed without feeling slow.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/page-transition.tsx src/app/(dashboard)/[tenant]/layout.tsx
git commit -m "design: add PageTransition wrapper to dashboard layout"
```

---

## Task 12: StatCard Display Class + Dashboard Loading

**Files:**
- Modify: `src/components/dashboard/stat-card.tsx`
- Create: `src/app/(dashboard)/[tenant]/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/dashboard/loading.tsx`

- [ ] **Step 1: Update stat-card.tsx — apply .display class**

In `src/components/dashboard/stat-card.tsx`, find the value `<p>` element and update it:

```tsx
{/* Value */}
<p
  className="display mt-3 font-mono tabular-nums text-[var(--text-primary)]"
>
  {value}
</p>
```

Remove the inline `style={{ fontSize: "26px", ... letterSpacing: "-0.02em" }}` — those are now handled by `.display` in globals.css.

The full updated stat-card.tsx:

```tsx
import { TrendingDown, TrendingUp } from "lucide-react";
import type { StatCardData } from "@/types";

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.every((d) => d === 0)) return <div className="h-8 w-16" />;

  const max = Math.max(...data, 1);
  const W = 64;
  const H = 32;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 2 - (v / max) * (H - 4),
  ] as [number, number]);

  const d =
    pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");

  const color =
    positive
      ? "var(--success)"
      : data.every((v) => v === 0)
      ? "var(--border-strong)"
      : "var(--danger)";

  return (
    <svg width={W} height={H} className="shrink-0 overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function StatCard({ label, value, delta, deltaLabel, sparkline }: StatCardData) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-5"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Label + sparkline */}
      <div className="flex items-start justify-between gap-2">
        <p className="section-label">{label}</p>
        <Sparkline data={sparkline} positive={isPositive || (!isPositive && !isNegative)} />
      </div>

      {/* Value */}
      <p className="display mt-3 font-mono tabular-nums text-[var(--text-primary)]">
        {value}
      </p>

      {/* Delta */}
      <div className="mt-2 flex items-center gap-1.5">
        {isPositive && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium"
            style={{
              background: "var(--success-subtle)",
              color: "var(--success)",
              borderColor: "var(--success-subtle-border)",
            }}
          >
            <TrendingUp className="size-3" />
            +{delta}
          </span>
        )}
        {isNegative && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium"
            style={{
              background: "var(--danger-subtle)",
              color: "var(--danger)",
              borderColor: "var(--danger-subtle-border)",
            }}
          >
            <TrendingDown className="size-3" />
            {delta}
          </span>
        )}
        {!isPositive && !isNegative && (
          <span className="text-xs text-[var(--text-muted)]">No change</span>
        )}
        <span className="text-xs text-[var(--text-muted)]">{deltaLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(dashboard)/[tenant]/loading.tsx`**

```tsx
import { SkeletonCard } from "@/components/ui/skeleton";

export default function TenantLoading() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(dashboard)/[tenant]/dashboard/loading.tsx`**

```tsx
import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]">
          <SkeletonText width={120} size="base" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} width={`${70 + i * 5}%`} />
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]">
          <SkeletonText width={100} size="base" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} width={`${80 - i * 7}%`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/stat-card.tsx \
  "src/app/(dashboard)/[tenant]/loading.tsx" \
  "src/app/(dashboard)/[tenant]/dashboard/loading.tsx"
git commit -m "design: apply .display class to stat cards, add dashboard loading skeletons"
```

---

## Task 13: Appointments Loading Skeleton

**Files:**
- Create: `src/app/(dashboard)/[tenant]/appointments/loading.tsx`

- [ ] **Step 1: Create appointments loading.tsx**

```tsx
import { SkeletonText, SkeletonTableRow } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <SkeletonText width={160} size="base" />
        <SkeletonText width={128} size="base" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonText key={i} width={80} className="h-8 rounded-full" />
        ))}
      </div>

      {/* Table shell */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Table header */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex gap-8">
            {[140, 100, 80, 110, 70].map((w, i) => (
              <SkeletonText key={i} width={w} className="h-3" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Test in dev server**

Navigate to `/[tenant]/appointments` on a slow connection (Network tab → Fast 3G in devtools). The skeleton table should appear immediately while data loads.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/[tenant]/appointments/loading.tsx"
git commit -m "design: add appointments loading skeleton"
```

---

## Task 14: Remaining Page Loading Skeletons

**Files:**
- Create: `src/app/(dashboard)/[tenant]/customers/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/inbox/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/analytics/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/loading.tsx`

- [ ] **Step 1: Create customers/loading.tsx**

```tsx
import { SkeletonText, SkeletonTableRow } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <SkeletonText width={120} size="base" />
        <SkeletonText width={100} size="base" />
      </div>
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex gap-8">
            {[140, 120, 100, 110].map((w, i) => (
              <SkeletonText key={i} width={w} className="h-3" />
            ))}
          </div>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create inbox/loading.tsx**

```tsx
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-72 shrink-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] p-3">
          <SkeletonText width="100%" className="h-8 rounded-[var(--radius-md)]" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonText width="60%" />
                <SkeletonText width="85%" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread area */}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <SkeletonText width={160} size="base" />
        </div>
        <div className="flex-1 space-y-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <Skeleton
                className="rounded-[var(--radius-lg)]"
                style={{ height: 48, width: `${40 + (i % 3) * 15}%` }}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <SkeletonText width="100%" className="h-10 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create analytics/loading.tsx**

```tsx
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <SkeletonText width={120} size="base" />
        <SkeletonText width={180} className="h-9 rounded-[var(--radius-md)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] p-5"
            style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
          >
            <SkeletonText width={140} size="base" className="mb-4" />
            <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create settings/loading.tsx**

```tsx
import { SkeletonText } from "@/components/ui/skeleton";

function SettingsSectionSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)]"
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="border-b border-[var(--border)] px-6 py-5 space-y-1.5">
        <SkeletonText width={140} size="base" />
        <SkeletonText width={240} />
      </div>
      <div className="space-y-4 px-6 py-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonText width={80} />
            <SkeletonText width="100%" className="h-10 rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-4 p-6">
      <SkeletonText width={100} size="base" />
      <SettingsSectionSkeleton />
      <SettingsSectionSkeleton />
    </div>
  );
}
```

- [ ] **Step 5: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add \
  "src/app/(dashboard)/[tenant]/customers/loading.tsx" \
  "src/app/(dashboard)/[tenant]/inbox/loading.tsx" \
  "src/app/(dashboard)/[tenant]/analytics/loading.tsx" \
  "src/app/(dashboard)/[tenant]/settings/loading.tsx"
git commit -m "design: add loading skeletons for customers, inbox, analytics, settings"
```

---

## Task 15: Full Test Run + Dark Mode Verification

**Files:**
- No code changes — verification only.

- [ ] **Step 1: Run the test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass. If any test fails due to import changes (e.g., `AppointmentStatusBadge` style changes), inspect the test and verify it still tests the correct behaviour — the badge should still render a status label.

- [ ] **Step 2: Run TypeScript across the whole project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build to confirm no Turbopack errors**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Visual verification checklist (dev server)**

```bash
npm run dev
```

Work through each check:

| Area | Check |
|---|---|
| Sidebar | Left accent bar on active page, grouped sections, no inline styles |
| Nav | `surface-overlay` bg on active item, `surface-raised` on hover |
| Buttons | Shadow on default variant, 97% press scale, spinner when `isLoading` |
| Cards | Softer, larger shadow; `radius-lg` (12px); correct padding |
| Inputs | 40px height in forms; blue ring on focus; lighter placeholder |
| Stat cards | 30px display number; sparkline 1.5px stroke |
| Status badges | Pill shape with dot; correct color per status |
| Empty state | Dashed border, 48px icon, action button |
| Appointments | Shimmer skeleton on slow load; updated empty state |
| Inbox | Skeleton conversation list on load |
| Page transition | Subtle opacity fade between routes |
| Dark mode | Toggle `.dark` class — all tokens resolve correctly |

- [ ] **Step 5: Final commit if any minor fixes were needed**

```bash
git add -p   # stage only the small fixes
git commit -m "design: polish pass — dark mode fixes and minor adjustments"
```

---

## Implementation Order Summary

1. Task 1 — Design tokens (globals.css) — **foundation for all other tasks**
2. Task 2 — Install Framer Motion
3. Task 3 — Skeleton shimmer
4. Task 4 — Button press + loading
5. Task 5 — Card refinements
6. Task 6 — Input improvements
7. Task 7 — NavItem active state
8. Task 8 — Sidebar refactor
9. Task 9 — AppointmentStatusBadge
10. Task 10 — EmptyState + update appointments table
11. Task 11 — PageTransition + layout
12. Task 12 — StatCard + dashboard loading
13. Task 13 — Appointments loading
14. Task 14 — Remaining page loadings
15. Task 15 — Verification pass
