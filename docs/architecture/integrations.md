# Integrations

---

## AI Providers (Active)

The dashboard has a multi-provider AI abstraction in `src/lib/ai/`.

### Architecture

```
AISettings (per tenant)
    │
    ▼
getAIProvider(settings)   ← src/lib/ai/index.ts
    │
    ├── "openai"     → OpenAIProvider    (src/lib/ai/providers/openai.ts)
    ├── "anthropic"  → AnthropicProvider (src/lib/ai/providers/anthropic.ts)
    ├── "gemini"     → GeminiProvider    (src/lib/ai/providers/gemini.ts)
    └── "grok"       → GrokProvider      (src/lib/ai/providers/grok.ts)
```

All providers implement the `AIProvider` interface from `src/lib/ai/types.ts`.

### Provider Configuration (per tenant)

| Field | Default | Notes |
|---|---|---|
| `provider` | `"openai"` | Primary provider |
| `model` | `"gpt-4o"` | Model within provider |
| `fallbackProvider` | null | Used if primary fails |
| `temperature` | `0.7` | 0.0–1.0 |
| `maxTokens` | `1000` | Per response |
| `byokApiKey` | null | Bring-your-own-key (AES-256-GCM encrypted in DB) |

### BYOK (Bring Your Own Key)

Tenants on PRO+ can supply their own API key. The key is:
1. Encrypted with AES-256-GCM before storage (`src/lib/crypto.ts`)
2. Decrypted at runtime only within the server action that calls the AI
3. Never logged, never sent to the client

When `byokApiKey` is set, `AIUsageRecord.isByok` is `true` — cost is not billed to the platform.

### Cost Tracking

`src/lib/ai/pricing.ts` maps (provider, model) → cost per 1k tokens.
Every AI response writes an `AIUsageRecord` with `estimatedCostUsd`.

---

## Supabase (Active)

| Feature | Usage |
|---|---|
| Auth | OAuth2 + email/password, SSR cookie sessions |
| PostgreSQL | Primary database via Prisma |
| Realtime | Live subscription in Inbox (conversation updates) |
| Storage | (Future) File attachments |

**Clients:**
- `src/lib/supabase/server.ts` — Server-side client (Server Components, Actions)
- `src/lib/supabase/client.ts` — Browser client (Client Components, realtime only)

---

## n8n (Accepted — Phase 4, Not Yet Implemented)

n8n will be the workflow orchestration layer. It will:
- Receive webhooks from Evolution API (WhatsApp messages)
- Run AI inference (Gemini or other) to extract booking intent
- Write appointments and conversation records to Supabase directly
- Read and process `NotificationJob` records (send emails, WhatsApp messages)
- Trigger on appointment lifecycle events (confirmation, reminders, follow-ups)

**Dashboard interaction with n8n:**
- Dashboard exposes a signed webhook endpoint (POST) that n8n can call to trigger UI-visible state changes
- n8n webhook calls must include a shared secret / HMAC signature (to be implemented in Phase 4)
- Dashboard **never** calls n8n directly — n8n is event-driven from Supabase

See [ADR-002](../adr/ADR-002-n8n-architecture.md).

---

## Evolution API (Accepted — Phase 4, Not Yet Implemented)

Evolution API is the WhatsApp gateway. It:
- Receives inbound WhatsApp messages from customers
- Forwards them to n8n via webhook
- Sends outbound WhatsApp messages on behalf of the tenant

**Connection per tenant:** Each tenant that enables WhatsApp will have their own Evolution API instance or a dedicated instance/channel. Configuration will be stored in the dashboard settings.

**Security:** All Evolution API webhooks to n8n (and optionally to the dashboard) must use signed payloads. Key stored encrypted in the dashboard.

---

## Google Calendar / Outlook (Schema Ready — Phase 4, Not Yet Implemented)

The `CalendarIntegration` model supports:
- Google Calendar and Microsoft Outlook
- READ_ONLY, WRITE_ONLY, or BIDIRECTIONAL sync
- Per-team-member or tenant-wide connections

OAuth tokens (`accessToken`, `refreshToken`) will be encrypted at rest (same AES-256-GCM pattern as BYOK keys — noted as deferred in Phase 3.5 audit since the feature is not yet activated).

---

## Notification Channels (Schema Ready — Phase 4, Not Yet Implemented)

The `NotificationJob` model supports four channels:

| Channel | Planned Provider | Notes |
|---|---|---|
| EMAIL | SendGrid or Resend | Primary |
| WHATSAPP | Evolution API (via n8n) | |
| SMS | Twilio | |
| IN_APP | Direct DB write | Simplest to implement |

n8n will poll `NotificationJob WHERE status = 'PENDING' AND scheduledFor <= NOW()`, process each job, and update `status` and `sentAt`.

---

## Future Integrations (Not Yet Decided)

| Integration | Potential Use |
|---|---|
| Upstash | Rate limiting on auth + webhook endpoints |
| Axiom / Datadog | Structured production logging |
| Stripe | Billing and subscription management |
| Twilio | SMS notifications |
| SendGrid / Resend | Transactional email |
