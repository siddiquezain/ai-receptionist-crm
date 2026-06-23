# Phase 3B – Product Polish Design

**Date:** 2026-06-23
**Branch:** feat/premium-redesign
**Status:** Approved

---

## Context

Phase 3A established a working dashboard reading real data from Supabase. The primary pages (Dashboard, Appointments, Customers, Inbox, Analytics, Settings) are functional.

Phase 3B makes the product feel production-ready before n8n and WhatsApp integration begins. The scope is the dashboard frontend only — no backend architecture changes, no n8n, no AI workflows, no Evolution API.

Work is organized in three layers delivered sequentially:

1. **Foundation** — loading states, error handling, design system unification, code quality
2. **Core Features** — global command palette, Inbox filters, sorting, Appointments search
3. **Polish** — accessibility, responsive design, performance, empty state enhancements

---

## Delivery Approach

Layer-by-layer (horizontal slices). Patterns are established once in the foundation and applied consistently. Each layer is a coherent, reviewable unit of work.

---

## Layer 1: Foundation

### 1.1 Loading States

**Route-level `loading.tsx`**

Add a `loading.tsx` file to every major route segment. Skeletons closely approximate the real layout so transitions feel polished, not generic.

| Route | Skeleton contents |
|---|---|
| `dashboard/` | 4 `StatCardSkeleton` + `ChartSkeleton` + 5-row `TableSkeleton` + 3 `ConversationSkeleton` |
| `appointments/` | Filter bar skeleton + 8-row `TableSkeleton` |
| `customers/` | Search bar skeleton + 8-row `TableSkeleton` |
| `inbox/` | 6 `ConversationSkeleton` left + empty center pane |
| `analytics/` | Date picker skeleton + 2 `ChartSkeleton` + `TableSkeleton` |
| `settings/profile/` | `FormSkeleton` (4 fields) |
| `settings/working-hours/` | `FormSkeleton` (7 rows) |
| `settings/team/` | 3-row `TableSkeleton` |
| `settings/ai/` | `FormSkeleton` (6 fields) |

**Shared skeleton components** — `src/components/ui/skeletons/`

Build reusable skeleton primitives rather than duplicating `<Skeleton />` markup:

| Component | Props | Used by |
|---|---|---|
| `StatCardSkeleton` | none | Dashboard |
| `ChartSkeleton` | `height?` | Dashboard, Analytics |
| `TableSkeleton` | `rows`, `cols` | Appointments, Customers, Analytics, Team |
| `ConversationSkeleton` | none | Dashboard (InboxSnapshot), Inbox |
| `MessageSkeleton` | `align?: "left" \| "right"` | Inbox thread |
| `CardSkeleton` | `lines?` | Generic |
| `FormSkeleton` | `fields` | Settings pages |

**Suspense within pages**

Use Suspense on data-heavy pages where sections can load independently. Wrap each independently-fetchable section in its own `<Suspense fallback={<SkeletonComponent />}>`.

- **Dashboard** — three independent Suspense boundaries: KPI stat cards, trend chart, and the bottom row (upcoming appointments + inbox snapshot). Each section fetches its own data via an async server component.
- **Analytics** — two boundaries: overview charts (booking + revenue), performance tables (services + staff + AI performance). Peak hours heatmap can share the chart boundary.
- **Inbox** — two boundaries: conversation list and message thread. The right panel loads with the thread.

Implementation pattern: extract each Suspense-wrapped section into its own async server component (e.g., `DashboardStatCards`, `DashboardTrendChart`, `DashboardActivity`) that fetches its own data. The parent `page.tsx` composes them with Suspense boundaries.

### 1.2 Error Handling

**Route-level `error.tsx`**

Add `error.tsx` to every route segment (same paths as loading.tsx above), plus a root-level `app/global-error.tsx`.

All error pages use a shared `<ErrorPage>` component:

```tsx
// src/components/ui/error-page.tsx
interface ErrorPageProps {
  title?: string          // default: "Something went wrong"
  description?: string    // default: "This page couldn't load. Try again or return to the dashboard."
  reset: () => void       // Next.js reset() prop
  error: Error            // logged to console, never displayed
}
```

Visual design: centered layout, warning icon (`AlertTriangle` from lucide), friendly title + description, "Try again" button (calls `reset()`), secondary "Go to dashboard" link. Matches dashboard typography and color tokens. No stack traces or raw error messages visible to users. Error object is logged to `console.error` with a structured prefix for future log-service integration.

Server actions already return `{ success: boolean; error?: string }` with `toast.error()` — this pattern is correct and unchanged.

### 1.3 Visual Consistency

**Migrate raw tables to shadcn Table**

Four instances of raw `<table>` markup exist. Migrate all to `src/components/ui/table.tsx`:
- `AppointmentsTable` (`src/components/appointments/appointments-table.tsx`)
- `CustomersTable` (`src/components/customers/customers-table.tsx`)
- `UpcomingAppointments` (`src/components/dashboard/upcoming-appointments.tsx`)
- Analytics tables inside `ServicesBreakdown` and `StaffPerformance`

**Deduplicate STATUS_CONFIG**

Extract to `src/lib/appointment-status.ts`:

```ts
export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, {
  label: string
  className: string
}> = { ... }
```

Both `AppointmentStatusBadge` and `UpcomingAppointments` import from this file. Delete the duplicate map in `UpcomingAppointments`.

**Fix `--navbar-height` Inbox calc**

The Inbox wrapper uses `h-[calc(100vh-var(--navbar-height,56px))]`. The layout has no top navbar — there is no variable to inherit. Replace with `h-[calc(100dvh-0px)]` (effectively `h-dvh`) or the correct fixed offset from the sidebar layout.

**Remove Sidebar workspace stub**

Remove `_workspaces` prop and the unused workspace-switcher dead code from `src/components/dashboard/sidebar.tsx`.

### 1.4 Code Quality

- Remove any inline `// TODO` comments found during the pass
- Verify `@tanstack/react-query` — if zero call sites remain after the full pass, remove the dependency and `Providers` wrapper to reduce bundle size; if any component uses it, document which one
- Confirm `src/lib/ai/` files are not imported by any dashboard UI component (consistent with architecture: n8n is the AI execution layer)

---

## Layer 2: Core Features

### 2.1 Global Command Palette (⌘K / Ctrl+K)

**Architecture**

The palette is a standalone subsystem, not a page feature. It registers globally in the dashboard layout.

```
src/components/command-palette/
  command-palette.tsx          — Shell: keyboard listener, dialog, input, results
  command-palette-provider.tsx — Context: open/close, query state
  use-command-palette.ts       — Hook: consumers open the palette programmatically
  providers/
    navigation.ts              — Built-in nav links (no async)
    customers.ts               — Customer search provider
    appointments.ts            — Appointment search provider
    conversations.ts           — Conversation search provider
  types.ts                     — CommandSection, CommandItem, CommandProvider interfaces
```

**Provider interface**

```ts
interface CommandProvider {
  id: string
  label: string                            // section heading in results
  search(query: string, ctx: CommandCtx): Promise<CommandItem[]>
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon?: ReactNode
  href?: string                            // navigate on select
  action?: () => void                      // run action on select
  matches?: MatchRange[]                   // for text highlighting
}
```

Adding a new entity type (quick actions, AI, workflows) means registering a new `CommandProvider` — no changes to the palette shell.

**Search behavior**

- Opens on `⌘K` (Mac) or `Ctrl+K` (Windows/Linux); closes on `Escape` or outside click
- Minimum 2 characters before searching
- 250–300ms debounce
- Loading indicator (spinner in input) while results are fetching
- Each provider is called independently via a single `globalSearch` server action that fans out to per-entity Prisma queries
- Max 5 results per section; server-side limit — never loads full dataset into browser
- Session-level result cache: `Map<query, result>` per provider, invalidated on full navigation (not on palette close)
- Matching text highlighted in results using the `matches` ranges from the server

**Result sections**

| Section | Search fields | Navigate to |
|---|---|---|
| Navigation | Page name | Direct route |
| Customers | name, email, phone | `/[tenant]/customers/[id]` |
| Appointments | customer name, customer phone, service name | `/[tenant]/appointments?open=[id]` |
| Conversations | customer name, status | `/[tenant]/inbox?conversation=[id]` |

**Keyboard navigation**

- `↑` / `↓` — move between items
- `Enter` — activate selected item
- `Tab` — move to next section header
- Full ARIA: `role="combobox"` on input, `role="listbox"` on results, `role="option"` on items, `aria-activedescendant` tracking
- Focus trap while open; focus returns to the previously focused element on close

**Future extension points (not built in Phase 3B)**

The provider registry is designed to accept:
- Quick actions (Create Customer, Create Appointment) — `CommandItem` with `action` instead of `href`
- Settings navigation — a Settings `CommandProvider`
- AI workflow triggers — a future `CommandProvider` registered in Phase 6

### 2.2 Inbox Filter Tabs

**Component:** `src/components/inbox/conversation-filters.tsx`

A standalone component that accepts the conversation list and returns the filtered subset. Decoupled from data source and realtime subscription.

```tsx
interface ConversationFiltersProps {
  conversations: ConversationListItem[]
  value: ConversationFilterState
  onChange: (state: ConversationFilterState) => void
}

interface ConversationFilterState {
  status: 'ALL' | 'OPEN' | 'ESCALATED' | 'RESOLVED'
  aiHandled?: boolean      // schema: Conversation.aiHandled
  humanHandled?: boolean   // schema: !aiHandled
  assigned?: boolean       // schema: assignedToId !== null
}
```

UI: tab strip (All / Open / Escalated / Resolved) with count badges showing live counts from the full list. Toggle buttons for AI Handled, Human Handled, Assigned (only rendered if schema supports, which it does).

**Unread** is omitted — no `readAt` or unread count field exists in the current schema.

Filtering happens in `InboxClient` — the `ConversationFilters` component emits state changes; `InboxClient` applies the filter to the loaded list before rendering `ConversationList`. The realtime subscription continues to update the full list; the filter is applied reactively.

### 2.3 Sorting

**Shared abstraction**

```
src/lib/sorting.ts          — useSortParams hook + SortOption type
src/components/ui/sort-dropdown.tsx — reusable <SortDropdown> component
```

```ts
interface SortOption<T extends string = string> {
  value: T
  label: string
  dir?: 'asc' | 'desc'     // default direction when this option is selected
}

function useSortParams<T extends string>(
  options: SortOption<T>[],
  defaultSort: T
): { sort: T; dir: 'asc' | 'desc'; setSort: (v: T) => void }
```

The hook reads/writes `sort` + `dir` URL searchParams via `router.replace()`. `SortDropdown` renders a `<Select>` using the existing shadcn `select.tsx`.

**Appointments sort options**

| Value | Label | Default dir |
|---|---|---|
| `date` | Newest first (default) | desc |
| `date_asc` | Oldest first | asc |
| `customer` | Customer name A→Z | asc |
| `status` | Status | asc |

**Customers sort options**

| Value | Label | Default dir |
|---|---|---|
| `name` | Name A→Z (default) | asc |
| `last_seen` | Recently seen | desc |
| `appointments` | Most appointments | desc |

Both sort dropdowns are placed in their respective filter bars, adjacent to existing filter controls.

### 2.4 Appointments Text Search

Add `q` searchParam to Appointments. The `getAppointments()` query in `src/lib/appointments-queries.ts` gets an OR condition on:

```ts
OR: [
  { customer: { name: { contains: q, mode: 'insensitive' } } },
  { customer: { phone: { contains: q, mode: 'insensitive' } } },
  { service: { name: { contains: q, mode: 'insensitive' } } },
]
```

The search input is added to `AppointmentsFilters` alongside the existing status tabs and date range. On Enter/blur, it updates the URL and resets `page` to 0. Clears when the `×` is clicked.

---

## Layer 3: Polish

### 3.1 Accessibility

Targeted fixes — no ARIA overengineering:

- **Icon-only buttons** — add `aria-label` to all icon-only interactive elements (found in Inbox, Customers table, slide-overs)
- **Active nav link** — add `aria-current="page"` to the active `NavItem` in Sidebar
- **Status badges** — add `aria-label="Status: [value]"` to `AppointmentStatusBadge`
- **Slide-over focus** — verify Sheet (Base-UI Dialog) returns focus to the trigger element on close; add explicit `ref`/`onClose` wiring if needed
- **Message input** — add proper `aria-label` to the Inbox compose input
- **Skip link** — add a visually-hidden "Skip to main content" `<a>` at the top of the dashboard layout, visible on focus
- **Focus rings** — audit all interactive elements for visible `:focus-visible` styles; add where missing using the existing `--accent` color token

### 3.2 Responsive Design (mobile-aware)

Target: fix overflow and layout issues for viewports ≥ 768px. Full mobile redesign is out of scope.

- **Sidebar** — below 768px: collapse to icon-only (48px wide) with `Tooltip` on each nav item. No hamburger drawer.
- **Inbox 3-pane** — below 1024px: hide the right panel (customer snapshot + AI activity); below 768px: conversation list takes full width, message thread overlays using existing `Sheet` component
- **Tables** — wrap all table containers in `overflow-x-auto` so horizontal scroll is available on small viewports
- **Analytics charts** — verify `ResponsiveContainer` is applied to PeakHoursHeatmap (the recharts pattern already used on other charts)
- **General** — fix any text overflow, button wrapping, or padding issues discovered during viewport audit

### 3.3 Performance

- **Appointments customer prefetch** — replace the `getCustomerOptions` 100-customer prefetch in Appointments page with a debounced async server action (`searchCustomers(q)`) called from the slide-over's customer input. Eliminates the prefetch on every Appointments page load.
- **Inbox N+1 check** — verify `getConversations` uses a single Prisma query with `include: { lastMessage: true, customer: true }` rather than N+1 per conversation.
- **Bundle audit** — after the full pass, check if `@tanstack/react-query` has zero call sites. If so, remove it and the `Providers` wrapper.
- No speculative optimization beyond these three items.

### 3.4 Empty State Enhancements

Existing empty states are functional. Targeted improvements:

| Page / section | Current | Improved |
|---|---|---|
| Analytics (no data in range) | None observed | "No appointments in this period. Try a wider date range." + 30-day / 90-day preset buttons |
| Customer detail — no appointments | Plain empty | "No appointments yet" + "Book appointment" CTA (opens create slide-over) |
| Inbox filtered results — zero | Generic | "No [Status] conversations" + "Clear filter" action |
| Command palette — no results | N/A (new) | "No results for '[query]'" (not a generic message) |

---

## Files Created / Modified

### New files

| Path | Purpose |
|---|---|
| `src/components/ui/skeletons/index.ts` | Barrel export |
| `src/components/ui/skeletons/stat-card-skeleton.tsx` | |
| `src/components/ui/skeletons/chart-skeleton.tsx` | |
| `src/components/ui/skeletons/table-skeleton.tsx` | |
| `src/components/ui/skeletons/conversation-skeleton.tsx` | |
| `src/components/ui/skeletons/message-skeleton.tsx` | |
| `src/components/ui/skeletons/card-skeleton.tsx` | |
| `src/components/ui/skeletons/form-skeleton.tsx` | |
| `src/components/ui/error-page.tsx` | Shared error UI |
| `src/components/ui/sort-dropdown.tsx` | Shared sort control |
| `src/lib/sorting.ts` | `useSortParams` hook + `SortOption` type |
| `src/lib/appointment-status.ts` | Shared `APPOINTMENT_STATUS_CONFIG` |
| `src/lib/actions/search.ts` | `globalSearch` server action |
| `src/components/command-palette/types.ts` | |
| `src/components/command-palette/command-palette.tsx` | |
| `src/components/command-palette/command-palette-provider.tsx` | |
| `src/components/command-palette/use-command-palette.ts` | |
| `src/components/command-palette/providers/navigation.ts` | |
| `src/components/command-palette/providers/customers.ts` | |
| `src/components/command-palette/providers/appointments.ts` | |
| `src/components/command-palette/providers/conversations.ts` | |
| `src/components/inbox/conversation-filters.tsx` | |
| `src/app/(dashboard)/[tenant]/dashboard/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/appointments/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/customers/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/customers/[id]/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/inbox/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/analytics/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/profile/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/working-hours/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/team/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/ai/loading.tsx` | |
| `src/app/(dashboard)/[tenant]/dashboard/error.tsx` | |
| `src/app/(dashboard)/[tenant]/appointments/error.tsx` | |
| `src/app/(dashboard)/[tenant]/customers/error.tsx` | |
| `src/app/(dashboard)/[tenant]/customers/[id]/error.tsx` | |
| `src/app/(dashboard)/[tenant]/inbox/error.tsx` | |
| `src/app/(dashboard)/[tenant]/analytics/error.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/profile/error.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/working-hours/error.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/team/error.tsx` | |
| `src/app/(dashboard)/[tenant]/settings/ai/error.tsx` | |
| `src/app/global-error.tsx` | |

### Modified files

| Path | Change |
|---|---|
| `src/app/(dashboard)/[tenant]/layout.tsx` | Mount `CommandPaletteProvider` + `CommandPalette` |
| `src/app/(dashboard)/[tenant]/dashboard/page.tsx` | Refactor into Suspense-wrapped async sub-components |
| `src/app/(dashboard)/[tenant]/analytics/page.tsx` | Add Suspense boundaries per section |
| `src/app/(dashboard)/[tenant]/appointments/page.tsx` | Add `q` + `sort` + `dir` searchParams; pass to `getAppointments` |
| `src/app/(dashboard)/[tenant]/customers/page.tsx` | Add `sort` + `dir` searchParams |
| `src/lib/appointments-queries.ts` | Add text search OR clause; add `orderBy` from sort params |
| `src/lib/customers-queries.ts` | Add `orderBy` from sort params |
| `src/components/appointments/appointments-filters.tsx` | Add text search input + sort dropdown |
| `src/components/appointments/appointments-table.tsx` | Migrate to shadcn `Table` |
| `src/components/customers/customers-table.tsx` | Migrate to shadcn `Table` |
| `src/components/dashboard/upcoming-appointments.tsx` | Migrate to shadcn `Table`; use `APPOINTMENT_STATUS_CONFIG` |
| `src/components/dashboard/sidebar.tsx` | Remove `_workspaces` stub; add icon-only collapse at <768px; add skip link |
| `src/components/appointments/appointment-status-badge.tsx` | Import from `src/lib/appointment-status.ts` |
| `src/components/inbox/inbox-client.tsx` | Wire `ConversationFilters`; apply filter before render |
| `src/components/settings/team-members-panel.tsx` | Use `TableSkeleton` for loading row |
| `src/app/globals.css` | Fix or remove `--navbar-height`; ensure focus-visible styles |
| `package.json` | Remove `@tanstack/react-query` if confirmed unused after pass |

---

## Out of Scope for Phase 3B

- n8n, Evolution API, WhatsApp integration
- Backend schema changes
- Dark mode / theme switching (next-themes installed, deferred)
- Global command palette quick actions (Create Customer, Create Appointment) — architecture supports it, implementation deferred to Phase 4+
- Full mobile layout (hamburger menu, bottom nav) — mobile-aware fixes only
- Cursor-based infinite scroll — load-more pattern retained
- Numbered pagination — load-more pattern retained
- `@tanstack/react-query` useQuery adoption — server component architecture retained
- AuditLog entries for UI actions — deferred per Phase 2 spec

---

## Verification

After implementation, verify end-to-end:

1. **Loading states** — throttle network in devtools to "Slow 3G"; each page should show layout-accurate skeletons before content appears
2. **Error states** — temporarily throw in a query function; confirm `error.tsx` renders without stack trace; confirm "Try again" recovers
3. **Command palette** — `⌘K` / `Ctrl+K` opens; search "maria" returns customer result; select navigates; `Escape` closes and focus returns to prior element
4. **Inbox filters** — load Inbox with seeded data; switch to "Open" tab — only OPEN conversations shown with correct count; "Escalated" shows none (if none exist); AI Handled toggle works
5. **Appointments sorting** — sort by "Customer name A→Z"; verify URL has `sort=customer&dir=asc`; verify table order matches
6. **Appointments search** — search "Emma"; confirm Emma Thompson's appointment appears; search by service name "Consultation"
7. **Responsive** — resize to 768px; sidebar collapses to icon-only; Inbox right panel hides; tables scroll horizontally
8. **Accessibility** — tab through Appointments page; every interactive element receives visible focus ring; no keyboard traps
9. **Performance** — open Appointments create slide-over; confirm customer search is async (no 100-customer prefetch in network tab)
