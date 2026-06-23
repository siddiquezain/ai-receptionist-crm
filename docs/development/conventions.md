# Conventions

Specific patterns used throughout the codebase. Read this before adding new features.

---

## Server Actions Pattern

All mutations go through Server Actions in `src/lib/actions/`.

**Template:**

```typescript
// src/lib/actions/example.ts
"use server";

import { requireAuth, requireTenantAccess } from "@/lib/server-auth";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exampleSchema } from "@/validators/example";

export async function createExample(tenantSlug: string, input: ExampleInput) {
  const { prismaUser } = await requireAuth();
  const { tenantId, role } = await requireTenantAccess(tenantSlug);
  requirePermission(role, "resource.action");

  const parsed = exampleSchema.parse(input);

  const result = await prisma.example.create({
    data: { ...parsed, tenantId },
  });

  logAudit({
    tenantId,
    actorId: prismaUser.id,
    actorType: "USER",
    action: "example.created",
    resource: "Example",
    resourceId: result.id,
  });

  revalidatePath(`/${tenantSlug}/section`);
  return result;
}
```

**Key rules:**
- Auth guards are always lines 1–3 of the function body
- Never skip `requireTenantAccess` — this is what prevents cross-tenant access
- Soft delete: `prisma.model.update({ data: { deletedAt: new Date() } })` not `.delete()`
- `logAudit()` is never awaited — it's fire-and-forget

---

## Query Functions Pattern

Read operations live in `src/lib/*-queries.ts`. These are plain async functions called from Server Components or as TanStack Query fetchers.

```typescript
// src/lib/appointments-queries.ts
import { prisma } from "@/lib/prisma";

export async function listAppointments(tenantId: string, filters?: AppointmentFilters) {
  return prisma.appointment.findMany({
    where: {
      tenantId,                    // Always scope to tenant
      // deletedAt: null is automatic via Prisma extension
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      customer: true,
      service: true,
      teamMember: true,
    },
    orderBy: { startAt: "desc" },
  });
}
```

**Key rules:**
- Query functions never mutate
- Always include `tenantId` in `where`
- No auth checks in query functions — caller is responsible
- Include related records in the same query (avoid N+1 — use `include`)

---

## Page → Client Component Pattern

Pages are Server Components that fetch data and pass it as props.

```typescript
// app/(dashboard)/[tenant]/appointments/page.tsx
import { requireAuth, requireTenantAccess } from "@/lib/server-auth";
import { listAppointments } from "@/lib/appointments-queries";
import { AppointmentsClient } from "@/components/appointments/appointments-client";

export default async function AppointmentsPage({ params }: { params: { tenant: string } }) {
  const { tenantId } = await requireTenantAccess(params.tenant);
  const appointments = await listAppointments(tenantId);

  return <AppointmentsClient appointments={appointments} tenantSlug={params.tenant} />;
}
```

```typescript
// components/appointments/appointments-client.tsx
"use client";

export function AppointmentsClient({ appointments, tenantSlug }) {
  const [filters, setFilters] = useState(...);
  // Interactivity here
}
```

---

## TanStack Query Pattern

Use TanStack Query for data that needs to stay fresh after mutations.

```typescript
// In a client component
const { data: appointments } = useQuery({
  queryKey: ["appointments", tenantSlug, filters],
  queryFn: () => fetchAppointments(tenantSlug, filters),
});

// After a mutation, invalidate:
const queryClient = useQueryClient();
await queryClient.invalidateQueries({ queryKey: ["appointments", tenantSlug] });
```

Seed initial data from the server (passed as `initialData` prop) to avoid loading states on first render.

---

## AI Provider Pattern

```typescript
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/crypto";

const settings = await prisma.aISettings.findUnique({ where: { tenantId } });
if (!settings) throw new Error("AI not configured");

// Decrypt BYOK key if set
if (settings.byokApiKey && isEncrypted(settings.byokApiKey)) {
  settings.byokApiKey = decrypt(settings.byokApiKey);
}

const provider = getAIProvider(settings);
const response = await provider.chat(messages, { temperature: settings.temperature });
```

---

## Soft Delete Pattern

```typescript
// WRONG — never do this:
await prisma.customer.delete({ where: { id } });

// CORRECT — soft delete:
await prisma.customer.update({
  where: { id, tenantId },  // Always scope to tenant
  data: { deletedAt: new Date() },
});
```

The Prisma extension in `src/lib/prisma.ts` automatically excludes soft-deleted records from all queries. You never need to add `deletedAt: null` to your where clauses.

---

## Audit Log Pattern

```typescript
import { logAudit } from "@/lib/audit";

// Always fire-and-forget — never await
logAudit({
  tenantId,
  actorId: prismaUser.id,       // Null for SYSTEM or AI actors
  actorType: "USER",             // "USER" | "SYSTEM" | "AI"
  action: "appointment.cancelled",
  resource: "Appointment",
  resourceId: appointment.id,
  changes: {                     // Optional — before/after snapshot
    before: { status: "CONFIRMED" },
    after: { status: "CANCELLED", cancelledAt, cancellationReason },
  },
});
```

---

## Form + Server Action Wiring

```typescript
// 1. Zod schema in src/validators/
export const appointmentSchema = z.object({
  serviceId: z.string().cuid(),
  startAt: z.coerce.date(),
  notes: z.string().optional(),
});

// 2. React Hook Form in client component
const form = useForm<z.infer<typeof appointmentSchema>>({
  resolver: zodResolver(appointmentSchema),
});

// 3. onSubmit calls the Server Action
async function onSubmit(values: z.infer<typeof appointmentSchema>) {
  const result = await createAppointment(tenantSlug, values);
  if (result.error) toast.error(result.error);
  else toast.success("Appointment created");
}
```

---

## Encryption Pattern

```typescript
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

// Storing a secret:
const encrypted = encrypt(apiKey);           // Returns "iv:authTag:ciphertext"
await prisma.aISettings.update({ data: { byokApiKey: encrypted } });

// Reading a secret:
const raw = settings.byokApiKey;
const apiKey = isEncrypted(raw) ? decrypt(raw) : raw;
```

---

## Feature Flag Pattern

```typescript
import { isFeatureEnabled } from "@/lib/entitlements";

const canUseByok = await isFeatureEnabled(tenantId, "byok_api_keys");
if (!canUseByok) throw new Error("Upgrade required");
```

`isFeatureEnabled` checks `EntitlementOverride` first (per-tenant), then falls back to `FeatureFlag.enabledFor` (plan-based).
