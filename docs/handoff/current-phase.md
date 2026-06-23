# Current Phase

Last updated: 2026-06-23

---

## Status

**No active development phase.**

Phase 3.5 (Security Hardening) was completed on 2026-06-23. The codebase is clean and production-ready for features built to date.

The next phase is **Phase 4 — n8n + WhatsApp + Public Booking**. It has not yet been started.

---

## Phase 3.5 — Security Hardening (Complete)

**Completed:** 2026-06-23

### Goals (All Achieved)
- [x] Auth guards on all server actions (tenant membership + RBAC)
- [x] BYOK API key encryption at rest
- [x] Audit log instrumentation on sensitive actions
- [x] HTTP security headers
- [x] Next.js 16 middleware properly wired
- [x] Clean lint + build

### Exit Criteria Met
All critical and high-severity findings from the security audit resolved.
See: [docs/security/phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md)

---

## Next Phase: Phase 4 — n8n + WhatsApp + Public Booking

**Status:** Not Started
**Objective:** Activate automation, WhatsApp channel, and self-service booking

### Key Goals
1. n8n workflow orchestrator connected to the platform
2. WhatsApp inbound/outbound via Evolution API
3. AI auto-booking from WhatsApp conversations
4. NotificationJob delivery (email first)
5. Public self-service booking page

### Prerequisites
- n8n instance provisioned
- Evolution API instance provisioned
- `N8N_WEBHOOK_SECRET` environment variable defined

### Known Blockers
- None at code level — infrastructure provisioning is the first step

See [future-phases.md](../roadmap/future-phases.md) for full Phase 4 deliverables.

---

## How to Start Phase 4

1. Read [ADR-002](../adr/ADR-002-n8n-architecture.md) and [ADR-003](../adr/ADR-003-ai-execution.md) — these define the architectural decisions for Phase 4 work
2. Provision n8n (cloud: n8n.io, or self-hosted: Docker)
3. Provision Evolution API (self-hosted Docker recommended)
4. Start with Phase 4a: signed webhook endpoint in the dashboard
5. Then Phase 4b: Evolution API + WhatsApp message ingress
6. See [next-steps.md](next-steps.md) for the first concrete action
