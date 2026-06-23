# Documentation

Engineering handbook for the AI Appointment SaaS Dashboard.

**Starting a new Claude Code session? Read [handoff/claude-context.md](handoff/claude-context.md) first.**

---

## Handoff

| Document | Purpose |
|---|---|
| [claude-context.md](handoff/claude-context.md) | **Start here.** Full project context for new sessions. |
| [project-status.md](handoff/project-status.md) | What's done, what's pending, known issues |
| [current-phase.md](handoff/current-phase.md) | Active phase, goals, blockers |
| [next-steps.md](handoff/next-steps.md) | Exactly what to work on next |

## Architecture

| Document | Purpose |
|---|---|
| [system-overview.md](architecture/system-overview.md) | Full architecture diagram and narrative |
| [responsibilities.md](architecture/responsibilities.md) | What each system owns |
| [data-flow.md](architecture/data-flow.md) | How data moves through the system |
| [database.md](architecture/database.md) | All Prisma models and relationships |
| [authentication.md](architecture/authentication.md) | Supabase SSR auth flow |
| [security.md](architecture/security.md) | RBAC, encryption, audit log |
| [integrations.md](architecture/integrations.md) | AI providers, WhatsApp, Calendar |
| [deployment.md](architecture/deployment.md) | Build, env vars, setup |

## ADRs (Architectural Decision Records)

| ADR | Status | Decision |
|---|---|---|
| [ADR-001](adr/ADR-001-dashboard-responsibilities.md) | Implemented | Dashboard owns UI/CRUD only |
| [ADR-002](adr/ADR-002-n8n-architecture.md) | Accepted | n8n owns all workflow orchestration |
| [ADR-003](adr/ADR-003-ai-execution.md) | Accepted | AI automation runs in n8n, not dashboard |
| [ADR-004](adr/ADR-004-notification-processing.md) | Implemented | Async queue-based notifications |
| [ADR-005](adr/ADR-005-security-model.md) | Implemented | Layered security model |
| [ADR-006](adr/ADR-006-multi-tenant-isolation.md) | Implemented | Row-level isolation with tenantId |
| [ADR-007](adr/ADR-007-supabase-source-of-truth.md) | Implemented | Supabase is the single source of truth |

## Roadmap

| Document | Purpose |
|---|---|
| [master-roadmap.md](roadmap/master-roadmap.md) | All phases with status and exit criteria |
| [completed-phases.md](roadmap/completed-phases.md) | Deliverables per completed phase |
| [future-phases.md](roadmap/future-phases.md) | Phase 4+ plans and dependencies |

## Development

| Document | Purpose |
|---|---|
| [coding-standards.md](development/coding-standards.md) | TypeScript, naming, patterns, styling |
| [project-structure.md](development/project-structure.md) | Folder-by-folder guide |
| [conventions.md](development/conventions.md) | Server actions, queries, components, patterns |
| [testing.md](development/testing.md) | Current state and recommended approach |
| [troubleshooting.md](development/troubleshooting.md) | Common errors and fixes |

## Workflows

| Document | Purpose |
|---|---|
| [booking-lifecycle.md](workflows/booking-lifecycle.md) | Appointment state machine |
| [conversation-lifecycle.md](workflows/conversation-lifecycle.md) | Conversation state machine |
| [notification-lifecycle.md](workflows/notification-lifecycle.md) | Notification queue and delivery |
| [analytics-lifecycle.md](workflows/analytics-lifecycle.md) | Events → snapshots → dashboard |

## Security Audit

| Document | Purpose |
|---|---|
| [phase-3.5-audit.md](security/phase-3.5-audit.md) | Phase 3.5 security audit report |

## Design Specs & Plans (Historical)

| Location | Purpose |
|---|---|
| [superpowers/specs/](superpowers/specs/) | Feature design specifications |
| [superpowers/plans/](superpowers/plans/) | Historical implementation plans |
