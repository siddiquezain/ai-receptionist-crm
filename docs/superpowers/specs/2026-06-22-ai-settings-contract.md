# AISettings Contract: Dashboard ↔ n8n

**Date:** 2026-06-22
**Status:** Active

---

## Principle

`AISettings` is the formal contract between the dashboard (configuration owner) and n8n
(execution owner). The table exists in Supabase and is the single source of truth.

```
Dashboard  ──WRITE──▶  AISettings (Supabase)  ──READ──▶  n8n  ──▶  AI Provider
```

The dashboard never calls an AI provider. n8n never stores its own copy of AI configuration.

---

## Field Ownership

| Field | Owner | Direction | Purpose |
|---|---|---|---|
| `id` | System | — | Primary key |
| `tenantId` | System | — | Tenant isolation |
| `provider` | Dashboard | READ by n8n | Selects which AI node to use in the workflow (e.g., `google`, `openai`, `anthropic`) |
| `model` | Dashboard | READ by n8n | Model identifier passed to the AI node (e.g., `gemini-2.0-flash`, `gpt-4o`) |
| `fallbackProvider` | Dashboard | READ by n8n | If primary provider fails, n8n falls back to this |
| `fallbackModel` | Dashboard | READ by n8n | Model for the fallback provider |
| `temperature` | Dashboard | READ by n8n | Controls response creativity; passed directly to the AI API call |
| `maxTokens` | Dashboard | READ by n8n | Max completion tokens; passed to the AI API call |
| `systemPrompt` | Dashboard | READ by n8n | Business-level system instruction injected as the AI's system message |
| `autoBook` | Dashboard | READ by n8n | `true` = n8n books the appointment automatically after collecting details |
| `requireConfirm` | Dashboard | READ by n8n | `true` = n8n sends a confirmation message and waits before booking |
| `byokApiKey` | Dashboard | READ by n8n | `NULL` in all dev scenarios. In enterprise BYOK tier, n8n reads this to use the tenant's own key. Never used by the dashboard UI to make AI calls. |
| `createdAt` | System | — | Audit timestamp |
| `updatedAt` | System | — | Audit timestamp; auto-updated on any change |

---

## n8n Query Contract

n8n reads AISettings exactly once per workflow execution, at the start:

```sql
SELECT
  provider,
  model,
  "fallbackProvider",
  "fallbackModel",
  temperature,
  "maxTokens",
  "systemPrompt",
  "autoBook",
  "requireConfirm",
  "byokApiKey"
FROM "AISettings"
WHERE "tenantId" = $1
LIMIT 1;
```

n8n **never writes** to `AISettings`. Configuration changes go through the dashboard only.

---

## n8n Execution Logic (informed by this contract)

```
1. Receive WhatsApp message via Evolution API webhook
2. Identify tenantId (from phone mapping or webhook metadata)
3. SELECT * FROM AISettings WHERE tenantId = $1
4. If byokApiKey IS NOT NULL → use tenant's own key for AI call
   Else → use n8n's own credentials for provider
5. Select AI workflow node based on `provider` field:
   - 'google'    → Google Gemini node
   - 'openai'    → OpenAI node
   - 'anthropic' → Anthropic/Claude node
   - (unknown)   → error + escalate conversation
6. Configure node: model, temperature, maxTokens, systemPrompt
7. Run conversation turn
8. Check autoBook / requireConfirm to determine post-response action
```

---

## What the Dashboard Must NOT Do

- Call Gemini / OpenAI / Anthropic for customer conversations
- Store or decrypt `byokApiKey` to make AI requests on behalf of a tenant
- Cache `AISettings` values in application state (always read fresh from DB)

---

## Versioning

`AIPromptVersion` in the schema allows the dashboard to version-control the `systemPrompt`.
When the user saves a new prompt:
1. Dashboard writes a new row to `AIPromptVersion` (with `isActive = false`)
2. User activates it → dashboard updates `AISettings.systemPrompt` and sets `AIPromptVersion.isActive = true`

n8n always reads from `AISettings.systemPrompt` (the active version). It does not interact
with `AIPromptVersion` directly.

---

## Changing Provider

Switching from Google Gemini to OpenAI requires only:

```sql
UPDATE "AISettings"
SET provider = 'openai', model = 'gpt-4o-mini', "updatedAt" = now()
WHERE "tenantId" = $1;
```

No n8n code change. No dashboard code change. The workflow selects the correct node
based on the `provider` string at runtime.
