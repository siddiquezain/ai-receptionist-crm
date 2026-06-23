# Coding Standards

---

## Language & Type Safety

- **TypeScript strict mode** — enabled in `tsconfig.json`. No exceptions.
- **No `any`** — if a type is unknown, use `unknown` and narrow it.
- **No `// @ts-ignore` or `// @ts-expect-error`** — fix the underlying type issue instead.
- **No `eslint-disable`** — fix the lint issue instead.
- **Imports** — use `@/` path alias for all `src/` imports (configured in `tsconfig.json`).

---

## Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Files (components) | kebab-case | `appointment-slide-over.tsx` |
| Files (utilities) | kebab-case | `server-auth.ts` |
| React components | PascalCase | `AppointmentSlideOver` |
| Functions | camelCase | `createAppointment()` |
| Variables | camelCase | `tenantId`, `appointmentStatus` |
| Types / Interfaces | PascalCase | `AppointmentWithCustomer` |
| Prisma models | PascalCase (Prisma convention) | `Appointment`, `TenantMember` |
| Env vars | SCREAMING_SNAKE_CASE | `ENCRYPTION_KEY` |
| CSS classes | Tailwind utilities only | no custom class names unless necessary |

---

## File Organization

- One React component per file. File name matches component name (kebab-case).
- Co-locate related components in feature folders (`appointments/`, `inbox/`, etc.).
- Shared primitives in `components/ui/` (shadcn/ui only — do not add custom primitives here).
- Utilities in `src/lib/` — one concern per file (`crypto.ts`, `audit.ts`, `permissions.ts`).

---

## React & Next.js

- **Server Components by default.** Only add `"use client"` when you need browser APIs, event handlers, or React hooks.
- **Page files (`page.tsx`)** are Server Components. They fetch data and pass it as props to client components.
- **`*-client.tsx` files** are the interactive layer. They receive data as props and own state + event handling.
- **Leaf components** (bubbles, badges, cards) are always pure — no data fetching, no side effects.
- **No `useEffect` for data fetching.** Use TanStack Query for client-side data, or Server Components for initial data.
- **No `useState` for server data.** TanStack Query manages server state.

---

## Server Actions

Location: `src/lib/actions/*.ts`

Every server action must:

```typescript
"use server"; // Always first line

export async function myAction(input: InputType) {
  // 1. Auth: verify identity
  const { prismaUser } = await requireAuth();

  // 2. Tenant: verify membership + get role
  const { tenantId, role } = await requireTenantAccess(tenantSlug);

  // 3. Permission: verify role can do this
  requirePermission(role, "resource.action");

  // 4. Validate input
  const parsed = mySchema.parse(input);

  // 5. Execute (Prisma write)
  const result = await prisma.model.create({ data: { ...parsed, tenantId } });

  // 6. Audit log (fire-and-forget — do NOT await)
  logAudit({ tenantId, actorId: prismaUser.id, ... });

  // 7. Return (revalidate path if needed)
  revalidatePath(`/${tenantSlug}/section`);
  return result;
}
```

**Never:**
- Skip auth guards
- Use `prisma.model.delete()` (use soft delete: `update({ data: { deletedAt: new Date() } })`)
- Return raw Prisma errors to the client
- Put long-running logic in a server action (belongs in n8n)

---

## Prisma / Database

- **Soft deletes only.** The Prisma extension enforces `deletedAt: null` on reads. Set `deletedAt: new Date()` to delete.
- **Always scope by tenantId.** Every query on a tenant model must include `{ where: { tenantId } }`.
- **No raw SQL** unless absolutely necessary. Use the Prisma query API.
- **Transactions for multi-step writes.** Use `prisma.$transaction()` when multiple writes must be atomic.
- **Query functions** (`src/lib/*-queries.ts`) — Prisma reads only. No mutations in query files.

---

## Validation

- All form inputs and server action inputs validated with Zod.
- Schemas in `src/validators/`.
- Use `.parse()` (throws on error) not `.safeParse()` unless you need the error details.
- Validate at the server action boundary — not in components.

---

## Error Handling

- Server actions throw errors — Next.js catches them. Return `{ error: string }` only for user-facing validation errors.
- Auth/permission errors: throw with `.status = 403/401`. The framework handles redirect.
- Database errors: let them propagate to the error boundary. Do not swallow unexpected errors.
- Audit log errors: always swallowed (fire-and-forget is intentional — see ADR-005).

---

## Styling

- **Tailwind CSS v4 only.** No inline styles, no CSS modules, no styled-components.
- **shadcn/ui** for all interactive primitives (Button, Input, Dialog, Sheet, Select, etc.).
- **Class merging:** use `cn()` (from `src/lib/utils.ts`) which wraps `clsx` + `tailwind-merge`.
- **No fixed pixel values** for layout — use Tailwind spacing scale.
- Dark mode via `next-themes` + Tailwind `dark:` variant.

---

## Comments

- Comments explain **why**, not **what**. If you need to explain what the code does, the code is too complex.
- No JSDoc comments on internal functions unless they have non-obvious parameters.
- TODOs must include a GitHub issue number or Phase reference: `// TODO (Phase 4): webhook signature verification`.

---

## Commits

- Always use feature branches. Never commit directly to `main`.
- Commit message format: `type: description` (e.g., `feat: add appointment cancellation`, `fix: tenant filter in deleteCustomer`, `security: encrypt BYOK API keys`)
- One logical change per commit.
