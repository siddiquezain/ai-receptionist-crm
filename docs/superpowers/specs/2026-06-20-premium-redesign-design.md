# Premium Dashboard Redesign — Design Spec
**Date:** 2026-06-20  
**Scope:** Full UI redesign of Appointment SaaS Dashboard  
**Aesthetic Target:** Linear, Stripe, Vercel, Attio, Cal.com  
**Constraint:** No business logic changes. No new dependencies unless essential. Preserve all routes and component file structure.

---

## 1. Design Principles

- **Information density over decoration.** Every pixel earns its place.
- **Consistency before creativity.** One answer to every repeating pattern.
- **Motion earns trust.** Transitions are 150–200ms, easing `ease-out`. Nothing bounces.
- **Hierarchy through weight, not size alone.** Font weight and color contrast carry hierarchy.

---

## 2. Design Tokens — `globals.css`

Replace existing CSS variables with a tighter, more deliberate token set. All spacing, color, radius, and shadow values flow from these tokens.

### Color — Light Mode
```css
--background: #ffffff;
--surface: #fafafa;
--surface-raised: #ffffff;
--border: #e4e4e7;         /* zinc-200 */
--border-strong: #d4d4d8;  /* zinc-300 */

--text-primary: #09090b;   /* zinc-950 */
--text-secondary: #52525b; /* zinc-600 */
--text-muted: #a1a1aa;     /* zinc-400 */
--text-disabled: #d4d4d8;  /* zinc-300 */

--accent: #2563eb;          /* blue-600 */
--accent-hover: #1d4ed8;    /* blue-700 */
--accent-subtle: #eff6ff;   /* blue-50 */
--accent-subtle-border: #bfdbfe; /* blue-200 */

--success: #16a34a;         /* green-600 */
--success-subtle: #f0fdf4;  /* green-50 */
--success-subtle-border: #bbf7d0; /* green-200 */

--warning: #d97706;         /* amber-600 */
--warning-subtle: #fffbeb;  /* amber-50 */
--warning-subtle-border: #fde68a; /* amber-200 */

--danger: #dc2626;          /* red-600 */
--danger-subtle: #fef2f2;   /* red-50 */
--danger-subtle-border: #fecaca; /* red-200 */

--sidebar-bg: #fafafa;
--sidebar-border: #e4e4e7;
```

### Color — Dark Mode
```css
--background: #09090b;
--surface: #111113;
--surface-raised: #18181b;
--border: #27272a;
--border-strong: #3f3f46;

--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--text-muted: #52525b;
--text-disabled: #3f3f46;

--accent: #3b82f6;
--accent-hover: #60a5fa;
--accent-subtle: #172554;
--accent-subtle-border: #1e40af;

--success: #22c55e;
--success-subtle: #052e16;
--success-subtle-border: #166534;

--warning: #f59e0b;
--warning-subtle: #1c1400;
--warning-subtle-border: #92400e;

--danger: #ef4444;
--danger-subtle: #2d0808;
--danger-subtle-border: #991b1b;

--sidebar-bg: #111113;
--sidebar-border: #1c1c1f;
```

### Radius
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
```

### Shadow
```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
```

### Typography
```css
/* Scale: 11 / 12 / 13 / 14 / 16 / 18 / 24 / 30 / 36 */
--font-sans: 'Geist', system-ui, sans-serif;
--font-mono: 'Geist Mono', monospace;
```

Font weight conventions:
- `400` — body, secondary labels
- `500` — interactive elements, nav items, table headers
- `600` — page titles, card headers, primary values
- `700` — hero KPI numbers only

---

## 3. Spacing System

Strictly 8px base unit. Allowed values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

Page layout padding: `px-6 py-6` (24px).  
Card internal padding: `p-5` (20px).  
Section gaps: `gap-4` (16px) between cards, `gap-6` (24px) between sections.

---

## 4. Component System

### Buttons
Four variants, three sizes. No new variants.

| Variant | Use |
|---|---|
| `default` | Primary CTA (Create, Save, Submit) |
| `outline` | Secondary actions (Export, Filter) |
| `ghost` | Tertiary / icon-only actions |
| `destructive` | Delete, remove |

Sizes: `sm` (h-8), `default` (h-9), `lg` (h-10).  
All buttons: `font-medium`, `rounded-[var(--radius-md)]`, `transition-colors duration-150`.  
Loading state: spinner replaces leading icon, button disabled.

### Cards
```
border border-[var(--border)] bg-[var(--surface-raised)] 
rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-5
```
No colored card headers. Hierarchy via typography only.

### Badges / Status Pills
```
inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
```
Use `--*-subtle` background + `--*-subtle-border` border + `--*` text. No solid-fill badges.

Status map:
- `pending` → warning
- `confirmed` → success  
- `cancelled` → danger
- `completed` → muted (zinc)
- `no-show` → danger
- `rescheduled` → warning

### Tables
- `sticky` header row (`position: sticky; top: 0; z-index: 10; bg: var(--surface-raised)`)
- Row hover: `bg-[var(--surface)]` transition
- Row selection: checkbox column, selected row gets `bg-[var(--accent-subtle)]`
- Column headers: `text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide`
- Cell text: `text-sm text-[var(--text-primary)]`
- Pagination: previous/next buttons + page indicator, bottom of table
- Empty state: centered icon + heading + body + optional CTA
- Loading state: 5 skeleton rows, column-width-matched

### Form Inputs
```
h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border)] 
bg-[var(--surface-raised)] placeholder:text-[var(--text-muted)]
focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1
```
Error state: `border-[var(--danger)]` + red helper text below.  
Success state: `border-[var(--success)]`.

### Skeleton
`animate-pulse bg-[var(--border)] rounded-[var(--radius-md)]`

---

## 5. Navigation

### Sidebar
- Width: `w-[220px]` fixed, not collapsible (desktop). Mobile: Sheet drawer.
- Background: `var(--sidebar-bg)`, right border: `var(--sidebar-border)`.
- Sections: Workspace header (top), nav items (middle, flex-1), user menu (bottom).

**Workspace header:**
- Tenant logo (24×24 rounded) + tenant name (`font-semibold text-sm`) + plan badge (`text-[10px]`)
- Clicking opens tenant/workspace switcher popover (future feature stub kept)

**Nav items:**
- Height: `h-8`, padding: `px-3`, gap: `gap-2.5`
- Icon: `size-4`, color: `text-[var(--text-muted)]` inactive → `text-[var(--accent)]` active
- Label: `text-sm font-medium`
- Active state: `bg-[var(--accent-subtle)] text-[var(--accent)]`, left border accent `border-l-2 border-[var(--accent)]`
- Hover: `bg-[var(--surface)] text-[var(--text-primary)]`

**User menu (bottom):**
- Avatar (28px) + name + email in a button
- Dropdown: Profile, Theme toggle, Sign out

### Top bar (per-page header area)
Each page has a consistent top bar:
```
Page title (text-xl font-semibold) | Breadcrumb (text-sm text-muted) | Right slot (CTA buttons)
```
Border-bottom separates it from page content.

---

## 6. Pages

### Dashboard (`/[tenant]/dashboard`)
Layout: 2-column grid (3:1 ratio) at desktop, single column on mobile.

**Section 1 — KPI Row:** 4 stat cards in a row.  
Each card: metric name (text-xs muted uppercase) / value (text-2xl font-bold) / delta (colored +/- %) / sparkline (12px tall, accent color).

**Section 2 — Main content (left col):**
- Trend chart: 7-day bar chart (Recharts), clean axes, no grid lines, accent fill bars
- Upcoming appointments: compact table, max 5 rows, "View all" link

**Section 3 — Right column:**
- Inbox snapshot: conversation list items with status dot + preview + time
- Quick actions: 3 icon buttons (New appointment, New customer, Open inbox)

Empty/loading states for all sections.

### Appointments (`/[tenant]/appointments`)
**Filters bar:** Inline row — Search input (w-64) + Date range picker + Status multi-select + Staff select + "Clear filters" ghost button. Right-aligned: "New appointment" primary button.

**Table columns:** Status badge / Customer / Service / Staff / Date & Time / Duration / Actions (kebab menu)

Table features: sticky header, row hover, row selection (checkbox), sort on Date, pagination (20 rows/page), empty state ("No appointments found"), loading skeletons.

**Slide-over (create/edit):** Right-side sheet, width `max-w-md`. Form: Customer (combobox search), Service, Staff, Date picker, Time picker, Notes textarea. Footer: Cancel + Save buttons.

### Customers (`/[tenant]/customers`)
**Header:** Search input + "New customer" button.

**Table columns:** Avatar + Name / Email / Phone / Tags / Last seen / Appointments count / Actions.

Inline name editing kept. Tags: `+` button opens small popover with text input.

Row click → navigate to customer detail.

**Customer detail (`/[tenant]/customers/[id]`):**
- Full-width header: large avatar (48px) + name (text-2xl font-semibold) + metadata row (email, phone, last seen, created) + Edit / Delete buttons.
- Tabs: Overview | Appointments | Conversations | Activity
- Overview tab: edit form in a card, left 2/3 width
- Appointments tab: compact table same style as main appointments table
- Conversations tab: list of conversation threads with last message preview
- Activity tab: vertical timeline (dot + line) with action, description, timestamp

### Inbox (`/[tenant]/inbox`)
Three-column layout unchanged (conversation list | thread | right panel).

**Conversation list:** 280px wide. Search at top. Each item: Avatar + name + channel badge + last message preview (1 line, truncate) + relative time + unread dot. Active item: accent-subtle bg.

**Thread view:** Sticky header (customer name + status + assign button). Messages scrollable. Message bubbles: customer right/left per convention, max-w-[80%], rounded corners, time below. Message input: multiline, auto-grow to 5 rows max, AI draft suggestion as dismissible banner above input.

**Right panel:** 280px. Customer snapshot card (name, contact, next appointment). AI activity log (chronological list, monospace timestamps).

**Escalation banner:** Full-width amber banner below thread header, "Take over" button.

### Auth pages (`/login`, `/register`, `/forgot-password`)
Centered card layout (max-w-sm). Clean, no illustration.  
Logo + app name at top. Form fields. Primary submit button (full-width). Link to other auth pages.  
Remove any shadow-heavy card look. Light border, subtle shadow only.

---

## 7. UX Patterns

### Skeleton loading
All data-fetching pages show skeleton on first load. Skeletons match actual layout (same card sizes, column widths).

### Empty states
Every table and list has an empty state:
- Icon (24px, muted color)
- Heading (`text-sm font-semibold`)
- Body (`text-sm text-muted`)
- Optional CTA button

### Toast notifications
Use Sonner. Four types: success (green icon), error (red icon), info (blue icon), warning (amber icon). Bottom-right position. 4s auto-dismiss.

### Transitions
- Page navigation: none (Next.js default)
- Slide-overs: `transition-transform duration-200 ease-out`
- Dropdowns: `transition-opacity duration-150 ease-out`
- Button hover: `transition-colors duration-150`
- Skeleton shimmer: `animate-pulse`

### Focus states
All interactive elements: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2`

### Responsive breakpoints
- `< 768px` (mobile): sidebar collapses to Sheet drawer, single-column layouts, tables scroll horizontally
- `768–1024px` (tablet): sidebar visible, 2-col grids collapse to 1-col
- `> 1024px` (desktop): full layout

---

## 8. What Is NOT Changing

- All server actions and data fetching logic
- All route paths and page file locations
- Supabase Realtime subscriptions
- Auth flow and middleware
- Prisma schema and queries
- Multi-tenant logic
- Component file names and locations (only their JSX/styles change)
- All existing shadcn/ui component files in `components/ui/` (only consuming code changes)

---

## 9. Implementation Order

1. **Design tokens** — `globals.css` + `tailwind.config.*`
2. **Core primitives** — Button, Badge, Input, Card visual refresh
3. **Sidebar + nav**
4. **Dashboard page**
5. **Appointments page + slide-over**
6. **Customers list + detail**
7. **Inbox**
8. **Auth pages**
9. **Responsive pass**
10. **Accessibility pass** (focus states, ARIA, contrast check)
