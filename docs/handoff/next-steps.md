# Next Steps

Last updated: 2026-06-23

Phase 3.5 is complete. This document describes exactly what to work on next.

---

## Immediate Next Objective

**Begin Phase 4 — n8n Integration.**

Before writing any code, two infrastructure steps are required:

### Step 1 — Provision n8n

Options:
- **Cloud (fastest):** Sign up at n8n.io (cloud-hosted, no server management)
- **Self-hosted:** Docker Compose — `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`

Once running: create an account, confirm you can access the n8n UI.

### Step 2 — Provision Evolution API

Self-hosted via Docker:
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=your-api-key \
  atendai/evolution-api
```

Once running: connect a WhatsApp Business account (scan QR code in the Evolution API UI).

---

## First Code Task — Webhook Endpoint

After infrastructure is ready, the first code task is:

**Create a signed webhook endpoint at `POST /api/webhooks/n8n`**

Requirements:
1. New route: `src/app/api/webhooks/n8n/route.ts`
2. Reads `N8N_WEBHOOK_SECRET` from env
3. Verifies HMAC-SHA256 signature on every request (reject unsigned requests with 401)
4. Accepts a `{ action, tenantId, payload }` JSON body
5. Routes actions to appropriate handlers (e.g., `conversation.created`, `appointment.booked`)
6. Returns `{ ok: true }` on success

Security notes:
- Always verify the signature before reading the payload
- Do not trust `tenantId` from the payload alone — verify it exists in DB
- Log all webhook calls (at minimum: timestamp, action, tenantId, success/fail)

---

## After Webhook Endpoint — Priority Order

1. **WhatsApp message ingress** — n8n receives from Evolution API → writes Conversation + Message to Supabase → dashboard Inbox shows it
2. **WhatsApp AI response** — n8n calls Gemini → writes ASSISTANT Message → Evolution API sends reply
3. **Email notifications** — n8n polls NotificationJob → sends via Resend/SendGrid
4. **Public booking page** — `src/app/book/[tenant]/page.tsx` (public route, no auth)
5. **Supabase RLS** — Add row-level security policies to Supabase project

---

## Architectural Reminders for Phase 4 Work

- **n8n writes to Supabase directly** — it does not go through dashboard server actions
- **Dashboard webhook endpoint is read-only** — n8n tells it what happened, it doesn't trigger n8n
- **Notification delivery is fully n8n's job** — dashboard only writes `NotificationJob` records
- **All webhook calls must be signed** — never accept unsigned webhooks from n8n
- See [ADR-002](../adr/ADR-002-n8n-architecture.md) before making any architectural decisions

---

## After Phase 4 — Phase 5 (Billing)

See [future-phases.md](../roadmap/future-phases.md).

Not a priority until Phase 4 is complete and the platform has real tenants.
