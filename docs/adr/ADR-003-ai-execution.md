# ADR-003: AI Execution Strategy

**Status:** Accepted
**Date:** 2026-06-17
**Author:** Mohammed Siddique Zain

---

## Context

The platform uses AI in two distinct contexts:

1. **In-dashboard Inbox chat** — A staff member is viewing a conversation and the AI responds to the customer in real time. The dashboard needs to call an AI provider and stream/return the response within a single HTTP request.

2. **Automated booking flows** (Phase 4) — An inbound WhatsApp message from a customer triggers an AI model to extract booking intent, check availability, and book an appointment. This runs without a user session and may handle many conversations concurrently.

These two use cases have different requirements:
- Inbox chat: low latency, tied to a user session, one conversation at a time
- Automated booking: batch-capable, retry-safe, no user session, may run for seconds

---

## Decision

**AI execution is split by context:**

**Dashboard AI (current, Implemented):**
The dashboard handles AI inference for the in-browser Inbox only. The multi-provider abstraction layer (`src/lib/ai/`) selects a provider based on the tenant's `AISettings` and calls the API within a Server Action. This is appropriate because the user is waiting for a response.

**Automation AI (Phase 4, Accepted):**
All AI execution for automated flows (WhatsApp auto-booking, follow-up generation, intent extraction) runs **inside n8n**. Gemini is the planned primary model for automation flows. The dashboard does not execute AI for automation purposes.

The boundary rule: **If AI is running because of a user action in the dashboard → Dashboard AI layer. If AI is running because of an external event (WhatsApp, webhook, cron) → n8n.**

---

## Rationale

- **Serverless constraints:** Next.js on Vercel has execution time limits. Long-running AI inference in automation scenarios can exceed these limits.
- **Retry safety:** n8n provides built-in retry logic. AI calls from Server Actions have no retry mechanism.
- **Concurrency:** n8n can handle many concurrent AI calls across conversations. The dashboard is not designed as an AI inference server.
- **Model selection:** Gemini is optimized for high-throughput automation scenarios and has better price/performance for n8n flows.
- **Separation of concerns:** Keeping automation AI in n8n prevents the dashboard from becoming an inference router.

---

## Consequences

- `src/lib/ai/` handles only in-dashboard Inbox conversations. Do not expand it to handle automated flows.
- The `AISettings` model stores configuration for both contexts: `provider`/`model` for Inbox, and future fields for automation provider selection.
- `AIUsageRecord` tracks tokens for dashboard-originated AI calls. n8n may write its own usage records or use a separate tracking mechanism.
- Gemini integration in `src/lib/ai/providers/gemini.ts` exists for Inbox use. Gemini-for-automation will be configured in n8n directly, not through this layer.
- The Grok provider (`src/lib/ai/providers/grok.ts`) is a skeleton — complete before enabling it for Inbox use.

See also: [ADR-002](ADR-002-n8n-architecture.md).
