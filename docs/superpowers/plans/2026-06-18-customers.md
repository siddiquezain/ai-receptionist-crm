# Customers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/{slug}/customers` list page with inline editing and a create slide-over, plus a `/{slug}/customers/[id]` detail page with edit form, appointment history, conversation history, and activity timeline.

**Architecture:** Server Component pages fetch data and pass it to Client islands. Search lives in URL params (`?search=`). All mutations go through Server Actions in `src/lib/actions/customers.ts` that call `revalidatePath`. No API routes.

**Tech Stack:** Next.js 16 App Router (params/searchParams are Promises — always `await` them), Prisma 7, Tailwind v4 CSS variables, `react-hook-form` + `zod`, `sonner` toasts, `@base-ui/react` (via `src/components/ui/` wrappers), lucide-react, `date-fns`.

---

## File Map

### Created by this plan

```
src/
├── lib/
│   ├── customers-queries.ts
│   └── actions/
│       └── customers.ts
├── components/
│   └── customers/
│       ├── customer-avatar.tsx
│       ├── customers-table.tsx
│       ├── customer-create-slide-over.tsx
│       ├── customers-client.tsx
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

## Task 1: Feature Branch + Query Functions

**Files:**
- Create: `src/lib/customers-queries.ts`

- [ ] **Step 1: Create the feature branch**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git checkout main && git pull
git checkout -b feat/customers
```

- [ ] **Step 2: Write customers-queries.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/customers-queries.ts`:

```typescript
import { AppointmentStatus, ConversationChannel, ConversationStatus } from "@prisma/client";
import { prisma } from "./prisma";

// ─── Exported types ───────────────────────────────────────────────────────────

export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  createdAt: Date;
  lastSeenAt: Date | null;
  _count: { appointments: number };
};

export type CustomerDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  notes: string | null;
  tags: string[];
  source: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type CustomerAppointmentItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  service: { name: string };
  teamMember: { name: string } | null;
};

export type CustomerConversationItem = {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  createdAt: Date;
};

export type CustomerFilters = {
  search?: string;
  page?: number;
};

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getCustomers(
  tenantId: string,
  filters: CustomerFilters = {}
): Promise<{ customers: CustomerListItem[]; hasMore: boolean }> {
  const { search, page = 1 } = filters;
  const take = page * 20;

  const where = {
    tenantId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, hasMore: total > take };
}

export async function getCustomerDetail(
  tenantId: string,
  id: string
): Promise<CustomerDetail | null> {
  return prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      notes: true,
      tags: true,
      source: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

export async function getCustomerAppointments(
  tenantId: string,
  customerId: string
): Promise<CustomerAppointmentItem[]> {
  return prisma.appointment.findMany({
    where: { tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      service: { select: { name: true } },
      teamMember: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
    take: 20,
  });
}

export async function getCustomerConversations(
  tenantId: string,
  customerId: string
): Promise<CustomerConversationItem[]> {
  return prisma.conversation.findMany({
    where: { tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      channel: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors. Fix any errors in this file only.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/lib/customers-queries.ts
git commit -m "feat: add customer query functions"
```

---

## Task 2: Server Actions

**Files:**
- Create: `src/lib/actions/customers.ts`

- [ ] **Step 1: Write customers.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/actions/customers.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionResult = { success: boolean; error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPrismaUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function uniqueErrorMessage(e: unknown): string {
  const target =
    typeof e === "object" &&
    e !== null &&
    "meta" in e &&
    typeof (e as { meta?: { target?: string[] } }).meta?.target !== "undefined"
      ? ((e as { meta: { target: string[] } }).meta.target ?? [])
      : [];
  if (target.includes("email")) return "A customer with this email already exists";
  if (target.includes("phone")) return "A customer with this phone number already exists";
  return "A customer with these details already exists";
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createCustomer(
  tenantId: string,
  slug: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<ActionResult> {
  try {
    await prisma.customer.create({
      data: {
        tenantId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        tags: data.tags ?? [],
      },
    });
    revalidatePath(`/${slug}/customers`);
    return { success: true };
  } catch (e: unknown) {
    if (isPrismaUniqueError(e)) return { success: false, error: uniqueErrorMessage(e) };
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(
  tenantId: string,
  slug: string,
  id: string,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    tags?: string[];
    source?: string | null;
  }
): Promise<ActionResult> {
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Customer not found" };

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.source !== undefined ? { source: data.source?.trim() || null } : {}),
      },
    });
    revalidatePath(`/${slug}/customers`);
    revalidatePath(`/${slug}/customers/${id}`);
    return { success: true };
  } catch (e: unknown) {
    if (isPrismaUniqueError(e)) return { success: false, error: uniqueErrorMessage(e) };
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(
  tenantId: string,
  slug: string,
  id: string
): Promise<ActionResult> {
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Customer not found" };

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath(`/${slug}/customers`);
  return { success: true };
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/lib/actions/customers.ts
git commit -m "feat: add customer server actions"
```

---

## Task 3: CustomerAvatar

**Files:**
- Create: `src/components/customers/customer-avatar.tsx`

- [ ] **Step 1: Write customer-avatar.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/customer-avatar.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface CustomerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-14 text-lg",
};

export function CustomerAvatar({
  name,
  avatarUrl,
  size = "md",
}: CustomerAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizes[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 font-semibold text-[var(--accent)]",
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/customer-avatar.tsx
git commit -m "feat: add CustomerAvatar component"
```

---

## Task 4: CustomersTable

**Files:**
- Create: `src/components/customers/customers-table.tsx`

This Client Component renders the list table with:
- Inline name editing (click → input → blur/Enter to save, Escape to cancel)
- Inline tag chips (× to remove, "+" to add via small input, saves immediately)
- Delete with inline confirmation ("Are you sure?" replaces delete button)
- Row click navigates to detail page

- [ ] **Step 1: Write customers-table.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/customers-table.tsx`:

```tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerAvatar } from "./customer-avatar";
import { updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { timeAgo } from "@/lib/utils";
import type { CustomerListItem } from "@/lib/customers-queries";

interface CustomersTableProps {
  customers: CustomerListItem[];
  hasMore: boolean;
  tenantId: string;
  tenantSlug: string;
  onLoadMore: () => void;
  onCreateClick: () => void;
  searchActive: boolean;
  onClearSearch: () => void;
}

export function CustomersTable({
  customers,
  hasMore,
  tenantId,
  tenantSlug,
  onLoadMore,
  onCreateClick,
  searchActive,
  onClearSearch,
}: CustomersTableProps) {
  const router = useRouter();

  // Inline name edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Tag add state
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ── Name inline edit ────────────────────────────────────────────────────────

  function startEditName(customer: CustomerListItem) {
    setEditingId(customer.id);
    setEditName(customer.name);
    setAddingTagId(null);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitEditName(customer: CustomerListItem) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === customer.name) {
      setEditingId(null);
      return;
    }
    setEditingId(null);
    const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
      name: trimmed,
    });
    if (!result.success) {
      toast.error(result.error ?? "Failed to update name");
    }
  }

  function handleNameKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    customer: CustomerListItem
  ) {
    if (e.key === "Enter") commitEditName(customer);
    if (e.key === "Escape") setEditingId(null);
  }

  // ── Tag editing ─────────────────────────────────────────────────────────────

  async function removeTag(customer: CustomerListItem, tag: string) {
    const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
      tags: customer.tags.filter((t) => t !== tag),
    });
    if (!result.success) toast.error(result.error ?? "Failed to remove tag");
  }

  async function addTag(customer: CustomerListItem) {
    const tag = newTag.trim();
    if (!tag || customer.tags.includes(tag)) {
      setAddingTagId(null);
      setNewTag("");
      return;
    }
    setAddingTagId(null);
    setNewTag("");
    const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
      tags: [...customer.tags, tag],
    });
    if (!result.success) toast.error(result.error ?? "Failed to add tag");
  }

  function handleTagKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    customer: CustomerListItem
  ) {
    if (e.key === "Enter") addTag(customer);
    if (e.key === "Escape") {
      setAddingTagId(null);
      setNewTag("");
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleting(true);
    const result = await deleteCustomer(tenantId, tenantSlug, id);
    setDeleting(false);
    setConfirmDeleteId(null);
    if (!result.success) toast.error(result.error ?? "Failed to delete customer");
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] py-16">
        <Users className="size-10 text-[var(--border)]" />
        {searchActive ? (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              No customers match your search
            </p>
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              Clear search
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              No customers yet
            </p>
            <Button variant="outline" size="sm" onClick={onCreateClick}>
              Add your first customer
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["", "Name", "Email", "Phone", "Tags", "Last seen", "Appts", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
              >
                {/* Avatar */}
                <td
                  className="cursor-pointer px-3 py-2.5"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                >
                  <CustomerAvatar
                    name={customer.name}
                    size="sm"
                  />
                </td>

                {/* Name — inline editable */}
                <td className="px-3 py-2.5">
                  {editingId === customer.id ? (
                    <Input
                      ref={nameInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitEditName(customer)}
                      onKeyDown={(e) => handleNameKeyDown(e, customer)}
                      className="h-7 w-36 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      className="text-left text-sm font-medium text-[var(--text-primary)] hover:underline"
                      onClick={() => startEditName(customer)}
                    >
                      {customer.name}
                    </button>
                  )}
                </td>

                {/* Email */}
                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                >
                  {customer.email ?? "—"}
                </td>

                {/* Phone */}
                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                >
                  {customer.phone ?? "—"}
                </td>

                {/* Tags — inline editable */}
                <td
                  className="px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap items-center gap-1">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(customer, tag)}
                          className="ml-0.5 text-[var(--accent)]/60 hover:text-[var(--accent)]"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}
                    {addingTagId === customer.id ? (
                      <Input
                        ref={tagInputRef}
                        autoFocus
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={() => addTag(customer)}
                        onKeyDown={(e) => handleTagKeyDown(e, customer)}
                        placeholder="tag name"
                        className="h-5 w-20 px-1.5 text-xs"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setAddingTagId(customer.id);
                          setNewTag("");
                          setTimeout(() => tagInputRef.current?.focus(), 0);
                        }}
                        className="flex size-4 items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        aria-label="Add tag"
                      >
                        <Plus className="size-2.5" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Last seen */}
                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                >
                  {customer.lastSeenAt ? timeAgo(customer.lastSeenAt) : "—"}
                </td>

                {/* Appointment count */}
                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                >
                  {customer._count.appointments}
                </td>

                {/* Delete / Confirm */}
                <td
                  className="px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirmDeleteId === customer.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        Delete?
                      </span>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={deleting}
                        onClick={() => handleDelete(customer.id)}
                      >
                        Yes
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(customer.id)}
                      aria-label="Delete customer"
                    >
                      <Trash2 className="size-3.5 text-[var(--text-muted)]" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-[var(--border)] px-4 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/customers-table.tsx
git commit -m "feat: add CustomersTable with inline editing"
```

---

## Task 5: CustomerCreateSlideOver

**Files:**
- Create: `src/components/customers/customer-create-slide-over.tsx`

Right-anchored 480px slide-over. Fields: Name (required), Email, Phone, Notes, Tags (comma-separated input, split on save). Footer: "Create customer" primary button. Inline error banner on failure. Toast + close on success.

- [ ] **Step 1: Write customer-create-slide-over.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/customer-create-slide-over.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer } from "@/lib/actions/customers";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // comma-separated, split on submit
});

type FormData = z.infer<typeof schema>;

interface CustomerCreateSlideOverProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerCreateSlideOver({
  open,
  onClose,
  tenantId,
  tenantSlug,
}: CustomerCreateSlideOverProps) {
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", notes: "", tags: "" },
  });

  function handleOpenChange(o: boolean) {
    if (!o) {
      form.reset();
      setErrorBanner(null);
      onClose();
    }
  }

  async function onSubmit(data: FormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      const tags = data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const result = await createCustomer(tenantId, tenantSlug, {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
        tags,
      });

      if (!result.success) {
        setErrorBanner(result.error ?? "Failed to create customer");
        return;
      }

      toast.success("Customer created");
      form.reset();
      onClose();
    } catch {
      setErrorBanner("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-[var(--border)] px-5 py-4">
          <SheetTitle className="text-base font-semibold text-[var(--text-primary)]">
            New customer
          </SheetTitle>
        </SheetHeader>

        {errorBanner && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorBanner}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <label
                htmlFor="create-name"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Name *
              </label>
              <Input
                id="create-name"
                className="text-sm"
                placeholder="Jane Doe"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-[var(--danger)]">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-email"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Email
              </label>
              <Input
                id="create-email"
                type="email"
                className="text-sm"
                placeholder="jane@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-[var(--danger)]">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-phone"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Phone
              </label>
              <Input
                id="create-phone"
                type="tel"
                className="text-sm"
                placeholder="+1 555 000 0000"
                {...form.register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-tags"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Tags
              </label>
              <Input
                id="create-tags"
                className="text-sm"
                placeholder="vip, loyal, referral (comma-separated)"
                {...form.register("tags")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-notes"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Notes
              </label>
              <Textarea
                id="create-notes"
                className="resize-none text-sm"
                rows={3}
                placeholder="Internal notes…"
                {...form.register("notes")}
              />
            </div>
          </div>

          <SheetFooter className="border-t border-[var(--border)] px-5 py-4">
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Create customer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/customer-create-slide-over.tsx
git commit -m "feat: add CustomerCreateSlideOver"
```

---

## Task 6: CustomersClient + List Page

**Files:**
- Create: `src/components/customers/customers-client.tsx`
- Create: `src/app/(dashboard)/[tenant]/customers/page.tsx`

`CustomersClient` owns the slide-over open/close state and wires search via `router.replace`. The list page is a Server Component that awaits params/searchParams, fetches data, and renders `CustomersClient`.

- [ ] **Step 1: Write customers-client.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/customers-client.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomersTable } from "./customers-table";
import { CustomerCreateSlideOver } from "./customer-create-slide-over";
import type { CustomerListItem } from "@/lib/customers-queries";

interface CustomersClientProps {
  customers: CustomerListItem[];
  hasMore: boolean;
  tenantId: string;
  tenantSlug: string;
  search: string;
}

export function CustomersClient({
  customers,
  hasMore,
  tenantId,
  tenantSlug,
  search,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

  function pushSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPage = parseInt(params.get("page") ?? "1", 10);
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Customers
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          placeholder="Search customers…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pushSearch(searchValue);
          }}
          onBlur={() => pushSearch(searchValue)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Table */}
      <CustomersTable
        customers={customers}
        hasMore={hasMore}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        onLoadMore={handleLoadMore}
        onCreateClick={() => setCreateOpen(true)}
        searchActive={!!search}
        onClearSearch={() => {
          setSearchValue("");
          pushSearch("");
        }}
      />

      {/* Create slide-over */}
      <CustomerCreateSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
      />
    </>
  );
}
```

- [ ] **Step 2: Write the list page**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/customers/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomers } from "@/lib/customers-queries";
import { CustomersClient } from "@/components/customers/customers-client";

export const metadata: Metadata = { title: "Customers" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const { customers, hasMore } = await getCustomers(tenant.id, {
    search,
    page,
  });

  return (
    <div className="space-y-4 p-6">
      <CustomersClient
        customers={customers}
        hasMore={hasMore}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        search={search ?? ""}
      />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/customers-client.tsx "src/app/(dashboard)/[tenant]/customers/page.tsx"
git commit -m "feat: add CustomersClient and customers list page"
```

---

## Task 7: CustomerHeader + CustomerEditForm

**Files:**
- Create: `src/components/customers/detail/customer-header.tsx`
- Create: `src/components/customers/detail/customer-edit-form.tsx`

`CustomerHeader` shows the avatar, name (large), tags as chips, and a "Delete customer" button with confirmation dialog. `CustomerEditForm` handles email, phone, notes, source with a single "Save changes" button.

- [ ] **Step 1: Write customer-header.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/detail/customer-header.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomerAvatar } from "../customer-avatar";
import { deleteCustomer } from "@/lib/actions/customers";
import { timeAgo } from "@/lib/utils";
import type { CustomerDetail } from "@/lib/customers-queries";

interface CustomerHeaderProps {
  customer: CustomerDetail;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerHeader({
  customer,
  tenantId,
  tenantSlug,
}: CustomerHeaderProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteCustomer(tenantId, tenantSlug, customer.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete customer");
        return;
      }
      toast.success("Customer deleted");
      router.push(`/${tenantSlug}/customers`);
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <CustomerAvatar
          name={customer.name}
          avatarUrl={customer.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {customer.name}
          </h1>
          {customer.lastSeenAt && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Last seen {timeAgo(customer.lastSeenAt)}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" />
        Delete customer
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {customer.name}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. All associated data will be retained but
              this customer will be removed from all lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Write customer-edit-form.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/detail/customer-edit-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCustomer } from "@/lib/actions/customers";
import type { CustomerDetail } from "@/lib/customers-queries";

const schema = z.object({
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerEditFormProps {
  customer: CustomerDetail;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerEditForm({
  customer,
  tenantId,
  tenantSlug,
}: CustomerEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
      source: customer.source ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        source: data.source || null,
      });
      if (!result.success) {
        setErrorBanner(result.error ?? "Failed to save changes");
        return;
      }
      toast.success("Changes saved");
    } catch {
      setErrorBanner("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {errorBanner && (
        <div
          role="alert"
          className="rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          {errorBanner}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="edit-email"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Email
        </label>
        <Input
          id="edit-email"
          type="email"
          className="text-sm"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-[var(--danger)]">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-phone"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Phone
        </label>
        <Input
          id="edit-phone"
          type="tel"
          className="text-sm"
          {...form.register("phone")}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-source"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Source
        </label>
        <Input
          id="edit-source"
          className="text-sm"
          placeholder="e.g. referral, google, walk-in"
          {...form.register("source")}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-notes"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Notes
        </label>
        <Textarea
          id="edit-notes"
          className="resize-none text-sm"
          rows={4}
          {...form.register("notes")}
        />
      </div>

      <Button type="submit" size="sm" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/detail/customer-header.tsx src/components/customers/detail/customer-edit-form.tsx
git commit -m "feat: add CustomerHeader and CustomerEditForm"
```

---

## Task 8: CustomerAppointments + CustomerConversations

**Files:**
- Create: `src/components/customers/detail/customer-appointments.tsx`
- Create: `src/components/customers/detail/customer-conversations.tsx`

Both are Server Components (no `"use client"`) that receive pre-fetched data as props and render history tables/lists.

- [ ] **Step 1: Write customer-appointments.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/detail/customer-appointments.tsx`:

```tsx
import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import { formatDate } from "@/lib/utils";
import type { CustomerAppointmentItem } from "@/lib/customers-queries";

interface CustomerAppointmentsProps {
  appointments: CustomerAppointmentItem[];
  tenantSlug: string;
  timezone: string;
}

export function CustomerAppointments({
  appointments,
  tenantSlug,
  timezone,
}: CustomerAppointmentsProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Appointments
        </p>
      </div>

      {appointments.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No appointments yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Service", "Staff", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr
                  key={appt.id}
                  className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">
                    <Link
                      href={`/${tenantSlug}/appointments?highlight=${appt.id}`}
                      className="hover:underline"
                    >
                      {appt.service.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                    {appt.teamMember?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                    {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                  </td>
                  <td className="px-4 py-2.5">
                    <AppointmentStatusBadge status={appt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write customer-conversations.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/detail/customer-conversations.tsx`:

```tsx
import { MessageSquare } from "lucide-react";
import { ConversationChannel, ConversationStatus } from "@prisma/client";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CustomerConversationItem } from "@/lib/customers-queries";

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat",
  WHATSAPP: "WhatsApp",
};

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  ESCALATED: {
    label: "Escalated",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
};

interface CustomerConversationsProps {
  conversations: CustomerConversationItem[];
}

export function CustomerConversations({
  conversations,
}: CustomerConversationsProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Conversations
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No conversations yet
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {conversations.map((conv) => {
            const status = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.OPEN;
            return (
              <li
                key={conv.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <MessageSquare className="size-4 shrink-0 text-[var(--text-muted)]" />
                <div className="flex-1 text-sm text-[var(--text-primary)]">
                  {CHANNEL_LABEL[conv.channel] ?? conv.channel}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    status.className
                  )}
                >
                  {status.label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {timeAgo(conv.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/detail/customer-appointments.tsx src/components/customers/detail/customer-conversations.tsx
git commit -m "feat: add CustomerAppointments and CustomerConversations"
```

---

## Task 9: CustomerActivity

**Files:**
- Create: `src/components/customers/detail/customer-activity.tsx`

Client Component. Receives the already-fetched appointments and conversations arrays, merges them into a single chronological feed sorted by date descending, and renders each entry with a type icon and summary.

- [ ] **Step 1: Write customer-activity.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/customers/detail/customer-activity.tsx`:

```tsx
"use client";

import { Calendar, MessageSquare } from "lucide-react";
import { AppointmentStatus, ConversationChannel } from "@prisma/client";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  CustomerAppointmentItem,
  CustomerConversationItem,
} from "@/lib/customers-queries";

type ActivityEntry =
  | { type: "appointment"; date: Date; item: CustomerAppointmentItem }
  | { type: "conversation"; date: Date; item: CustomerConversationItem };

const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pending appointment",
  CONFIRMED: "Confirmed appointment",
  CANCELLED: "Cancelled appointment",
  COMPLETED: "Completed appointment",
  NO_SHOW: "No-show appointment",
  RESCHEDULED: "Rescheduled appointment",
};

const CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WEB_CHAT: "Web Chat conversation",
  WHATSAPP: "WhatsApp conversation",
};

interface CustomerActivityProps {
  appointments: CustomerAppointmentItem[];
  conversations: CustomerConversationItem[];
}

export function CustomerActivity({
  appointments,
  conversations,
}: CustomerActivityProps) {
  const entries: ActivityEntry[] = [
    ...appointments.map((item) => ({
      type: "appointment" as const,
      date: item.startAt,
      item,
    })),
    ...conversations.map((item) => ({
      type: "conversation" as const,
      date: item.createdAt,
      item,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Activity
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No activity yet
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  entry.type === "appointment"
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-[var(--success)]/10 text-[var(--success)]"
                )}
              >
                {entry.type === "appointment" ? (
                  <Calendar className="size-3" />
                ) : (
                  <MessageSquare className="size-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">
                  {entry.type === "appointment"
                    ? `${APPT_STATUS_LABEL[entry.item.status]} — ${entry.item.service.name}`
                    : CHANNEL_LABEL[entry.item.channel] ?? entry.item.channel}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {timeAgo(entry.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add src/components/customers/detail/customer-activity.tsx
git commit -m "feat: add CustomerActivity timeline"
```

---

## Task 10: Customer Detail Page

**Files:**
- Create: `src/app/(dashboard)/[tenant]/customers/[id]/page.tsx`

Server Component. Awaits params, resolves tenant, parallel-fetches customer detail + appointments + conversations. Redirects if customer not found. Renders a two-column layout: left = header + edit form, right = activity + appointments + conversations.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/customers/[id]"
```

- [ ] **Step 2: Write [id]/page.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/customers/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  getCustomerDetail,
  getCustomerAppointments,
  getCustomerConversations,
} from "@/lib/customers-queries";
import { CustomerHeader } from "@/components/customers/detail/customer-header";
import { CustomerEditForm } from "@/components/customers/detail/customer-edit-form";
import { CustomerAppointments } from "@/components/customers/detail/customer-appointments";
import { CustomerConversations } from "@/components/customers/detail/customer-conversations";
import { CustomerActivity } from "@/components/customers/detail/customer-activity";

export const metadata: Metadata = { title: "Customer" };

interface Props {
  params: Promise<{ tenant: string; id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { tenant: slug, id } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  const [customer, appointments, conversations] = await Promise.all([
    getCustomerDetail(tenant.id, id),
    getCustomerAppointments(tenant.id, id),
    getCustomerConversations(tenant.id, id),
  ]);

  if (!customer) redirect(`/${slug}/customers`);

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href={`/${slug}/customers`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="size-3.5" />
        Customers
      </Link>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left column — 1/3 */}
        <div className="w-1/3 shrink-0 space-y-6">
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <CustomerHeader
              customer={customer}
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
            />
          </div>
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Contact details
            </p>
            <CustomerEditForm
              customer={customer}
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
            />
          </div>
        </div>

        {/* Right column — 2/3 */}
        <div className="flex-1 min-w-0 space-y-6">
          <CustomerActivity
            appointments={appointments}
            conversations={conversations}
          />
          <CustomerAppointments
            appointments={appointments}
            tenantSlug={tenant.slug}
            timezone={tenant.timezone}
          />
          <CustomerConversations conversations={conversations} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard"
git add "src/app/(dashboard)/[tenant]/customers/[id]/page.tsx"
git commit -m "feat: add customer detail page"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npm run dev > /tmp/nextdev-customers.log 2>&1 &
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
echo ""
pkill -f "next dev" 2>/dev/null || true
```

Expected: `200`. If not, check `/tmp/nextdev-customers.log`.

- [ ] **Step 3: Commit any remaining changes**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git status --short
```

Only commit if there are changes:
```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add -A && git commit -m "chore: customers feature complete" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| `/{slug}/customers` list page | Task 6 |
| Search by name/email/phone (URL param) | Tasks 1, 6 |
| Cumulative pagination + Load more | Tasks 1, 6 |
| Inline name editing (blur/Enter save, Escape cancel) | Task 4 |
| Inline tag chips (remove ×, add + input) | Task 4 |
| Delete customer with confirmation from list | Task 4 |
| "New customer" button → create slide-over | Tasks 5, 6 |
| Create slide-over: name, email, phone, notes, tags | Task 5 |
| Unique constraint error surfaced to user | Tasks 2, 5, 7 |
| `/{slug}/customers/[id]` detail page | Task 10 |
| Customer not found → redirect | Task 10 |
| Detail: avatar, name, tags, delete with dialog | Task 7 |
| Detail: edit form (email, phone, notes, source) | Task 7 |
| Detail: appointment history table | Task 8 |
| Detail: conversation history list | Task 8 |
| Detail: merged activity timeline | Task 9 |
| Soft delete (deletedAt, not hard delete) | Task 2 |
| All queries scoped to tenantId + deletedAt: null | Task 1 |
| Server Actions with revalidatePath | Task 2 |
| Back link on detail page | Task 10 |
