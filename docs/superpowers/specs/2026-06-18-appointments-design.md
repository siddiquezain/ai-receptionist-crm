# Appointments Feature — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Scope:** List view with slide-over detail/edit/create. Calendar view is out of scope (separate plan).

---

## Goal

Replace the `/{slug}/appointments` stub with a fully functional appointments list page. Users can filter appointments by status, date range, and staff member; click any row to open a slide-over with full detail; edit all appointment fields; change status; and create new appointments.

---

## Architecture

**Pattern:** Server page + Client slide-over, no API routes.

- `src/app/(dashboard)/[tenant]/appointments/page.tsx` — Server Component. Reads `status`, `date`, `staffId`, and `page` from `searchParams`. Fetches appointments and filter options from Prisma. Renders `AppointmentsClient` with pre-fetched data.
- `AppointmentsClient` — Client Component wrapper that owns slide-over open/close state. Receives the list data and filter options as props.
- Mutations are **Server Actions** (`src/lib/actions/appointments.ts`). Each action writes to the DB and calls `revalidatePath(`/[tenant]/appointments`)` to refresh the list.
- Filter changes call `router.push` with updated search params, triggering a server re-render with fresh data.

---

## Data Layer

### `src/lib/appointments-queries.ts`

| Function | Returns | Notes |
|---|---|---|
| `getAppointments(tenantId, filters)` | Paginated list (20/page) | Filterable by status, date range, staffId. Fields: id, startAt, endAt, status, customer.name, service.{name, duration}, teamMember.name |
| `getAppointmentDetail(tenantId, appointmentId)` | Full appointment | Adds notes, bookedVia, confirmedAt, cancelledAt, cancellationReason, customer.{email, phone}, conversationId |
| `getStaffOptions(tenantId)` | `{ id, name }[]` | Active team members only (`isActive: true, deletedAt: null`) |
| `getServiceOptions(tenantId)` | `{ id, name, duration }[]` | Active services only (`isActive: true, deletedAt: null`) |

All functions are scoped to `tenantId`. No auth logic — that's the layout's job.

### `src/lib/actions/appointments.ts`

| Action | Inputs | Effect |
|---|---|---|
| `updateAppointment(id, data)` | startAt, endAt, serviceId, teamMemberId, notes, status | Updates appointment, revalidates list |
| `createAppointment(tenantId, data)` | customerId, serviceId, teamMemberId, startAt, endAt, notes | Creates appointment with status PENDING, revalidates list |
| `updateAppointmentStatus(id, status)` | AppointmentStatus | Quick status change, revalidates list |

All actions validate that the appointment belongs to the requesting tenant before mutating. Return `{ success: boolean; error?: string }`.

---

## UI Components

```
src/components/appointments/
├── appointments-client.tsx       # Client — owns selectedId state, slide-over open/close
├── appointments-filters.tsx      # Client — status tabs, date range picker, staff dropdown
├── appointments-table.tsx        # Server — table rows, receives onRowClick from client
├── appointment-slide-over.tsx    # Client — full detail/edit/create panel (~480px wide)
└── appointment-status-badge.tsx  # Server — reusable status pill
```

### Page layout

Top bar: page title "Appointments" left, "New appointment" button right.
Below: `AppointmentsFilters` (status tabs + date picker + staff dropdown).
Below: `AppointmentsTable` (list of rows, 20 per page, "Load more" at bottom).

### `AppointmentsFilters`

- **Status tabs:** All · Pending · Confirmed · Completed · Cancelled (push `?status=` param)
- **Date picker:** Defaults to current week (Mon–Sun). Single date range input. Pushes `?from=&to=` params.
- **Staff dropdown:** "All staff" default. Pushes `?staffId=` param.
- Filter changes reset `?page=` to 1.

### `AppointmentsTable`

Columns: Customer · Service · Staff · Date & Time · Status · (empty action column)

- Clicking any row opens the slide-over for that appointment.
- Empty state: calendar icon + "No appointments match your filters" + "Create appointment" CTA button.
- "Load more" button at the bottom appends next page (`?page=N`) — not full navigation.

### `AppointmentSlideOver`

Right-anchored panel, 480px wide, animated slide-in. Closes on Escape or backdrop click.

**View/Edit mode** (existing appointment):
- Header: customer name (read-only) + status badge
- Fields: Service selector, Staff selector, Date picker, Start time, End time, Notes textarea, Status selector
- Footer: "Save changes" primary button + "Cancel appointment" danger button (only shown when status allows cancellation)
- Inline error banner below header on Server Action failure

**Create mode** (new appointment):
- Header: "New appointment"
- Fields: Customer search (typeahead against existing customers), Service selector, Staff selector, Date picker, Start time, End time, Notes textarea
- Footer: "Create appointment" primary button
- On success: closes slide-over, list refreshes via `revalidatePath`

---

## Status Badge Colors

| Status | Style |
|---|---|
| PENDING | warning background, warning text |
| CONFIRMED | success background, success text |
| RESCHEDULED | warning background, warning text |
| CANCELLED | danger background, danger text |
| NO_SHOW | danger background, danger text |
| COMPLETED | muted background, muted text |

(Extracted from `upcoming-appointments.tsx` into standalone `AppointmentStatusBadge`.)

---

## Error Handling & Edge Cases

- **Server Action failure:** Slide-over shows inline error banner. List is not affected. User can retry.
- **Optimistic status update:** Status badge updates immediately on quick-change click; reverts on failure.
- **Appointment not found:** `getAppointmentDetail` returns null → slide-over shows "Appointment not found", auto-closes after 2s.
- **Validation:** `endAt > startAt` enforced client-side (disable Save button) and server-side (action returns error).
- **Empty list:** Shows empty state illustration, not an error.
- **Pagination:** "Load more" is additive — does not reset scroll position.

---

## File Map

### Created

```
src/
├── lib/
│   ├── appointments-queries.ts
│   └── actions/
│       └── appointments.ts
├── components/
│   └── appointments/
│       ├── appointments-client.tsx
│       ├── appointments-filters.tsx
│       ├── appointments-table.tsx
│       ├── appointment-slide-over.tsx
│       └── appointment-status-badge.tsx
└── app/(dashboard)/[tenant]/appointments/
    └── page.tsx
```

### Modified

None — dashboard components are untouched. `AppointmentStatusBadge` is new; the existing status map in `upcoming-appointments.tsx` stays as-is for now.

---

## Out of Scope

- Calendar view (separate plan)
- Recurring appointments
- SMS/email confirmation sending
- Customer creation from within the slide-over (must select existing customer)
- Bulk actions
