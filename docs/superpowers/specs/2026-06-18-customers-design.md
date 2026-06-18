# Customers Feature — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Scope:** Customer list with inline editing + create slide-over. Full customer detail page with edit form, appointment history, conversation history, and activity timeline.

---

## Goal

Replace the `/{slug}/customers` stub with a fully functional customers section. Users can search and browse customers, inline-edit names and tags, create new customers via a slide-over, and click through to a dedicated detail page showing contact info, edit form, appointment history, conversation history, and a merged activity timeline.

---

## Architecture

**Pattern:** Server pages + Client islands, no API routes.

- `/{slug}/customers` — Server Component. Reads `search` and `page` from `searchParams`. Fetches paginated customer list from Prisma. Renders `CustomersClient` with pre-fetched data.
- `CustomersClient` — Client Component. Owns slide-over open/close state and inline-edit state. Search input pushes `?search=` param via `router.replace`. "New customer" button opens the create slide-over.
- `/{slug}/customers/[id]` — Server Component. Parallel-fetches customer detail + appointments + conversations. Renders detail sections.
- All mutations via Server Actions in `src/lib/actions/customers.ts`. Each action calls `revalidatePath`.

---

## Data Layer

### `src/lib/customers-queries.ts`

| Function | Returns | Notes |
|---|---|---|
| `getCustomers(tenantId, filters)` | Paginated list (20/page, cumulative) | `search` filters name/email/phone via case-insensitive contains. Fields: id, name, email, phone, tags, createdAt, lastSeenAt, `_count: { appointments: true }` |
| `getCustomerDetail(tenantId, id)` | Full customer or null | All fields: id, name, email, phone, avatarUrl, notes, tags, source, createdAt, lastSeenAt |
| `getCustomerAppointments(tenantId, customerId)` | Last 20 appointments | id, startAt, endAt, status, service.{name}, teamMember.{name} — ordered startAt desc |
| `getCustomerConversations(tenantId, customerId)` | Last 20 conversations | id, channel, status, createdAt — ordered createdAt desc |

All functions scope to `tenantId` and filter `deletedAt: null`. Cumulative pagination: `take = page * 20`, `hasMore = total > take`.

### `src/lib/actions/customers.ts`

| Action | Inputs | Effect |
|---|---|---|
| `createCustomer(tenantId, slug, data)` | name, email?, phone?, notes?, tags? | Creates customer, revalidates `/{slug}/customers` |
| `updateCustomer(tenantId, slug, id, data)` | name?, email?, phone?, notes?, tags?, source? | Updates customer, revalidates list + detail |
| `deleteCustomer(tenantId, slug, id)` | — | Sets `deletedAt = now()`, revalidates list |

All actions return `{ success: boolean; error?: string }`. Unique constraint violations (email/phone) are caught and surfaced as human-readable error messages. `deleteCustomer` verifies tenant ownership before mutating.

---

## UI Components

```
src/components/customers/
├── customers-client.tsx            # Client — search, slide-over state, inline-edit state
├── customers-table.tsx             # Client — rows with inline name/tag editing, delete
├── customer-create-slide-over.tsx  # Client — create form (name, email, phone, notes, tags)
├── customer-avatar.tsx             # Server — initials avatar with optional avatarUrl fallback
└── detail/
    ├── customer-header.tsx         # Client — name, avatar, tags, delete button
    ├── customer-edit-form.tsx      # Client — email, phone, notes, source with inline save
    ├── customer-appointments.tsx   # Server — appointment history table
    ├── customer-conversations.tsx  # Server — conversation history list
    └── customer-activity.tsx       # Client — merged chronological timeline

src/app/(dashboard)/[tenant]/customers/
├── page.tsx                        # Server — list page
└── [id]/
    └── page.tsx                    # Server — detail page
```

### List Page Layout

Top bar: search input (left) + "New customer" button (right).
Below: `CustomersTable`.

**CustomersTable columns:** Avatar · Name (inline-editable) · Email · Phone · Tags (inline-editable chips) · Last seen · Appts · (delete action)

- Clicking a row navigates to `/{slug}/customers/{id}`.
- Name is editable inline: click to activate input, save on blur or Enter, revert on Escape or action failure.
- Tags render as chips; clicking "+" opens a small popover to add/remove tags. Saves immediately on change.
- Delete shows a confirmation dialog before firing `deleteCustomer`.
- Empty state: user icon + "No customers found" + "Add your first customer" CTA (if no search term), or "No customers match your search" + "Clear search" link (if search active).
- "Load more" button at bottom when `hasMore`.

### CustomerCreateSlideOver

Right-anchored panel, 480px wide. Fields: Name (required), Email, Phone, Notes, Tags. Footer: "Create customer" primary button. Inline error banner on failure. Toast on success. Closes on success, Escape, or backdrop click.

### Detail Page Layout

Back link → `/{slug}/customers` at top.

**Left column (1/3 width):**
- `CustomerHeader`: avatar, name (large), tags as chips, "Delete customer" danger button (with confirmation).
- `CustomerEditForm`: email, phone, notes, source fields. Single "Save changes" button. Inline error banner on failure.

**Right column (2/3 width):**
- `CustomerActivity`: merged timeline, appointments and conversations interleaved by date descending. Each entry: type icon, date, one-line summary. "No activity yet" empty state.
- `CustomerAppointments`: table of last 20 appointments. Columns: Service · Staff · Date · Status. Each row links to open the appointment (navigates to `/{slug}/appointments?highlight={id}` — the appointments page handles highlighting, out of scope here; row just links there). "No appointments yet" empty state.
- `CustomerConversations`: list of last 20 conversations. Each item: channel icon, status badge, date. "No conversations yet" empty state.

---

## Error Handling & Edge Cases

- **Duplicate email/phone:** Prisma unique constraint → action returns `{ success: false, error: "A customer with this email already exists" }`. Shown as inline error in create slide-over or edit form.
- **Customer not found:** `getCustomerDetail` returns null → detail page calls `redirect(`/${slug}/customers`)`.
- **Soft delete:** All queries filter `deletedAt: null`. Delete sets `deletedAt`, does not hard-delete.
- **Delete confirmation:** Both list-row delete and detail-page delete require a confirmation dialog ("Delete [name]? This cannot be undone.") before firing the action.
- **Inline edit failure:** Field reverts to previous value; `toast.error` shown.
- **Inline edit optimistic:** Name/tags update immediately in UI; revert on failure.
- **Activity timeline:** Merges `getCustomerAppointments` + `getCustomerConversations` results in the Client Component by sorting all entries by date descending. No additional fetch required.
- **Empty history sections:** Show "No appointments yet" / "No conversations yet" / "No activity yet" — sections always visible, never hidden.

---

## File Map

### Created

```
src/
├── lib/
│   ├── customers-queries.ts
│   └── actions/
│       └── customers.ts
├── components/
│   └── customers/
│       ├── customers-client.tsx
│       ├── customers-table.tsx
│       ├── customer-create-slide-over.tsx
│       ├── customer-avatar.tsx
│       └── detail/
│           ├── customer-header.tsx
│           ├── customer-edit-form.tsx
│           ├── customer-appointments.tsx
│           ├── customer-conversations.tsx
│           └── customer-activity.tsx
└── app/(dashboard)/[tenant]/customers/
    ├── page.tsx
    └── [id]/
        └── page.tsx
```

### Modified

None.

---

## Out of Scope

- Customer creation from within the appointments slide-over (already excluded there)
- Bulk actions (merge duplicates, bulk delete, bulk tag)
- CSV import/export
- Customer-facing portal
- Conversation message thread view (belongs to Inbox feature)
- Appointment row linking to open appointment slide-over (link goes to appointments page, highlighting is out of scope)
