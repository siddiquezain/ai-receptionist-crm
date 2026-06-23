# Project Structure

Detailed guide to every significant folder and file in the repository.

---

## Root

```
appointment-saas-dashboard/
├── prisma/
│   ├── schema.prisma          # Single source of truth for DB schema
│   └── migrations/            # Prisma migration files
├── prisma.config.ts           # PrismaPg adapter configuration
├── public/                    # Static assets (fonts, icons, images)
├── scripts/
│   └── seed-dev-user.ts       # Seeds a dev user + tenant for local development
├── src/                       # All application code (see below)
├── docs/                      # This documentation
├── next.config.ts             # Next.js config + security headers
├── tailwind.config.ts         # Tailwind CSS v4 config
├── tsconfig.json              # TypeScript config (strict mode, path aliases)
├── components.json            # shadcn/ui configuration
├── eslint.config.mjs          # ESLint configuration
├── CLAUDE.md                  # Claude Code project instructions
├── AGENTS.md                  # Next.js 16 breaking-changes notice
└── README.md                  # Basic setup guide
```

---

## src/

### src/app/ — Next.js App Router

```
app/
├── (auth)/                    # Auth route group — no auth required
│   ├── layout.tsx             # Auth layout (centered card, no sidebar)
│   ├── login/page.tsx         # Login form
│   ├── register/page.tsx      # Registration form (name + email + password + business name)
│   └── forgot-password/page.tsx
│
├── (dashboard)/               # Dashboard route group
│   └── [tenant]/              # Dynamic segment — tenant slug (e.g., /acme-salon/)
│       ├── layout.tsx         # Dashboard shell (sidebar + topbar)
│       ├── page.tsx           # Root redirect to /dashboard
│       ├── dashboard/
│       │   └── page.tsx       # KPI overview — stat strip, trend chart, upcoming appts, inbox snapshot
│       ├── appointments/
│       │   └── page.tsx       # Appointment list with filters + calendar toggle
│       ├── customers/
│       │   ├── page.tsx       # Customer directory (searchable, sortable table)
│       │   └── [id]/
│       │       └── page.tsx   # Customer detail (profile, appointments, conversations, activity)
│       ├── inbox/
│       │   └── page.tsx       # AI chat inbox (conversation list + thread view)
│       ├── analytics/
│       │   └── page.tsx       # Charts and KPI reports
│       └── settings/
│           ├── layout.tsx     # Settings sub-nav layout
│           ├── page.tsx       # Settings index (redirects to profile)
│           ├── profile/page.tsx       # Workspace name, logo, timezone
│           ├── team/page.tsx          # Team members + invite
│           ├── working-hours/page.tsx # Business hours per day
│           └── ai/page.tsx            # AI provider, model, BYOK key, auto-booking config
│
├── api/
│   └── auth/
│       └── callback/route.ts  # Supabase OAuth code exchange + Prisma user/tenant creation
│
├── layout.tsx                 # Root layout (providers: Supabase, React Query, next-themes)
├── page.tsx                   # Root — redirects authenticated users to their tenant
└── globals.css                # Global styles, Tailwind imports, CSS custom properties
```

### src/components/ — React Components

```
components/
├── ui/                        # shadcn/ui primitives (never modify these directly)
│   ├── button.tsx, input.tsx, label.tsx, badge.tsx
│   ├── dialog.tsx, sheet.tsx, popover.tsx, dropdown-menu.tsx
│   ├── table.tsx, avatar.tsx, card.tsx, separator.tsx
│   ├── form.tsx, select.tsx, switch.tsx, checkbox.tsx, textarea.tsx
│   ├── calendar.tsx, tabs.tsx, tooltip.tsx, skeleton.tsx, sonner.tsx
│   └── ... (26 total)
│
├── dashboard/                 # Dashboard shell + widgets
│   ├── sidebar.tsx            # Main nav sidebar
│   ├── nav-item.tsx           # Individual nav link (active state aware)
│   ├── user-menu.tsx          # Profile dropdown in topbar
│   ├── stat-card.tsx          # KPI card (value + delta + optional sparkline)
│   ├── trend-chart.tsx        # Line chart for time-series KPIs
│   ├── upcoming-appointments.tsx  # Next N appointments widget
│   └── inbox-snapshot.tsx     # Unread count + latest conversation preview
│
├── appointments/
│   ├── appointments-client.tsx    # Client wrapper with state, filters, actions
│   ├── appointments-table.tsx     # Sortable, filterable table
│   ├── appointments-filters.tsx   # Status, date range, team member filters
│   ├── appointment-slide-over.tsx # Detail + edit panel (Sheet)
│   └── appointment-status-badge.tsx  # Color-coded status pill
│
├── customers/
│   ├── customers-client.tsx   # Client wrapper
│   ├── customers-table.tsx    # Contact directory
│   ├── customer-create-slide-over.tsx  # New customer form
│   ├── customer-avatar.tsx    # Avatar with initials fallback
│   └── detail/
│       ├── customer-header.tsx        # Name, email, phone, tags
│       ├── customer-edit-form.tsx     # Inline profile editor
│       ├── customer-appointments.tsx  # Appointment history list
│       ├── customer-conversations.tsx # Conversation history
│       └── customer-activity.tsx      # Unified activity timeline
│
├── inbox/
│   ├── inbox-client.tsx       # Main inbox container (split pane)
│   ├── conversation-list.tsx  # Left pane: conversation list
│   ├── conversation-list-item.tsx  # Single conversation preview row
│   ├── message-thread.tsx     # Right pane: scrollable message history
│   ├── message-bubble.tsx     # Individual message (user/AI/staff variants)
│   ├── message-input.tsx      # Compose input + send button + file upload
│   ├── thread-header.tsx      # Customer name, channel badge, assign button
│   ├── customer-snapshot.tsx  # Right sidebar: upcoming appt, tags, notes
│   ├── escalation-banner.tsx  # Alert when conversation is ESCALATED
│   ├── ai-activity-log.tsx    # Token count, model, estimated cost per message
│   └── right-panel.tsx        # Collapsible right sidebar container
│
├── analytics/
│   ├── booking-overview-chart.tsx    # Stacked bar: booked/completed/cancelled
│   ├── revenue-chart.tsx             # Area chart: revenue over time
│   ├── ai-performance.tsx            # Metrics: AI-handled %, escalation rate, conversion
│   ├── peak-hours-heatmap.tsx        # Day × hour grid with intensity shading
│   ├── services-breakdown.tsx        # Revenue/bookings by service type
│   ├── staff-performance.tsx         # Per-staff completion + no-show rates
│   └── date-range-picker.tsx         # Custom date range selector
│
├── settings/
│   ├── profile-form.tsx       # Workspace name, logo URL, timezone
│   ├── team-members-panel.tsx # Team roster + invite form + deactivate
│   ├── working-hours-form.tsx # Hours per day of week
│   ├── ai-settings-form.tsx   # Provider, model, temp, BYOK key, auto-book
│   └── settings-nav-link.tsx  # Sub-navigation link
│
└── providers.tsx              # Root client providers (Supabase, React Query, Toaster)
```

### src/lib/ — Utilities & Business Logic

```
lib/
├── actions/                   # Server Actions (mutations only — "use server")
│   ├── appointments.ts        # create, update, cancel, delete
│   ├── customers.ts           # create, update, delete
│   ├── inbox.ts               # send message, assign, resolve, escalate, archive
│   └── settings.ts            # update profile, AI settings, team, working hours
│
├── ai/                        # Multi-provider AI abstraction (in-dashboard Inbox only)
│   ├── index.ts               # getAIProvider(settings) factory function
│   ├── types.ts               # AIProvider interface, AIMessage, AIResponse
│   ├── pricing.ts             # Cost per 1k tokens by provider + model
│   └── providers/
│       ├── openai.ts          # OpenAI adapter
│       ├── anthropic.ts       # Anthropic adapter
│       ├── gemini.ts          # Google Gemini adapter
│       └── grok.ts            # Grok adapter (skeleton — not production ready)
│
├── supabase/
│   ├── server.ts              # createServerClient() with SSR cookie management
│   └── client.ts              # createBrowserClient() for Client Components
│
├── prisma.ts                  # Prisma singleton with soft-delete extension
├── server-auth.ts             # requireAuth(), requireTenantAccess()
├── permissions.ts             # RBAC: hasPermission(), requirePermission(), Permission type
├── crypto.ts                  # encrypt(), decrypt(), isEncrypted() — AES-256-GCM
├── audit.ts                   # logAudit() — fire-and-forget AuditLog write
├── tenant.ts                  # getTenantIdFromHeaders(), resolveTenantBySlug()
├── entitlements.ts            # isFeatureEnabled(tenant, flagKey) — plan + override check
├── utils.ts                   # cn() class merger, slugify(), other shared utils
│
├── dashboard-queries.ts       # getDashboardStats(), getUpcomingAppointments(), etc.
├── appointments-queries.ts    # listAppointments(), getAppointment(), etc.
├── customers-queries.ts       # listCustomers(), getCustomer(), etc.
├── inbox-queries.ts           # listConversations(), getConversation(), getMessages(), etc.
└── analytics-queries.ts       # getBookingTrends(), getRevenue(), getPeakHours(), etc.
```

### Other src/ folders

```
src/
├── validators/                # Zod schemas (used in forms + server actions)
│   ├── appointment.ts
│   ├── customer.ts
│   ├── ai-settings.ts
│   └── team-member.ts
│
├── types/
│   └── index.ts               # Shared TypeScript types not from Prisma
│
└── proxy.ts                   # Next.js 16 middleware (exports `proxy` function)
```
