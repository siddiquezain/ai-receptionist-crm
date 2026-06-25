# UI Polish Sprint — Design Spec

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Presentation and UX only — no changes to routes, APIs, database schema, or business logic.

---

## Goals

Transform the dashboard into a premium SaaS product that feels instant and intentional. The north-star references are Linear, Stripe, Vercel, and Clerk — not for copying, but for their standard of spacing, interaction quality, and motion restraint.

Three design principles govern every decision:

1. **Perceived speed over decoration** — skeleton states, optimistic updates, and instant interactive feedback take priority over any visual flourish.
2. **Consistency over novelty** — every token, variant, and pattern must be reusable. No page-specific hacks.
3. **Subtlety over statement** — shadows are soft, motion is purposeful, color is restrained.

---

## 1. Design System Foundation

### 1.1 Typography

Two distinct size contexts:

| Context | Size | Line-height | Weight | Usage |
|---|---|---|---|---|
| Reading body | 16px | 1.65 | 400 | Page descriptions, form labels, slide-over content |
| Dense body | 14px | 1.5 | 400 | Tables, metadata, nav items, badges |
| Micro | 12px | 1.45 | 400–500 | Timestamps, secondary labels, section labels |
| Page title | 20px | 1.3 | 650 | Page `<h1>`, tracking `-0.025em` |
| Display | 30px | 1.2 | 700 | Stat card primary numbers, tracking `-0.03em` |
| Section label | 11.5px | 1.45 | 500 | Uppercase, tracking `0.06em`, `--text-muted` |

Font stack unchanged: Geist Sans → system-ui → sans-serif. Mono stays for all numeric data with `font-feature-settings: "tnum"`.

New utility classes added to `globals.css`:
- `.page-title` — 20px/650/-0.025em
- `.display` — 30px/700/-0.03em
- `.reading-body` — 16px/1.65 (applied via `prose` or explicit class on content containers)

### 1.2 Color Palette

Blue accent stays. All changes are tuning, not replacement.

**Accent:**
```
--accent:       #1d4ed8  (deepened from #2563eb — more contrast on white)
--accent-hover: #1e40af
--accent-subtle: color-mix(in srgb, var(--accent) 8%, transparent)
--accent-subtle-border: color-mix(in srgb, var(--accent) 20%, transparent)
```

**Surfaces (light mode) — four layers:**
```
--bg:              #ffffff
--surface:         #fafafa
--surface-raised:  #f4f4f5
--surface-overlay: #f0f2ff   (faint blue tint — active nav, hover states)
```

**Surfaces (dark mode):**
```
--bg:              #09090b
--surface:         #111318   (blue undertone, less cold)
--surface-raised:  #18181b
--surface-overlay: #1e2030   (blue-tinted active state)
```

**Borders, text, and semantic colors:** unchanged from current system.

### 1.3 Radius

| Token | Old | New |
|---|---|---|
| `--radius-sm` | 4px | 4px |
| `--radius-md` | 6px | 8px |
| `--radius-lg` | 10px | 12px |
| `--radius-xl` | 14px | 16px |
| `--radius-full` | — | 9999px (new — pill badges) |

### 1.4 Shadows

Larger spread, lower opacity — soft ambient lift, not hard drop shadows.

```
--shadow-xs:  0 1px 2px rgba(0,0,0,0.04)
--shadow-sm:  0 2px 8px rgba(0,0,0,0.06),  0 1px 2px rgba(0,0,0,0.04)
--shadow-md:  0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)
--shadow-lg:  0 8px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)
--shadow-xl:  0 16px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.04)
```

Dark mode: all `rgba` values stay the same — dark backgrounds make even soft shadows read clearly.

### 1.5 Motion Tokens

```css
/* Durations */
--duration-instant: 80ms    /* button press, toggle */
--duration-fast:   150ms    /* hover, badge change, nav */
--duration-normal: 200ms    /* tab switch, dropdown */
--duration-slow:   300ms    /* slide-over, modal, page panel */

/* Easings */
--ease-default: cubic-bezier(0.2, 0, 0, 1)        /* snappy, Linear-style */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1) /* subtle overshoot for press */
--ease-out:     cubic-bezier(0, 0, 0.2, 1)         /* decelerating exits */
--ease-in:      cubic-bezier(0.4, 0, 1, 1)         /* accelerating enters */
```

Global `<a>` and `<button>` transition in `globals.css` updated to use `var(--duration-fast)` and `var(--ease-default)`.

### 1.6 Blur Tokens

```css
--blur-sm: 4px
--blur-md: 8px
--blur-lg: 16px
--blur-xl: 24px
```

Used for: sticky table header backdrop, modal overlay, sidebar on mobile overlay.

### 1.7 Z-index Tokens

```css
--z-base:     0
--z-raised:   10
--z-dropdown: 100
--z-sticky:   200
--z-overlay:  300
--z-modal:    400
--z-toast:    500
--z-tooltip:  600
```

All component z-index values (`z-50`, `z-10`, etc. currently hard-coded) replaced with these tokens.

---

## 2. Component Strategy

### 2.1 Skeleton System

**New variants added to existing `<Skeleton>` primitive:**

- `<SkeletonText>` — inline block, height matches `text-sm` or `text-base`, variable width via prop
- `<SkeletonCard>` — matches stat card outer dimensions (height: 120px approx), `--radius-lg`
- `<SkeletonTableRow>` — full-width row at 52px height, column widths match real table proportions

Skeleton shimmer uses a CSS `@keyframes` gradient sweep (left → right), not `animate-pulse`. More realistic, less distracting.

Every page that fetches server data gets a `loading.tsx` next to its `page.tsx` using these skeletons.

### 2.2 Button

Changes from current:
- `whileTap={{ scale: 0.97 }}` via Framer Motion — 80ms `--ease-spring`. Imperceptible latency, high responsiveness signal.
- `data-loading` prop: spinner (16px `Loader2` icon, `animate-spin`) replaces label text; button width held fixed with `min-w` to prevent layout jump.
- Default variant: add `--shadow-xs` so button lifts off surface.
- Disabled: `opacity-40` (from `opacity-50`) — less harsh.
- Focus-visible: `ring-2 ring-[--accent]/50 ring-offset-2` — more visible than current.

No new variants added. Existing 6 variants unchanged.

### 2.3 Card

- `--shadow-sm` added as default.
- `--radius-lg` (12px) applied.
- `CardHeader` padding: `px-6 py-5`.
- `CardContent` padding: `px-6 pb-6`.
- Interactive cards (wrapped in `<a>` or `onClick`): `--shadow-md` on hover, `translateY(-1px)` — 150ms `--ease-out`.
- Header/content divider: `1px solid var(--border)` unchanged — gradient fade considered but rejected for implementation complexity vs. payoff.

### 2.4 Table

- Row hover: `background: var(--surface-raised)`, transition 120ms.
- Column headers: `text-xs/500/uppercase/--text-muted` applied consistently (`.section-label` style).
- Sticky header: `position: sticky; top: 0; z-index: var(--z-sticky); backdrop-filter: blur(var(--blur-sm)); box-shadow: var(--shadow-xs)`.
- Cell padding: `py-3.5 px-4` (from `py-3 px-3`).
- `loading.tsx` shows 5 `<SkeletonTableRow>` at correct height.

### 2.5 Sidebar

Full refactor from inline `style={{}}` to token-driven Tailwind classes.

Structure:
```
[Workspace header — logo + name + plan badge]
[Nav section: "Overview"]
  Dashboard
  Analytics
[Nav section: "Management"]
  Appointments
  Customers
  Inbox
[Bottom — user avatar + name + role + menu trigger]
```

Active nav item:
- `border-l-2 border-[--accent] bg-[--surface-overlay] text-[--accent]` — clear, not loud.

Hover nav item:
- `bg-[--surface-raised]` at `--duration-fast`.

Workspace header:
- Logo: 28px with `--shadow-xs` ring.
- Name: `text-sm/600`.
- Plan badge: `.section-label` pill style.

User footer:
- Avatar: 32px circle, initials-based fallback, color derived from name hash.
- Two-line layout: `text-sm/500` name + `text-xs/--text-muted` role.
- Right side: `MoreHorizontal` icon triggers existing user menu.

### 2.6 Forms & Inputs

- Height: `h-10` (40px) for primary context; `h-8` (32px) for dense/table contexts.
- Focus ring: `ring-2 ring-[--accent]/30 border-[--accent]` — ring makes focus obvious without being harsh.
- Placeholder: `--text-disabled` (was `--text-muted` — too dark, reduces contrast differentiation).
- Label: `text-sm/500/--text-secondary` (was `text-xs` — too small for reading-body context).
- Error: `border-[--danger] ring-2 ring-[--danger]/30` + `text-xs/--danger` helper text below field.
- Consistent pattern across all form fields — no per-page variations.

### 2.7 Badges & Status

`AppointmentStatusBadge` converted from globals.css utility classes to CVA variants. Shape: `--radius-full`, `px-2.5 py-0.5`, `text-xs/500`.

`ConversationStatus` badges get identical treatment.

Status → CVA variant map:
```
PENDING     → outline-yellow
CONFIRMED   → success
CANCELLED   → destructive (muted)
COMPLETED   → secondary
NO_SHOW     → outline-red
RESCHEDULED → outline-blue
OPEN        → success
RESOLVED    → secondary
ESCALATED   → warning
ARCHIVED    → ghost
```

### 2.8 Empty States

Standard pattern applied across all pages:
- 48px Lucide icon, `--text-muted`.
- `text-base/500` heading.
- `text-sm/--text-muted` subtext.
- Optional primary CTA button.
- Dashed `--border` container box (not full-page center — anchors it to the content area).

### 2.9 Loading & Error States

- Route-level `loading.tsx` for every dashboard page — skeleton, not spinner.
- Inline error states: `--danger-subtle` background banner + `AlertCircle` icon + message + optional retry button.
- Optimistic UI on status changes: update state immediately, roll back with `toast.error` on failure.

---

## 3. Layout & Page Application

### 3.1 Root Layout

`[tenant]/layout.tsx`:
- `<PageTransition>` wrapper: Framer Motion `AnimatePresence` + `motion.div`, 150ms fade, `--ease-out`. Confirms navigation happened without slowing it down.
- `max-w-screen-2xl mx-auto` on content area — prevents ultra-wide stretch.
- No other structural changes.

### 3.2 Responsive Breakpoints

| Breakpoint | Sidebar | Content |
|---|---|---|
| `< 768px` | Off-canvas drawer (hamburger trigger) | Full width |
| `768–1024px` | Icon-only strip (48px) | Full width |
| `> 1024px` | Full 220px | Standard grid |

Tables: horizontal scroll on mobile, first column (name/customer) sticky.

### 3.3 Page Inventory

**Dashboard (`/[tenant]`)**
- Stat grid: `grid-cols-2 lg:grid-cols-4`, responsive.
- `<SkeletonCard>` × 4 in `loading.tsx`.
- `.display` class on primary stat numbers.
- Sparkline stroke weight: 1px → 1.5px.

**Appointments (`/[tenant]/appointments`)**
- Page header: title + "New appointment" button in flex row.
- Filters: horizontal scroll mobile, active filter pill style.
- `<SkeletonTableRow>` × 5 in `loading.tsx`.
- Slide-over: Framer Motion `AnimatePresence`, slides from right 300ms `--ease-default`, backdrop fades simultaneously.

**Customers (`/[tenant]/customers`)**
- Table: same skeleton + hover treatment.
- Customer avatar: initials circle, color from name hash.
- Activity timeline: left border track (1px `--border`) instead of floating dots.

**Inbox (`/[tenant]/inbox`)**
- Conversation list: 1px bottom border per item (Linear-style list, not cards).
- Unread indicator: 6px `--accent` dot, left-aligned.
- Active conversation: `--accent-subtle` + 2px `--accent` left border — mirrors sidebar.
- Message input: `h-10` with inline send button, `--shadow-sm` container.
- `loading.tsx`: skeleton conversation list × 5 + skeleton thread.

**Analytics (`/[tenant]/analytics`)**
- Chart containers: `--shadow-sm` card, `--radius-lg`.
- Date range picker: matches input system (height, focus ring).
- Axis labels: `text-xs/--text-muted`.
- Empty chart: dashed border container + icon + copy.

**Settings (`/[tenant]/settings`)**
- Settings nav: same active state as sidebar (left bar + fill).
- Form sections: `Card` with `CardHeader` (title + description) + `CardContent` (fields).
- Save button: in `CardFooter`, not floating.
- Danger zone: `--danger-subtle` card background + `--danger-subtle-border`.

---

## 4. Animation Inventory

| Interaction | Library | Duration | Easing |
|---|---|---|---|
| Page transition | Framer Motion `AnimatePresence` | 150ms | `--ease-out` |
| Button press | Framer Motion `whileTap` | 80ms | `--ease-spring` |
| Slide-over open/close | Framer Motion `AnimatePresence` | 300ms | `--ease-default` |
| Modal open/close | Framer Motion `AnimatePresence` | 200ms | `--ease-default` |
| Dropdown open | CSS (`tw-animate-css`) | 150ms | `--ease-out` |
| Card hover lift | CSS transition | 150ms | `--ease-out` |
| Nav item hover | CSS transition | 150ms | `--ease-default` |
| Row hover | CSS transition | 120ms | `--ease-default` |
| Skeleton shimmer | CSS `@keyframes` | 1.5s loop | `ease-in-out` |
| Toast enter/exit | Sonner built-in | — | — |
| All others | CSS transition | `--duration-fast` | `--ease-default` |

**No staggered decorative list entrances.** Motion exists only to confirm state changes and provide interaction feedback.

---

## 5. New Dependencies

| Package | Version | Purpose |
|---|---|---|
| `framer-motion` | `^11` | Button press, slide-over, modal, page transitions |

No other new dependencies. All other animation/transition work uses existing CSS utilities.

---

## 6. What Does Not Change

- All route paths and URL structures
- All API endpoints and server actions
- All database schema and Prisma models
- All business logic (booking, messaging, analytics calculations)
- All form validation rules
- Authentication and authorization flows
- Existing component API surface (props stay the same; internal implementation changes)

---

## 7. Implementation Order

1. `globals.css` — all new tokens (motion, blur, z-index, surface layers, shadow, typography)
2. `framer-motion` install
3. Skeleton primitive extensions + page `loading.tsx` files
4. Sidebar refactor
5. Button, Card, Input, Table primitives
6. Badge/status components
7. Empty and error state patterns
8. Layout (`PageTransition`, responsive sidebar)
9. Page-by-page application (Dashboard → Appointments → Customers → Inbox → Analytics → Settings)
10. Responsive pass (mobile/tablet)
11. Dark mode verification pass
