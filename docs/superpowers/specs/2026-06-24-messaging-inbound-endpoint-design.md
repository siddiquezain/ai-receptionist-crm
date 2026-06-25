# Design: POST /api/internal/messaging/inbound (Phase 4A)

**Date:** 2026-06-24  
**Status:** Approved  
**Scope:** Phase 4A — inbound message persistence only. No AI, booking, notifications, analytics, or reminders.

---

## Goal

Rewrite the existing `POST /api/internal/messaging/inbound` route to consume the normalized n8n payload format. The endpoint is called by n8n after it receives and normalizes a webhook from Evolution API (WhatsApp).

This is an **in-place rewrite** of the existing route and test file. No new files, no new service layer, no schema migration.

---

## Normalized Payload (from n8n)

```json
{
  "provider": "evolution",
  "event": "messages.upsert",
  "instance": "test_tenant",
  "instanceId": "77fe2b51-779d-4cb1-8f36-ae03b65b616f",
  "externalMessageId": "AC87C2EC3508DD8ABCECEDB577BA8CFA",
  "customerPhone": "919398581237",
  "customerName": "MMK",
  "messageType": "conversation",
  "text": "Hello",
  "timestamp": 1782295359,
  "source": "android",
  "fromMe": false
}
```

### Field notes

| Field | Required | Usage |
|-------|----------|-------|
| `provider` | Yes | Drives the provider switch; `"evolution"` maps to `MessagingProvider.EVOLUTION_API` |
| `event` | Yes | Validated but not persisted in Phase 4A |
| `instance` | Yes | Maps to `MessagingIntegration.instanceName` for tenant lookup |
| `instanceId` | No | Accepted, not stored, not used for lookup (no DB column) |
| `externalMessageId` | Yes | Idempotency key — maps to `Message.externalId` |
| `customerPhone` | Yes | Customer lookup/create key (`Customer.phone`) |
| `customerName` | No | Used as display name on new customer creation |
| `messageType` | Yes | Only `"conversation"` (text) processed in Phase 4A |
| `text` | Yes | Maps to `Message.content` |
| `timestamp` | Yes | Unix epoch integer |
| `source` | No | Accepted, not stored in Phase 4A |
| `fromMe` | Yes | `true` → skip immediately, return `{ ignored: true }` |

---

## Execution Flow (strict order)

1. **Authenticate** — `requireInternalAuth(request)` → validates `Authorization: Bearer {N8N_API_KEY}` → 401 if invalid
2. **Validate payload** — Zod schema → 400 if invalid (not 422; aligns with updated requirement)
3. **`fromMe` guard** — if `fromMe === true` → return `200 { ignored: true }` immediately
4. **Provider switch** — `"evolution"` → proceed; unknown → 400 `UNSUPPORTED_PROVIDER`
5. **Resolve tenant** — `MessagingIntegration.findUnique({ provider_instanceName })` → 404 if not found, 409 if inactive
6. **Idempotency check** — `Message.findUnique({ externalId })` → if exists, return `200 { ..., isDuplicate: true }`
7. **Find/Create customer** — by `(tenantId, customerPhone)`; update `lastSeenAt` if exists; create with `customerName` if not
8. **Find/Create conversation** — by `(tenantId, externalId, channel=WHATSAPP)`; `externalId = "{instance}:{customerPhone}"`
9. **Save message** — `Message.create({ conversationId, role: USER, content: text, externalId })`
10. **Return 200** — clean JSON success response

Steps 6–9 run inside a single `prisma.$transaction`.

---

## Response Shapes

```ts
// Success (new message)
{ tenantId, customerId, conversationId, messageId, messagingIntegrationId, isNewConversation: true,  isDuplicate: false }

// Duplicate (idempotency)
{ tenantId, customerId, conversationId, messageId, messagingIntegrationId, isNewConversation: false, isDuplicate: true }

// fromMe skip
{ ignored: true }
```

---

## Provider-Aware Architecture

```ts
switch (provider) {
  case "evolution":
    // all business logic lives here
    break;
  default:
    throw new InternalApiError(400, "UNSUPPORTED_PROVIDER", `Provider "${provider}" is not supported`);
}
```

This keeps the route open for future Meta Cloud API support without architectural changes.

---

## Structured Logging

Log at the start and end of every request. Use `console.log` with a structured object (no logger library in Phase 4A). Never log API keys, full phone numbers (truncate last 4), or raw message content beyond type.

Fields logged:
- `provider`, `instance`, `instanceId` (informational), `externalMessageId`
- `customerPhone` (last 4 digits only)
- `tenantId` (after resolution)
- `durationMs`
- `result`: `"processed"` | `"duplicate"` | `"ignored"` | `"error"`

---

## Authentication

Uses the existing `requireInternalAuth` helper from `src/lib/internal-api/auth.ts`.  
Env var: `N8N_API_KEY`.  
The user's requirements mention `N8N_INTERNAL_API_KEY` — this refers to the same key; the existing env var name is preserved to avoid breaking the running system.

---

## Error Responses

| Scenario | Status | Code |
|----------|--------|------|
| Missing/invalid API key | 401 | `INVALID_API_KEY` |
| Invalid payload | 400 | `VALIDATION_ERROR` |
| Unsupported provider | 400 | `UNSUPPORTED_PROVIDER` |
| Integration not found | 404 | `INTEGRATION_NOT_FOUND` |
| Integration inactive | 409 | `INTEGRATION_INACTIVE` |
| Unhandled error | 500 | `INTERNAL_ERROR` |

---

## Tests

File: `src/__tests__/internal-api/messaging-inbound.test.ts`  
Framework: Vitest, mocked Prisma, `NextRequest` helpers.

Test cases:
1. 401 — missing auth header
2. 401 — wrong API key
3. 400 — missing required fields (e.g. no `externalMessageId`)
4. 200 `{ ignored: true }` — `fromMe: true`
5. 400 `UNSUPPORTED_PROVIDER` — unknown provider
6. 404 `INTEGRATION_NOT_FOUND` — no matching integration
7. 409 `INTEGRATION_INACTIVE` — integration exists but inactive
8. 200 `isDuplicate: true` — `externalMessageId` already in DB
9. 200 new customer + new conversation — happy path, `isNewConversation: true`
10. 200 existing customer + existing conversation — happy path, `isNewConversation: false`

---

## What Is Explicitly Out of Scope (Phase 4A)

- AI chat / auto-reply
- Appointment booking
- Notification jobs
- Analytics events
- Reminders
- `instanceId` DB column or migration
- `autoBook` / `requireConfirm` in response
- Service layer / repository pattern
- Attachment handling
