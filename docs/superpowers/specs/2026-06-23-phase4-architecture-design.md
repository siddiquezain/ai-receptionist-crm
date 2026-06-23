# Phase 4 Integration Architecture — Complete Specification

**Status:** Approved for implementation
**Date:** 2026-06-23
**Author:** Mohammed Siddique Zain
**Covers:** Phases 4A–4F

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Responsibilities by System](#3-responsibilities-by-system)
4. [Schema Changes](#4-schema-changes)
5. [Internal API Contracts](#5-internal-api-contracts)
6. [Webhook Contracts](#6-webhook-contracts)
7. [Database Read/Write Contracts](#7-database-readwrite-contracts)
8. [Sequence Diagrams](#8-sequence-diagrams)
9. [Notification Strategy](#9-notification-strategy)
10. [Error Handling](#10-error-handling)
11. [Retry Strategy](#11-retry-strategy)
12. [Idempotency Strategy](#12-idempotency-strategy)
13. [Multi-Tenant Considerations](#13-multi-tenant-considerations)
14. [Security Considerations](#14-security-considerations)
15. [Phase Breakdown](#15-phase-breakdown)
16. [Risks and Mitigation](#16-risks-and-mitigation)
17. [Recommended Implementation Order](#17-recommended-implementation-order)

---

## 1. Executive Summary

Phase 4 activates the automation layer of the platform. After Phase 4, a customer can send a WhatsApp message and receive a confirmed appointment booking without any staff involvement. Staff can view all conversations in the existing Inbox and reply if needed. Businesses can also share a public URL where customers self-schedule.

### Governing Principles

1. **The dashboard backend owns the business domain.** All business state mutations (Customers, Conversations, Messages, Appointments, NotificationJobs, AnalyticsEvents) go through dashboard-controlled internal API endpoints, where validation, authorization, audit logging, and soft-delete conventions apply consistently.

2. **n8n is the orchestrator, not the business layer.** n8n sequences and coordinates work. It does not contain business rules. It calls the dashboard API to mutate business state.

3. **Messaging is provider-agnostic.** Evolution API is the first implementation of a `MessagingProvider` abstraction. Switching providers later is a configuration and adapter change, not an architectural change.

4. **Supabase is the single source of truth.** n8n may read configuration and reference data directly from Supabase. All business mutations go through the dashboard API. The `NotificationJob` table is the handoff queue; n8n updates job status directly.

5. **Security is non-negotiable.** Every integration surface has its own authentication mechanism. No cross-tenant data access is possible from n8n.

### What this phase does NOT include

- Calendar sync (Google/Outlook) — complexity warrants its own spec
- Stripe billing — Phase 5
- Grok provider — skeleton only, not production-ready
- Multi-language AI conversations — future

---

## 2. System Architecture

### Full System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CUSTOMER                                                                   │
│  (WhatsApp, Public Booking Page)                                            │
└────────────────────────┬───────────────────────────────┬────────────────────┘
                         │ WhatsApp                       │ HTTPS
                         ▼                                ▼
              ┌─────────────────────┐        ┌────────────────────────┐
              │    EVOLUTION API    │        │  PUBLIC BOOKING PAGE   │
              │  (per-tenant        │        │  /book/[tenant-slug]   │
              │   WhatsApp          │        │  (no auth, Next.js)    │
              │   instances)        │        └───────────┬────────────┘
              └──────────┬──────────┘                    │ calls
                         │ webhook                        │ /api/internal/
                         │ (HMAC-SHA256)                  │
                         ▼                                │
              ┌─────────────────────┐                     │
              │        n8n          │                     │
              │   (Orchestrator)    │                     │
              │                     │                     │
              │  ┌───────────────┐  │                     │
              │  │  Workflows:   │  │                     │
              │  │ • Msg inbound │  │                     │
              │  │ • AI response │  │                     │
              │  │ • Auto-book   │  │                     │
              │  │ • Notif poll  │  │                     │
              │  └───────────────┘  │                     │
              └──────────┬──────────┘                     │
                         │                                │
              ┌──────────┴──────────────────────────────┐ │
              │   DASHBOARD INTERNAL API                  │◀┘
              │   /api/internal/* (N8N_API_KEY auth)     │
              │                                          │
              │  Endpoints:                              │
              │  • POST /messaging/inbound               │
              │  • POST /ai/chat                         │
              │  • GET  /tenants/:id/availability        │
              │  • POST /appointments                    │
              │  • POST /customers/find-or-create        │
              │  • POST /notifications                   │
              │  • POST /analytics/events                │
              └──────────────────────────────────────────┘
                         │
              ┌──────────▼──────────────────────────────┐
              │         SUPABASE (PostgreSQL)            │
              │         Single source of truth           │
              │                                          │
              │  n8n direct reads:                       │
              │  • MessagingIntegration (routing)        │
              │  • NotificationJob (polling queue)       │
              │  • Tenant, Service, TeamMember (context) │
              └──────────┬──────────────────────────────┘
                         │ Supabase Realtime
              ┌──────────▼──────────────────────────────┐
              │       DASHBOARD UI (Staff)               │
              │       (React 19, Next.js 16)             │
              │                                          │
              │  • Inbox: WEB_CHAT + WHATSAPP unified    │
              │  • Appointments, Customers, Analytics    │
              │  • Settings: MessagingIntegration config │
              └──────────────────────────────────────────┘

              ┌──────────────────────────────────────────┐
              │       AI PROVIDERS                        │
              │  Called by: Dashboard Internal API        │
              │  (src/lib/ai/ — existing abstraction)    │
              │  OpenAI | Anthropic | Gemini | Grok      │
              └──────────────────────────────────────────┘
```

### Key Architectural Note: AI Execution

ADR-003 states that automation AI runs inside n8n. This spec refines that: n8n **triggers** AI inference by calling the dashboard's `/api/internal/ai/chat` endpoint. The dashboard uses its existing `src/lib/ai/` abstraction layer to call the tenant's configured AI provider. This approach:

- Keeps all AI provider logic centralized in one place (no duplication in n8n)
- Keeps BYOK key decryption in the dashboard (ENCRYPTION_KEY never leaves the dashboard)
- Keeps AIUsageRecord writes in the dashboard layer
- Preserves the intent of ADR-003: AI-driven automation is triggered by n8n events, not by user actions

---

## 3. Responsibilities by System

### Dashboard Backend

**Owns:**
- All business state mutations via internal API endpoints
- AI provider selection, decryption of BYOK keys, and inference execution
- Tenant resolution and validation on every internal API call
- Availability calculation (WorkingHours + BusyPeriod + Appointment conflict)
- Audit logging for all business events
- Public booking page — route, form, and underlying API calls
- MessagingIntegration settings UI (connect/disconnect WhatsApp)

**Does NOT own:**
- Webhook ingestion from messaging providers (n8n owns this)
- Notification delivery (n8n owns this)
- Orchestration of multi-step workflows
- Polling loops or cron jobs

### n8n

**Owns:**
- Receiving and validating webhooks from Evolution API
- Orchestrating the inbound message workflow (route → store → AI respond → send reply)
- Polling `NotificationJob` and delivering notifications via provider clients
- Retry and error handling for external provider calls
- Scheduling time-based jobs (e.g., trigger 24h reminder workflow)

**Does NOT own:**
- Business state — all mutations delegated to dashboard internal API
- AI provider connections — delegated to dashboard `/api/internal/ai/chat`
- Tenant authorization — dashboard enforces it per-call
- Any state that belongs to the business domain

**Has read-only access to Supabase** (configuration and reference data only):
- `MessagingIntegration` — to resolve instanceName → tenantId during webhook routing
- `NotificationJob` — to poll the queue
- `Tenant` — for timezone, plan context
- `Service`, `TeamMember` — for context when building notification payloads

**Does not hold and never receives:**
- AI provider API keys (BYOK or platform) — all AI key handling is internal to the dashboard
- `ENCRYPTION_KEY` — stays in the dashboard only; n8n receives no encrypted or decrypted key material

### Evolution API

**Owns:**
- Maintaining persistent WhatsApp sessions per tenant instance
- Receiving inbound WhatsApp messages and forwarding them to n8n via webhook
- Sending outbound WhatsApp messages on behalf of a tenant instance
- Message delivery status callbacks (delivered, read)

**Does NOT own:**
- Message content decisions (n8n decides what to send)
- Tenant data
- Business logic

### Gemini (and other AI providers)

**Owns:**
- Text generation / inference

**Does NOT own:**
- Data storage
- Orchestration
- Business rules

Called exclusively through the dashboard's `src/lib/ai/` abstraction layer. Provider selection is per-tenant via `AISettings`.

### Supabase

**Owns:**
- PostgreSQL storage — single source of truth
- Auth — user sessions (Supabase SSR)
- Realtime — change data capture subscriptions (used by Dashboard Inbox for live updates)

**Does NOT own:**
- Business logic
- Row-Level Security enforcement (currently; RLS is Phase 4F)

---

## 4. Schema Changes

### 4.1 New Enum: `MessagingProvider`

```prisma
enum MessagingProvider {
  EVOLUTION_API
  // Future: TWILIO | MESSAGEBIRD | META_CLOUD_API
}
```

`ConversationChannel` (WEB_CHAT | WHATSAPP) is not changed. It represents the *channel* the customer uses, not the backend provider. Adding a new provider does not require a new channel value.

### 4.2 New Model: `MessagingIntegration`

```prisma
model MessagingIntegration {
  id              String            @id @default(cuid())
  tenantId        String
  provider        MessagingProvider
  instanceName    String            // Provider-assigned instance ID; used for webhook routing
  displayName     String?           // Human label: "Main WhatsApp", "Sales Line"
  phoneNumber     String?           // Connected number (for display and outbound addressing)
  apiEndpoint     String?           // Required for self-hosted providers (e.g., Evolution API base URL)
  apiKey          String            // AES-256-GCM encrypted provider API key
  webhookSecret   String?           // AES-256-GCM encrypted; verifies incoming webhook signatures
  isActive        Boolean           @default(true)
  lastConnectedAt DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  deletedAt       DateTime?

  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  conversations   Conversation[]

  @@unique([provider, instanceName])  // Core of webhook routing: instanceName → tenant
  @@index([tenantId, isActive])
}
```

**Design notes:**
- `@@unique([provider, instanceName])` is the lookup key for webhook routing. When n8n receives `{ instanceName: "acme-salon" }` from Evolution API, one indexed query resolves the tenant.
- `apiKey` and `webhookSecret` are encrypted using the same AES-256-GCM pattern as `AISettings.byokApiKey`. The `crypto.ts` module handles this.
- `apiEndpoint` is nullable — cloud providers don't need it; self-hosted Evolution API does.
- One tenant may have multiple `MessagingIntegration` records in the future (e.g., separate WhatsApp numbers per location). Phase 4 assumes one active integration per tenant.

### 4.3 Changes to `Conversation`

Add nullable FK to `MessagingIntegration`:

```prisma
// In model Conversation, add two fields:
messagingIntegrationId String?
messagingIntegration   MessagingIntegration? @relation(fields: [messagingIntegrationId], references: [id])
```

Web chat conversations: `messagingIntegrationId = null`.
WhatsApp conversations: `messagingIntegrationId` = the integration that originated the thread.

This enables:
- Correct outbound routing (which Evolution API instance to send the reply through)
- Future multi-integration support per tenant

### 4.4 Changes to `Message`

Add `externalId` for idempotency:

```prisma
// In model Message, add one field:
externalId String? // Provider-assigned message ID (e.g., Evolution API message ID)

@@unique([externalId]) // Prevents duplicate message creation from duplicate webhooks
```

When n8n receives a webhook with an `externalId` it has already processed, the dashboard's inbound endpoint detects the duplicate (constraint violation or pre-check) and returns the existing `messageId` without creating a duplicate record.

### 4.5 Changes to `Tenant`

Add relation for new model:

```prisma
// In model Tenant, add:
messagingIntegrations MessagingIntegration[]
```

### 4.6 Summary of Schema Changes

| Change | Type | Justification |
|---|---|---|
| `MessagingProvider` enum | New | Provider abstraction |
| `MessagingIntegration` model | New | Per-tenant messaging config + webhook routing |
| `Conversation.messagingIntegrationId` | New nullable FK | Outbound routing, multi-integration support |
| `Message.externalId` | New nullable unique field | Idempotency for inbound webhook deduplication |
| `Tenant.messagingIntegrations` | New relation | Prisma relation |

No existing fields are modified or removed. All changes are additive and non-breaking.

---

## 5. Internal API Contracts

### Authentication

All `/api/internal/*` endpoints authenticate using a shared bearer token:

```
Authorization: Bearer {N8N_API_KEY}
```

`N8N_API_KEY` is a 32+ byte random string stored in both:
- Dashboard environment: `N8N_API_KEY` — validated in a middleware applied to all `/api/internal/` routes
- n8n environment: `N8N_API_KEY` — sent as the `Authorization` header on every call

The internal API does **not** use Supabase user sessions. There is no tenant membership check against a user. Instead, each endpoint validates that the `tenantId` in the request body refers to an existing, non-deleted `Tenant` record.

Internal API middleware pattern:

```
Request arrives at /api/internal/*
  ↓ Validate Authorization: Bearer {N8N_API_KEY}
  ↓ If invalid → 401 { error: "Unauthorized", code: "INVALID_API_KEY" }
  ↓ Validate tenantId exists and is active
  ↓ If invalid → 404 { error: "Tenant not found", code: "TENANT_NOT_FOUND" }
  ↓ Route to handler
```

### Error Response Format

All errors return:
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

Error codes determine n8n retry behaviour:
- `4xx` (except 429): non-retryable — n8n aborts
- `429` (rate limited): retryable after `Retry-After` header delay
- `5xx`: retryable with exponential backoff

---

### Endpoint: `POST /api/internal/messaging/inbound`

**Purpose:** Process a single inbound message from a messaging provider. Creates or retrieves the Customer, Conversation, and inbound Message. This is the first call n8n makes when a WhatsApp message arrives.

**Request:**
```json
{
  "instanceName": "acme-salon",
  "provider": "EVOLUTION_API",
  "externalMessageId": "ev_msg_123abc",
  "from": "+14155551234",
  "body": "Hi, I'd like to book a haircut tomorrow",
  "timestamp": "2026-06-23T14:30:00Z",
  "mediaUrl": null
}
```

**Processing (in order, all-or-nothing transaction):**
1. Resolve `MessagingIntegration` by `(provider, instanceName)` → get `tenantId`, `messagingIntegrationId`
2. Upsert `Customer` by `(tenantId, phone: from)` — create if not exists, update `lastSeenAt`
3. Find open `Conversation` by `(tenantId, externalId: instanceName+from, channel: WHATSAPP)` — or create new one with `messagingIntegrationId`, `customerId`, `status: OPEN`, `aiHandled: true`
4. Check `Message.externalId = externalMessageId` — if exists, return existing record (idempotency)
5. Create `Message` with `role: USER`, `content: body`, `externalId: externalMessageId`
6. Emit `AnalyticsEvent` `conversation.message_received` if new conversation

**Response (200):**
```json
{
  "tenantId": "cuid",
  "customerId": "cuid",
  "conversationId": "cuid",
  "messageId": "cuid",
  "messagingIntegrationId": "cuid",
  "isNewConversation": true,
  "isDuplicate": false,
  "autoBook": true,
  "requireConfirm": false
}
```

`autoBook` and `requireConfirm` are returned once here so n8n has the tenant's booking policy for this conversation without a separate call. If `isDuplicate: true`, n8n skips all downstream processing for this message.

Note: n8n never receives any AI provider API key. All provider selection and key handling is internal to the dashboard's `/api/internal/ai/chat` endpoint.

**Error codes:**
- `INTEGRATION_NOT_FOUND` (404) — no MessagingIntegration matches instanceName+provider
- `INTEGRATION_INACTIVE` (409) — integration exists but isActive = false

---

### Endpoint: `POST /api/internal/ai/chat`

**Purpose:** Run AI inference using the tenant's configured provider and save the response as a `Message` record. Calling this endpoint is the only way n8n triggers AI execution.

All AI provider selection, BYOK key retrieval and decryption, fallback handling, and cost tracking happen inside the dashboard. n8n passes only the conversation context — it never receives, handles, or stores any provider API key.

**Request:**
```json
{
  "tenantId": "cuid",
  "conversationId": "cuid",
  "messages": [
    { "role": "user", "content": "Hi, I'd like to book a haircut tomorrow" }
  ]
}
```

**Processing:**
1. Look up `AISettings` for `tenantId`; decrypt `byokApiKey` if set
2. Route to correct provider via `getAIProvider(settings)` (`src/lib/ai/index.ts`)
3. Call provider with `messages` + tenant system prompt
4. Create `Message` with `role: ASSISTANT`, `content`, `tokensUsed`, `provider`, `model`
5. Create `AIUsageRecord` with cost estimate
6. If fallback provider is configured and primary fails, retry with fallback before returning error

**Response (200):**
```json
{
  "messageId": "cuid",
  "content": "Of course! We have availability tomorrow at 2pm and 4pm. Which works for you?",
  "tokensUsed": 312,
  "provider": "openai",
  "model": "gpt-4o"
}
```

**Error codes:**
- `AI_PROVIDER_ERROR` (502) — provider returned an error; retryable
- `AI_QUOTA_EXCEEDED` (429) — quota or rate limit; retryable after delay
- `AI_INVALID_KEY` (400) — BYOK key rejected by provider; non-retryable

---

### Endpoint: `GET /api/internal/tenants/:tenantId/availability`

**Purpose:** Return available booking slots for a given date and service. Encapsulates all scheduling business logic: WorkingHours, BusyPeriod, existing Appointments, buffer times.

**Query parameters:**
```
serviceId=cuid
date=2026-06-24
teamMemberId=cuid  (optional — omit to show any available staff)
```

**Response (200):**
```json
{
  "date": "2026-06-24",
  "slots": [
    {
      "startAt": "2026-06-24T14:00:00Z",
      "endAt": "2026-06-24T15:00:00Z",
      "teamMemberId": "cuid",
      "teamMemberName": "Sarah"
    },
    {
      "startAt": "2026-06-24T16:00:00Z",
      "endAt": "2026-06-24T17:00:00Z",
      "teamMemberId": "cuid",
      "teamMemberName": "Sarah"
    }
  ]
}
```

Empty `slots` array means no availability for that date.

---

### Endpoint: `POST /api/internal/appointments`

**Purpose:** Create an appointment. Includes conflict check, NotificationJob creation, and AnalyticsEvent emission.

**Request:**
```json
{
  "tenantId": "cuid",
  "customerId": "cuid",
  "serviceId": "cuid",
  "teamMemberId": "cuid",
  "startAt": "2026-06-24T14:00:00Z",
  "endAt": "2026-06-24T15:00:00Z",
  "bookedVia": "AI",
  "conversationId": "cuid",
  "notes": null
}
```

**Processing:**
1. Re-validate slot availability using a serializable transaction (same conflict logic as dashboard server action — prevents race conditions)
2. Create `Appointment` with `status: PENDING` (if `requireConfirm = true`) or `status: CONFIRMED` (if `autoBook = true` and `requireConfirm = false`)
3. Create `NotificationJob` records: `APPOINTMENT_CONFIRMATION` (now), `APPOINTMENT_REMINDER_24H` (startAt - 24h), `APPOINTMENT_REMINDER_1H` (startAt - 1h), `STAFF_NEW_BOOKING` (now)
4. Create `AnalyticsEvent` `appointment.booked` with `{ channel: "AI", serviceId, teamMemberId }`
5. Write `AuditLog` with `actorType: AI`, `action: appointment.created`

**Response (200):**
```json
{
  "appointmentId": "cuid",
  "status": "CONFIRMED",
  "startAt": "2026-06-24T14:00:00Z",
  "endAt": "2026-06-24T15:00:00Z"
}
```

**Error codes:**
- `SLOT_UNAVAILABLE` (409) — conflict detected; non-retryable; n8n should offer alternative slots
- `CUSTOMER_NOT_FOUND` (404) — non-retryable
- `SERVICE_NOT_FOUND` (404) — non-retryable

---

### Endpoint: `POST /api/internal/customers/find-or-create`

**Purpose:** Find an existing customer by phone or email, or create one if not found. Used by the public booking page and can be called directly by n8n if needed separately from `/messaging/inbound`.

**Request:**
```json
{
  "tenantId": "cuid",
  "phone": "+14155551234",
  "email": null,
  "name": "Jane Doe"
}
```

**Response (200):**
```json
{
  "customerId": "cuid",
  "created": false
}
```

---

### Endpoint: `POST /api/internal/notifications`

**Purpose:** Queue a notification job. Used by the public booking page (which doesn't have access to server actions) and by n8n for ad-hoc notifications outside the appointment creation flow.

**Request:**
```json
{
  "tenantId": "cuid",
  "type": "APPOINTMENT_CONFIRMATION",
  "channel": "EMAIL",
  "recipient": "jane@example.com",
  "payload": {
    "customerName": "Jane Doe",
    "serviceName": "Haircut",
    "startAt": "2026-06-24T14:00:00Z",
    "teamMemberName": "Sarah",
    "tenantName": "Acme Salon"
  },
  "scheduledFor": "2026-06-23T14:35:00Z"
}
```

**Response (200):**
```json
{ "notificationJobId": "cuid" }
```

---

### Endpoint: `POST /api/internal/analytics/events`

**Purpose:** Emit an analytics event on behalf of n8n or the public booking page.

**Request:**
```json
{
  "tenantId": "cuid",
  "event": "appointment.booked",
  "properties": { "channel": "SELF_SERVICE", "serviceId": "cuid" },
  "occurredAt": "2026-06-23T14:35:00Z"
}
```

**Response (200):** `{ "ok": true }`

---

## 6. Webhook Contracts

### 6.1 Evolution API → n8n

Evolution API calls the n8n webhook URL when a message is received. The URL is configured per tenant in the Evolution API admin. n8n validates the signature using the `webhookSecret` from `MessagingIntegration`.

**Method:** `POST`

**Headers:**
```
x-evolution-signature: sha256={HMAC-SHA256-hex}
Content-Type: application/json
```

**Payload (Evolution API format):**
```json
{
  "instance": "acme-salon",
  "data": {
    "key": {
      "remoteJid": "14155551234@s.whatsapp.net",
      "id": "ev_msg_123abc"
    },
    "message": {
      "conversation": "Hi, I'd like to book a haircut tomorrow"
    },
    "messageTimestamp": 1750689000
  }
}
```

**n8n processing:**
1. Extract `instance` (= `instanceName`) from payload
2. Query Supabase `MessagingIntegration` by `(provider: EVOLUTION_API, instanceName: instance)` → get `webhookSecret`, `tenantId`
3. Verify HMAC-SHA256 signature using `webhookSecret`
4. Parse message fields into normalized structure
5. Continue to inbound message workflow

**Signature verification:**
```
signature = HMAC-SHA256(webhookSecret, rawRequestBody)
compare to x-evolution-signature header value (constant-time comparison)
```

### 6.2 n8n → Dashboard Webhook Receiver

The dashboard exposes a signed webhook endpoint that n8n may call for signals that need to reach the dashboard without going through the internal API business endpoints. In Phase 4, its primary use is for future extensibility — the Supabase Realtime subscriptions in the dashboard inbox handle live updates automatically when n8n writes Messages via `/api/internal/`.

**Endpoint:** `POST /api/webhooks/n8n`

**Authentication:**
```
x-n8n-signature: sha256={HMAC-SHA256 of request body using N8N_WEBHOOK_SECRET}
```

**Payload:**
```json
{
  "action": "conversation.updated",
  "tenantId": "cuid",
  "payload": { ... }
}
```

**Response:** `{ "ok": true }` on success, `{ "error": "..." }` on failure.

This endpoint is built in Phase 4A but carries no critical Phase 4 workflows — it is forward-compatible infrastructure.

---

## 7. Database Read/Write Contracts

### What n8n reads directly from Supabase

n8n uses a **read-only** Supabase connection (Postgres role with `SELECT` only, no `INSERT/UPDATE/DELETE`).

| Table | When read | Purpose |
|---|---|---|
| `MessagingIntegration` | On every inbound webhook | Resolve instanceName → tenantId, get webhookSecret |
| `NotificationJob` | Every polling cycle (every 60s) | Find PENDING jobs due for delivery |
| `Tenant` | When building notification payloads | Get tenant name, timezone |
| `Service` | When building notification payloads | Get service name, duration |
| `TeamMember` | When building notification payloads | Get staff name |
| `Appointment` | When building notification payloads | Get appointment details |
| `Customer` | When building notification payloads | Get customer name, phone, email |

Note: n8n does **not** read `AISettings` directly and does not receive any AI provider API key. AI config is looked up and BYOK keys decrypted internally by the dashboard when `POST /api/internal/ai/chat` is called. n8n has no access to `ENCRYPTION_KEY`.

### What goes through the Dashboard Internal API

All business state mutations:

| Operation | Endpoint |
|---|---|
| Process inbound WhatsApp message (create Customer, Conversation, Message) | `POST /api/internal/messaging/inbound` |
| Generate AI response (call provider, save Message, save AIUsageRecord) | `POST /api/internal/ai/chat` |
| Create appointment (with conflict check + NotificationJob creation) | `POST /api/internal/appointments` |
| Find or create customer | `POST /api/internal/customers/find-or-create` |
| Check availability | `GET /api/internal/tenants/:id/availability` |
| Queue ad-hoc notification | `POST /api/internal/notifications` |
| Emit analytics event | `POST /api/internal/analytics/events` |

### What n8n writes directly to Supabase

The single exception to API-only writes: `NotificationJob` status updates.

When n8n delivers a notification, it updates the job record directly:

```sql
-- On successful delivery:
UPDATE "NotificationJob"
SET status = 'SENT', "sentAt" = NOW(), attempts = attempts + 1, "lastAttemptAt" = NOW()
WHERE id = $jobId;

-- On failure:
UPDATE "NotificationJob"
SET status = 'FAILED', "failureReason" = $error, attempts = attempts + 1, "lastAttemptAt" = NOW()
WHERE id = $jobId;

-- On processing start (to claim the job and prevent double-processing):
UPDATE "NotificationJob"
SET status = 'PROCESSING', "lastAttemptAt" = NOW()
WHERE id = $jobId AND status = 'PENDING';
-- If 0 rows affected, another n8n worker claimed it — skip
```

Rationale: These are queue mechanics on a record the dashboard created. The status transitions are operational, not business events. Routing them through the API would add latency to the critical notification delivery loop without adding any meaningful enforcement.

---

## 8. Sequence Diagrams

### 8.1 WhatsApp Message Received → AI Response

```
Customer          Evolution API        n8n                Dashboard API         Supabase
   │                   │                │                      │                    │
   │──WhatsApp msg──▶  │                │                      │                    │
   │                   │──webhook──────▶│                      │                    │
   │                   │                │──read MessagingInteg─────────────────────▶│
   │                   │                │◀──{ tenantId, secret }───────────────────│
   │                   │                │                      │                    │
   │                   │  [verify HMAC] │                      │                    │
   │                   │                │                      │                    │
   │                   │                │──POST /messaging/inbound──────────────────▶│ (find/create Customer)
   │                   │                │                      │──────────────────▶│ (find/create Conversation)
   │                   │                │                      │──────────────────▶│ (create Message USER)
   │                   │                │◀────{ conversationId, autoBook, isDuplicate:false }──│
   │                   │                │                      │                    │
   │                   │    [if isDuplicate: stop]             │                    │
   │                   │                │                      │                    │
   │                   │                │──POST /ai/chat────────────────────────────────────▶│
   │                   │                │  { tenantId, conversationId, messages }   │
   │                   │                │                      │──lookup AISettings─────────▶│
   │                   │                │                      │  decrypt BYOK (internal)    │
   │                   │                │                      │──AI provider call──▶ (OpenAI/Gemini/etc.)
   │                   │                │                      │◀──AI response──────│
   │                   │                │                      │──create Message ASSISTANT──────────────▶│
   │                   │                │◀────{ content, messageId }────────────────│
   │                   │                │                      │                    │
   │                   │                │                      │          Supabase Realtime fires
   │                   │                │                      │                    │
   │                   │──send reply──▶ │ (Evolution API)       │                    │
   │◀──WhatsApp reply──│                │                      │                    │
   │                   │                │                      │                    │
                                                         Dashboard Inbox
                                                         updates in real-time
                                                         (Supabase Realtime)
```

### 8.2 WhatsApp Message → AI Detects Booking Intent → Auto-Book

```
n8n                   Dashboard API               Supabase
  │                        │                          │
  │ [after AI response]    │                          │
  │                        │                          │
  │ [AI content contains booking intent]              │
  │                        │                          │
  │──GET /tenants/:id/availability?date=X─────────────│
  │◀──{ slots: [{ startAt, endAt, teamMemberId }] }───│
  │                        │                          │
  │ [AI formats slot options, sends WhatsApp]         │
  │                        │                          │
  │ [Customer replies with slot choice]               │
  │ [New inbound message — repeat 8.1 flow]           │
  │                        │                          │
  │ [AI confirms booking intent is firm]              │
  │                        │                          │
  │ [AISettings.autoBook = true?]                     │
  │    YES ──────────────────────────────────────────▶│
  │         POST /api/internal/appointments           │
  │                        │──conflict check (serializable tx)──▶│
  │                        │──create Appointment────────────────▶│
  │                        │──create NotificationJobs───────────▶│
  │                        │──create AnalyticsEvent─────────────▶│
  │◀──{ appointmentId, status: CONFIRMED }────────────│
  │                        │                          │
  │ [send confirmation reply via Evolution API]       │
  │                        │                          │
  │    NO (requireConfirm) │                          │
  │         POST /api/internal/appointments           │
  │◀──{ appointmentId, status: PENDING }──────────────│
  │ [send "pending confirmation" reply via Evo API]   │
  │ [staff sees PENDING appt in dashboard, confirms]  │
```

### 8.3 Staff Replies to WhatsApp Conversation via Dashboard

```
Staff (Dashboard UI)    Dashboard Server Action     n8n              Evolution API
        │                       │                    │                    │
        │──send message──────▶  │                    │                    │
        │    (inbox action)      │                    │                    │
        │                       │──create Message (STAFF)──▶ Supabase      │
        │                       │──Supabase Realtime fires──▶ n8n (if subscribed)
        │                       │                    │                    │
        │                       │         [n8n watches Message table]     │
        │                       │         [for new STAFF messages in      │
        │                       │          WHATSAPP conversations]        │
        │                       │                    │                    │
        │                       │                    │──send WhatsApp────▶│
        │                       │                    │   (via Evolution API to customer)
        │                       │                    │                    │
        │◀──optimistic update───│                    │                    │
```

**Alternative for staff replies:** n8n subscribes to Supabase Realtime on `Message` where `role = STAFF` and `channel = WHATSAPP`. When it detects a new message, it sends it via Evolution API. This avoids the dashboard needing to call Evolution API directly.

### 8.4 Notification Delivery (n8n Polling Workflow)

```
n8n (every 60s)              Supabase            Provider (Resend/Evo/Twilio)
      │                          │                          │
      │──poll NotificationJob────▶│                          │
      │  WHERE status='PENDING'  │                          │
      │  AND scheduledFor≤NOW()  │                          │
      │◀──[list of jobs]──────────│                          │
      │                          │                          │
      │ [for each job, in parallel up to N workers]         │
      │                          │                          │
      │──UPDATE status=PROCESSING─▶│                         │
      │ (WHERE status='PENDING'  │                          │
      │  — optimistic locking)   │                          │
      │◀──[1 row updated or 0]────│                          │
      │                          │                          │
      │ [0 rows = another worker claimed it, skip]          │
      │                          │                          │
      │──send via provider────────────────────────────────▶ │
      │◀──delivery result────────────────────────────────── │
      │                          │                          │
      │ [success]                │                          │
      │──UPDATE status=SENT,──────▶│                         │
      │   sentAt=NOW()           │                          │
      │                          │                          │
      │ [failure]                │                          │
      │──UPDATE status=FAILED,────▶│                         │
      │   failureReason, attempts│                          │
      │──[schedule retry if attempts < max]                 │
```

### 8.5 Public Self-Service Booking Page

```
Customer (Browser)       Next.js Page          Dashboard Internal API      Supabase
        │                    │                         │                       │
        │──GET /book/slug────▶│                         │                       │
        │                    │──read Tenant by slug────────────────────────────▶│
        │                    │──read Services──────────────────────────────────▶│
        │◀──booking form──────│                         │                       │
        │                    │                         │                       │
        │──select service────▶│                         │                       │
        │──select date────────▶│                         │                       │
        │                    │──GET /tenants/:id/availability──────────────────▶│
        │◀──available slots───│                         │                       │
        │                    │                         │                       │
        │──select slot────────▶│                         │                       │
        │──enter details──────▶│                         │                       │
        │──submit─────────────▶│                         │                       │
        │                    │──POST /customers/find-or-create─────────────────▶│
        │                    │◀──{ customerId }────────────────────────────────│
        │                    │──POST /appointments─────────────────────────────▶│
        │                    │◀──{ appointmentId, status }─────────────────────│
        │                    │──POST /analytics/events─────────────────────────▶│
        │◀──confirmation page─│                         │                       │
        │                    │                         │                       │
        │                    │ [NotificationJob created inside POST /appointments]
        │                    │ [n8n delivers confirmation email/WhatsApp]       │
```

### 8.6 Tenant Connects WhatsApp (MessagingIntegration Setup)

```
Staff (Dashboard)    Dashboard Server Action    Evolution API    Supabase
       │                     │                      │                │
       │──open Settings──────▶│                      │                │
       │  → Integrations      │                      │                │
       │──enter instanceName──▶│                      │                │
       │   apiEndpoint         │                      │                │
       │   apiKey              │                      │                │
       │──save──────────────▶  │                      │                │
       │                      │──test connection──────▶│               │
       │                      │◀──{ connected, phone }─│               │
       │                      │──encrypt apiKey + webhookSecret        │
       │                      │──create MessagingIntegration──────────▶│
       │                      │──set webhook URL on Evo API instance──▶│
       │◀──success────────────│                      │                │
```

---

## 9. Notification Strategy

### Channels and Providers

| Channel | Provider | Phase |
|---|---|---|
| EMAIL | Resend (`resend.com`) | 4D |
| WHATSAPP | Evolution API (via MessagingIntegration) | 4D |
| SMS | Twilio | 4D (lower priority than EMAIL + WHATSAPP) |
| IN_APP | Direct DB write (`NotificationJob.status = SENT`) | 4D |

Resend is recommended over SendGrid for email: simpler API, React Email template support, generous free tier for early-stage usage.

### Notification Templates

All templates rendered by n8n using `payload` JSON from `NotificationJob`. Template variables:

| Variable | Source |
|---|---|
| `customerName` | `Customer.name` |
| `serviceName` | `Service.name` |
| `startAt` | `Appointment.startAt` (formatted in tenant timezone) |
| `teamMemberName` | `TeamMember.name` |
| `tenantName` | `Tenant.name` |
| `tenantLogo` | `Tenant.logo` |
| `cancelUrl` | `{NEXT_PUBLIC_APP_URL}/book/{slug}/cancel?token=...` |

### Notification Scheduling

`NotificationJob.scheduledFor` is set when the job is created:

| Type | `scheduledFor` |
|---|---|
| `APPOINTMENT_CONFIRMATION` | `createdAt` (immediate) |
| `APPOINTMENT_REMINDER_24H` | `startAt - 24h` |
| `APPOINTMENT_REMINDER_1H` | `startAt - 1h` |
| `APPOINTMENT_CANCELLED` | `createdAt` (immediate) |
| `APPOINTMENT_RESCHEDULED` | `createdAt` (immediate) |
| `STAFF_NEW_BOOKING` | `createdAt` (immediate) |
| `STAFF_CANCELLATION` | `createdAt` (immediate) |
| `FOLLOW_UP` | `completedAt + 24h` |

### Notification Deduplication

Before creating a `NotificationJob`, the dashboard checks:
```
NotificationJob WHERE tenantId = X AND type = Y AND appointmentId = Z AND status != CANCELLED
```
If one exists, skip creation. This prevents duplicate confirmations if n8n retries an appointment creation.

---

## 10. Error Handling

### Inbound Message Processing Failures

If `POST /api/internal/messaging/inbound` fails after message arrives at n8n:

1. n8n retries with exponential backoff (3 attempts: 1min, 5min, 15min)
2. If all attempts fail, n8n logs the failure with the raw webhook payload
3. n8n does NOT send a reply to the customer (better silence than garbled error)
4. The unprocessed message is not lost — Evolution API retains message history

### AI Inference Failures

If `POST /api/internal/ai/chat` fails:

1. n8n retries once immediately (transient failure)
2. If fallback provider is configured in `AISettings`, dashboard tries it automatically
3. If all attempts fail, n8n sends a graceful degradation message to the customer:  
   `"I'm having trouble right now. A team member will be in touch shortly."`
4. Sets `Conversation.aiHandled = false` so staff know to handle it

### Appointment Slot Conflict (SLOT_UNAVAILABLE)

Non-retryable. The slot was taken between availability check and booking attempt (race condition).

n8n re-fetches available slots and presents alternatives to the customer in the next AI turn. This is handled at the workflow level, not as an error.

### Notification Delivery Failures

Per-channel failure handling:

| Failure | Action |
|---|---|
| Email bounce | Update `NotificationJob.failureReason`, mark FAILED, do not retry |
| Email provider 5xx | Retry with backoff (max 3 attempts) |
| WhatsApp undeliverable | Mark FAILED, log phone number |
| WhatsApp rate limit | Retry after `Retry-After` delay |
| SMS invalid number | Mark FAILED immediately (non-retryable) |

### n8n Crashes or Restarts

- `NotificationJob` records stuck in `PROCESSING` status are re-queued after a configurable timeout (e.g., 5 minutes with no `sentAt`): `WHERE status = 'PROCESSING' AND lastAttemptAt < NOW() - INTERVAL '5 minutes'`
- This prevents permanent stuck jobs if n8n restarts mid-delivery

---

## 11. Retry Strategy

### Internal API Call Retries (n8n → Dashboard)

| HTTP status | Retry? | Backoff |
|---|---|---|
| 200 | — | — |
| 400 (validation) | No | — |
| 401 (auth) | No — check N8N_API_KEY | — |
| 404 (not found) | No | — |
| 409 (conflict) | No — logic error | — |
| 429 (rate limit) | Yes | `Retry-After` header |
| 500 | Yes, max 3 | 5s, 30s, 120s |
| 503 | Yes, max 3 | 5s, 30s, 120s |
| Timeout | Yes, max 3 | 5s, 30s, 120s |

### Notification Delivery Retries

Max 3 attempts per `NotificationJob`. Backoff: 5min, 30min, 2hr.

After 3 failures: `status = FAILED`, job is not retried automatically. A future admin UI can manually re-queue.

### WhatsApp Webhook Processing Retries

Evolution API retries unacknowledged webhooks (no 200 response) up to 3 times at ~30s intervals. n8n must respond 200 immediately on receipt and process asynchronously to avoid this.

---

## 12. Idempotency Strategy

Every write operation is designed to be safe to retry.

| Operation | Idempotency mechanism |
|---|---|
| Inbound message processing | `Message.externalId` unique constraint — duplicate webhook = return existing messageId |
| Customer creation | `findOrCreate` by `(tenantId, phone)` or `(tenantId, email)` — existing unique constraints |
| Conversation creation | `findOrCreate` by `(tenantId, externalId, channel)` — if exists, append to it |
| Appointment creation | Slot conflict detection in serializable transaction prevents double-booking |
| NotificationJob creation | Pre-creation check by `(tenantId, type, appointmentId)` — deduplication before insert |
| NotificationJob processing | Optimistic `UPDATE WHERE status = 'PENDING'` → 0 rows = already claimed |
| Analytics events | Append-only; duplicates are acceptable (minor over-counting) |

---

## 13. Multi-Tenant Considerations

### n8n Tenant Isolation

n8n has one set of workflows shared across all tenants. Tenant isolation is enforced at the data level:

- Every call to the dashboard internal API includes `tenantId` in the request body
- The dashboard validates `tenantId` on every request — a malformed or incorrect `tenantId` returns 404
- n8n's read-only Supabase connection can see all tenants' data; n8n workflows must always filter by `tenantId`
- The `@@unique([provider, instanceName])` constraint on `MessagingIntegration` means one webhook payload maps to exactly one tenant — no cross-tenant routing errors

### Multi-Instance Evolution API

All tenants share one Evolution API deployment. Each tenant gets their own *instance* (a WhatsApp session) within that deployment. The `instanceName` in each webhook payload identifies which tenant.

### Notification Routing

`NotificationJob.tenantId` scopes every notification record. When n8n polls the queue, it processes all tenants' jobs in the same loop — the payload contains all information needed to deliver to the correct recipient.

### Timezone Handling

`Tenant.timezone` (e.g., `"America/New_York"`) is used:
- When formatting appointment times in notification templates
- When computing `scheduledFor` for reminders (a 24h reminder should fire 24h before the appointment in *the tenant's timezone*)
- n8n reads this from Supabase directly when building payloads

### n8n Workflow Concurrency

n8n processes notifications in parallel (configurable concurrency per workflow). To prevent double-processing, the `UPDATE status = PROCESSING WHERE status = PENDING` pattern is used — only one worker can claim a job at a time.

---

## 14. Security Considerations

### API Key Rotation

| Secret | Where stored | Rotation procedure |
|---|---|---|
| `N8N_API_KEY` | Dashboard env + n8n env | Rotate both atomically; brief downtime acceptable during rotation |
| `N8N_WEBHOOK_SECRET` | Dashboard env + n8n | Rotate both atomically |
| `ENCRYPTION_KEY` | Dashboard env only | Requires re-encrypting all `byokApiKey` and `webhookSecret` values — do not rotate lightly |
| `MessagingIntegration.apiKey` | Supabase (encrypted) | Re-enter in Settings UI; old key invalidated |
| `MessagingIntegration.webhookSecret` | Supabase (encrypted) | Re-enter and reconfigure in Evolution API |

### n8n Credential Exposure

n8n holds:
- `N8N_API_KEY` — allows all business mutations to the dashboard. Treat as a high-value secret.
- Supabase read-only connection string — limited to SELECT. If compromised, attacker can read (but not write) all tenant data.
- Email/SMS/WhatsApp provider keys — notification delivery credentials.

n8n does **not** hold:
- `ENCRYPTION_KEY` — stays in dashboard only
- Any decrypted BYOK API keys — decrypted on-demand by dashboard API, never stored in n8n

### Internal API Security Hardening (Phase 4F)

- Rate limiting on `/api/internal/*` via Upstash: max 100 requests per second per IP
- Request size limit: 1MB per request
- All internal API routes reject requests with any origin other than the configured n8n IP range (optional, if n8n has a fixed IP)

### Webhook Signature Verification

Two webhook surfaces, both HMAC-SHA256:

1. **Evolution API → n8n:** Each tenant has their own `webhookSecret` stored encrypted in `MessagingIntegration`. n8n reads the secret from Supabase and verifies it. A forged webhook from an attacker who doesn't have the secret is rejected before any processing.

2. **n8n → Dashboard:** Global `N8N_WEBHOOK_SECRET`. All n8n-originated webhooks must be signed with this secret. Signature verified before reading payload.

### Public Booking Page Security

The `/book/[tenant-slug]` route is unauthenticated (by design — customers access it). Risks and mitigations:

| Risk | Mitigation |
|---|---|
| Appointment spam | Rate limiting on booking submission (Upstash, per-IP, 5 submissions per hour) |
| Customer data harvesting | Only return confirmation — no customer data in response |
| Slot enumeration | Return only "available / unavailable", not other customers' names or data |
| CSRF | Use CSRF token or `SameSite=Strict` on the booking form action |
| Tenant enumeration | `/book/invalid-slug` returns 404, same as any other 404 — no information leak |

---

## 15. Phase Breakdown

### Phase 4A — Foundation: Schema + Internal API

**Objective:** Build the infrastructure that all subsequent phases depend on. Nothing customer-facing yet.

**Deliverables:**
- Run Prisma migrations for schema changes (MessagingIntegration, Message.externalId, Conversation.messagingIntegrationId)
- Update `docs/architecture/database.md` with new models
- Internal API authentication middleware (`src/app/api/internal/_middleware.ts` or route handler guards)
- `POST /api/internal/messaging/inbound`
- `POST /api/internal/ai/chat`
- `GET /api/internal/tenants/:id/availability`
- `POST /api/internal/appointments`
- `POST /api/internal/customers/find-or-create`
- `POST /api/internal/notifications`
- `POST /api/internal/analytics/events`
- `POST /api/webhooks/n8n` (skeleton with HMAC verification)
- Environment variables documented: `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`
- Integration tests for every internal API endpoint

**Exit criteria:**
- All 8 internal API endpoints respond correctly to authenticated requests
- Unauthenticated requests receive 401
- Invalid `tenantId` receives 404
- `POST /messaging/inbound` creates correct DB records and is idempotent (duplicate `externalMessageId` returns existing record)
- `POST /appointments` detects slot conflicts correctly

---

### Phase 4B — WhatsApp Ingress + Dashboard Display

**Objective:** Inbound WhatsApp messages appear in the dashboard Inbox.

**Dependencies:** Phase 4A complete; Evolution API provisioned; n8n provisioned.

**Deliverables:**
- n8n workflow: **WhatsApp Ingress**
  - Trigger: Evolution API webhook
  - Steps: verify signature → call `POST /messaging/inbound` → log result
- Dashboard `Settings → Integrations` page
  - Form: connect WhatsApp (instanceName, apiEndpoint, apiKey)
  - On save: test connection → encrypt + save `MessagingIntegration`
  - Status: connected/disconnected/last seen
- Dashboard Inbox: display `WHATSAPP` channel conversations alongside `WEB_CHAT`
  - Channel badge on conversation list items
  - Phone number displayed instead of (or alongside) customer name if no name yet

**Exit criteria:**
- Staff can connect a WhatsApp account in Settings
- Sending a WhatsApp message to the connected number creates a Conversation visible in the Inbox
- Inbox correctly shows the channel (WEB_CHAT vs WHATSAPP)
- Duplicate webhook delivery does not create duplicate messages

---

### Phase 4C — AI Auto-Response and Auto-Booking

**Objective:** AI responds to WhatsApp messages and books appointments.

**Dependencies:** Phase 4B complete.

**Deliverables:**
- n8n workflow: **AI Response** (extends WhatsApp Ingress)
  - After inbound message created: call `POST /ai/chat` with `{ tenantId, conversationId, messages }` → dashboard handles all provider/key logic internally → send reply via Evolution API
  - If `aiHandled = false` on conversation: skip AI (staff has taken over)
- n8n workflow: **Booking Intent Detection**
  - After AI response: inspect response content for booking confirmation
  - If booking intent detected: call `GET /availability` → include slots in next AI turn
  - If customer confirms slot: call `POST /appointments`
  - Handle `SLOT_UNAVAILABLE` by re-fetching alternatives
- Dashboard: AI activity log in Inbox shows n8n-originated AI messages (provider, tokens, cost)
- `AISettings` UI: `autoBook` and `requireConfirm` toggles functional

**Exit criteria:**
- Customer sends WhatsApp message → receives AI reply within 10 seconds
- Customer requests a booking → AI offers available slots
- Customer confirms slot → appointment created with correct status (CONFIRMED if `autoBook + !requireConfirm`)
- Dashboard Inbox shows the full conversation thread including AI messages

---

### Phase 4D — Notification Delivery

**Objective:** Appointment notifications delivered to customers and staff.

**Dependencies:** Phase 4A complete (NotificationJob records are already being created by existing server actions); email provider account configured.

**Deliverables:**
- n8n workflow: **Notification Poller**
  - Schedule: every 60 seconds
  - Claims jobs with `UPDATE status = PROCESSING WHERE status = PENDING AND scheduledFor <= NOW()`
  - Routes by `channel`: EMAIL → Resend, WHATSAPP → Evolution API, SMS → Twilio, IN_APP → direct DB mark as SENT
  - Updates `NotificationJob` with result
  - Retry scheduling for failed jobs (if `attempts < 3`)
- n8n workflow: **Stuck Job Recovery**
  - Schedule: every 5 minutes
  - Re-queues jobs WHERE `status = PROCESSING AND lastAttemptAt < NOW() - INTERVAL '5 minutes'`
- Notification templates (Resend/React Email) for all 8 `NotificationType` values
- `N8N_NOTIFICATION_CONCURRENCY` environment variable (default: 10)

**Exit criteria:**
- Create an appointment → customer receives confirmation email within 2 minutes
- Cancel an appointment → customer receives cancellation email within 2 minutes
- Create appointment 2+ hours out → 24h and 1h reminders sent at correct times
- Duplicate job creation is idempotent (no double-send)
- n8n restart during delivery → job re-queued and delivered after 5-minute recovery window

---

### Phase 4E — Public Self-Service Booking Page

**Objective:** Customers can self-schedule without staff involvement.

**Dependencies:** Phase 4A complete.

**Deliverables:**
- Next.js route: `/book/[tenant-slug]` (public, no Supabase auth required)
  - Server Component reads Tenant + Services
  - Multi-step form: Service selection → Date/staff selection → Time slot selection → Customer details → Confirmation
  - Calls internal API: `find-or-create customer` → `create appointment`
  - Shows confirmation screen with appointment summary
- Rate limiting: 5 booking submissions per IP per hour (Upstash)
- `BookingChannel.SELF_SERVICE` set on appointments created via this page
- `MessagingIntegration` not required — no WhatsApp involvement on this page

**Exit criteria:**
- Customer visits `/book/acme-salon`, sees services and available times
- Customer completes booking → appointment appears in dashboard with `bookedVia: SELF_SERVICE`
- Customer receives confirmation email within 2 minutes
- Booking the same slot twice (race condition) → second attempt fails gracefully with "This slot is no longer available"
- Rate limiting blocks >5 submissions per hour from same IP

---

### Phase 4F — Security Hardening

**Objective:** Close all remaining security gaps from Phase 3.5 and Phase 4 new surfaces.

**Dependencies:** Phases 4A–4E complete.

**Deliverables:**
- **Supabase RLS policies** on all tenant-scoped tables (Appointment, Customer, Conversation, Message, etc.)
  - Policy pattern: `USING (tenant_id = current_setting('app.current_tenant_id'))` — already injected by `src/lib/prisma.ts`
  - n8n read-only role: separate Postgres role with SELECT only, no RLS bypass
- **Rate limiting** (Upstash) on:
  - `/api/internal/*` — 100 req/s per IP
  - `/api/auth/*` (login, register) — 10 req/min per IP
  - `/book/*` — 5 booking submissions/hr per IP
- **Server-side logout** — invalidate Supabase session on server, not just client
- **Environment variable validation** — `@t3-oss/env-nextjs` at startup; missing required vars throw before first request is served
- **Webhook signature enforcement** on Evolution API → n8n: per-integration `webhookSecret` verified on every inbound webhook

**Exit criteria:**
- RLS policies pass a penetration test: authenticated as Tenant A, attempting to read Tenant B data returns empty result set
- Removing `N8N_API_KEY` from environment causes all `/api/internal/` requests to fail with 401
- Server-side logout invalidates session immediately
- Missing required env var at startup throws with a clear error message identifying the variable

---

## 16. Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **WhatsApp message delivery delay** | Medium | Medium | Evolution API + n8n processing adds latency. Target: <10s from WhatsApp send to AI reply. Monitor with Supabase Realtime event timestamps. |
| **Slot conflict race condition** | Low | High | Serializable transaction in `POST /appointments`. If conflict occurs, n8n re-fetches availability and presents alternatives. |
| **n8n downtime during notification window** | Medium | Medium | NotificationJob queue is durable. Jobs are re-processed when n8n recovers. Stuck Job Recovery workflow handles in-progress jobs. |
| **WhatsApp number ban** | Low | High | Evolution API best practices: avoid bulk messaging, respect opt-outs. Rate limit outbound messages per tenant. |
| **BYOK key leak via n8n logs** | Low | Critical | AI provider keys never leave the dashboard. n8n calls `POST /ai/chat` with only `tenantId` and messages — dashboard handles all key decryption internally. Nothing sensitive appears in n8n execution logs. |
| **Evolution API provider lock-in** | Low | Medium | `MessagingProvider` abstraction isolates provider specifics to n8n workflow nodes and Evolution API adapter. Switching provider = new workflow + new `MessagingIntegration` records. |
| **AI hallucinated booking** | Medium | High | Confirm booking intent in AI response before calling `POST /appointments`. AI must ask for explicit confirmation ("Shall I book this?") before booking. `requireConfirm` flag adds staff approval as second gate. |
| **Notification template missing variables** | Low | Low | `NotificationJob.payload` validated at creation against required template variables. Missing variables → job created with `status: FAILED` immediately rather than failing at delivery. |
| **n8n service role key compromise** | Low | Critical | n8n uses read-only Supabase role (SELECT only). Business writes go through dashboard API (N8N_API_KEY). If N8N_API_KEY is compromised, rotate it; n8n gets no DB write access directly. |
| **Public booking page abuse** | Medium | Medium | Rate limiting (Phase 4F). Appointment creation requires a real slot — bots cannot create unlimited bookings without consuming real availability. |
| **Duplicate notifications on n8n restart** | Low | Low | Idempotency check before job creation. `sentAt` set atomically on delivery. Duplicate delivery is the lesser risk compared to non-delivery. |

---

## 17. Recommended Implementation Order

The phases are designed to be sequential — each builds on the previous. Within phases, the recommended order is:

### Start here: Phase 4A (1–2 weeks)

1. Write and run Prisma migrations (schema changes)
2. Build internal API middleware (auth + tenant validation)
3. Build `POST /messaging/inbound` — the most complex endpoint; get it right first
4. Build `GET /ai-config` + `POST /ai/chat`
5. Build `GET /availability` + `POST /appointments`
6. Build `POST /customers/find-or-create`, `POST /notifications`, `POST /analytics/events`
7. Build `POST /api/webhooks/n8n` (skeleton)
8. Write integration tests for each endpoint before moving on

### Then: Phase 4B (1 week)

1. Provision n8n instance, connect to Supabase (read-only role)
2. Provision Evolution API instance
3. Build n8n WhatsApp Ingress workflow
4. Build Settings → Integrations page in dashboard
5. Test with a real WhatsApp number

### Then: Phase 4C (1–2 weeks)

1. Build AI Response n8n workflow
2. Build Booking Intent Detection + appointment creation in n8n
3. Tune AI system prompt for booking intent recognition
4. Test full WhatsApp → AI → booking flow

### Then: Phase 4D (1 week)

1. Set up Resend account; create email templates
2. Build Notification Poller n8n workflow
3. Build Stuck Job Recovery workflow
4. Test with email delivery; validate timing of reminders
5. Add WhatsApp delivery via Evolution API
6. Add SMS via Twilio (lower priority)

### Then: Phase 4E (1 week)

1. Build `/book/[tenant-slug]` page
2. Wire to internal API
3. Test end-to-end: customer books → appointment in dashboard → confirmation email

### Last: Phase 4F (1 week)

1. Write Supabase RLS policies
2. Add Upstash rate limiting
3. Add server-side logout
4. Add env var validation
5. Run full security review

---

## Appendix A: Environment Variables for Phase 4

| Variable | Description | Required | Where used |
|---|---|---|---|
| `N8N_API_KEY` | Auth token for dashboard internal API | Yes | Dashboard (validate), n8n (send) |
| `N8N_WEBHOOK_SECRET` | HMAC secret for n8n → dashboard webhooks | Yes | Dashboard (verify), n8n (sign) |
| `RESEND_API_KEY` | Resend email delivery | Yes (4D) | n8n |
| `TWILIO_ACCOUNT_SID` | Twilio SMS | Phase 4D (lower priority) | n8n |
| `TWILIO_AUTH_TOKEN` | Twilio SMS | Phase 4D (lower priority) | n8n |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Yes (4F) | Dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Yes (4F) | Dashboard |
| `NEXT_PUBLIC_APP_URL` | Used in notification links | Yes | Dashboard |
| `SUPABASE_READONLY_URL` | Read-only Postgres URL for n8n | Yes | n8n only |

## Appendix B: ADRs Updated by This Spec

| ADR | Change |
|---|---|
| ADR-002 | Revised (2026-06-23): n8n ↔ DB access model clarified. Dashboard owns business domain. n8n reads config directly, writes business state through dashboard API. |

AI execution refinement: ADR-003 states that automation AI runs in n8n. This spec refines it: n8n triggers AI inference by calling `POST /api/internal/ai/chat`. The dashboard uses its existing `src/lib/ai/` abstraction to call the provider. This preserves the intent (AI automation is triggered by external events, not user actions) while centralizing provider logic. A minor ADR-003 revision is recommended to capture this.
