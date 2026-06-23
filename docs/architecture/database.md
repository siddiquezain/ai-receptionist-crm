# Database

ORM: **Prisma 7** with `@prisma/adapter-pg` (PrismaPg adapter).
Database: **PostgreSQL** hosted on Supabase.
Schema: `prisma/schema.prisma`

---

## Conventions

- **Soft deletes:** All core models have `deletedAt DateTime?`. The Prisma extension in `src/lib/prisma.ts` automatically appends `WHERE deletedAt IS NULL` to all queries. Never call `prisma.model.delete()` — set `deletedAt: new Date()`.
- **IDs:** All models use `@id @default(cuid())` — CUID strings, not auto-increment integers or UUIDs.
- **Tenant scoping:** Every model except `User`, `FeatureFlag` has a `tenantId`. Every query must filter by it.
- **Timestamps:** `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` where relevant.

---

## Enums

```
Role              OWNER | ADMIN | MANAGER | STAFF | VIEWER
Plan              STARTER | PRO | ENTERPRISE
AppointmentStatus PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW | RESCHEDULED
BookingChannel    AI | MANUAL | SELF_SERVICE
ConversationChannel  WEB_CHAT | WHATSAPP
ConversationStatus   OPEN | RESOLVED | ESCALATED | ARCHIVED
MessageRole          USER | ASSISTANT | SYSTEM | STAFF
CalendarProvider     GOOGLE | OUTLOOK
SyncDirection        READ_ONLY | WRITE_ONLY | BIDIRECTIONAL
NotificationType     APPOINTMENT_CONFIRMATION | APPOINTMENT_REMINDER_24H |
                     APPOINTMENT_REMINDER_1H | APPOINTMENT_CANCELLED |
                     APPOINTMENT_RESCHEDULED | FOLLOW_UP |
                     STAFF_NEW_BOOKING | STAFF_CANCELLATION
NotificationChannel  EMAIL | WHATSAPP | SMS | IN_APP
JobStatus            PENDING | PROCESSING | SENT | FAILED | CANCELLED
AuditActorType       USER | SYSTEM | AI
```

---

## Models

### Identity & Tenancy

**User**
Bridge between Supabase Auth and Prisma. One User can belong to many Tenants.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key |
| supabaseAuthId | String | Unique — links to Supabase auth.users |
| email | String | Unique |
| name | String? | Display name |
| avatarUrl | String? | |
| memberships | TenantMember[] | Roles in each tenant |

**Tenant**
The core working unit. Each business has one Tenant.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | |
| name | String | Display name |
| slug | String | Unique — used in URL routing |
| logo | String? | URL |
| plan | Plan | STARTER default |
| timezone | String | "UTC" default |
| parentTenantId | String? | Non-null for agency sub-tenants |
| deletedAt | DateTime? | Soft delete |

**TenantMember**
Join table between User and Tenant with role assignment.

| Field | Type | Notes |
|---|---|---|
| userId | String | FK → User |
| tenantId | String | FK → Tenant |
| role | Role | VIEWER default |
| @@unique([userId, tenantId]) | | One membership per user per tenant |

---

### Scheduling

**Service**
Bookable service type offered by the business.

| Field | Type | Notes |
|---|---|---|
| name | String | |
| duration | Int | Minutes |
| bufferTime | Int | Post-appointment buffer, minutes (default 0) |
| price | Decimal? | |
| currency | String | "USD" default |
| maxPerDay | Int? | Cap on daily bookings |
| maxPerSlot | Int? | Concurrent bookings per time slot |
| isActive | Boolean | Soft-available |
| deletedAt | DateTime? | Soft delete |

**WorkingHours**
Business hours per day of week, optionally per team member.

| Field | Type | Notes |
|---|---|---|
| dayOfWeek | Int | 0 (Sun) – 6 (Sat) |
| startTime | String | "HH:mm" |
| endTime | String | "HH:mm" |
| isOpen | Boolean | |
| teamMemberId | String? | Null = tenant-wide default |

**BusyPeriod**
Time blocks (meetings, holidays, breaks). Supports recurring rules.

| Field | Type | Notes |
|---|---|---|
| startAt | DateTime | |
| endAt | DateTime | |
| isRecurring | Boolean | |
| recurrenceRule | String? | RRule string (e.g. `FREQ=WEEKLY;BYDAY=MO`) |
| teamMemberId | String? | Null = blocks all staff |

**Appointment**
A booking between a customer, service, and optionally a team member.

| Field | Type | Notes |
|---|---|---|
| customerId | String | FK → Customer |
| serviceId | String | FK → Service |
| teamMemberId | String? | FK → TeamMember |
| conversationId | String? | FK → Conversation (if booked via AI chat) |
| startAt | DateTime | |
| endAt | DateTime | |
| status | AppointmentStatus | PENDING default |
| bookedVia | BookingChannel | AI default |
| confirmedAt | DateTime? | |
| cancelledAt | DateTime? | |
| cancellationReason | String? | |
| deletedAt | DateTime? | Soft delete |

---

### CRM

**Customer**
A contact record, unique per tenant by phone or email.

| Field | Type | Notes |
|---|---|---|
| name | String | |
| email | String? | Unique per tenant |
| phone | String? | Unique per tenant |
| tags | String[] | Free-form labels |
| source | String? | Acquisition channel |
| lastSeenAt | DateTime? | Updated on conversation activity |
| deletedAt | DateTime? | Soft delete |
| @@unique([tenantId, phone]) | | |
| @@unique([tenantId, email]) | | |

---

### AI Chat Inbox

**Conversation**
A chat thread with a customer, from one channel.

| Field | Type | Notes |
|---|---|---|
| customerId | String? | FK → Customer |
| channel | ConversationChannel | WEB_CHAT or WHATSAPP |
| externalId | String? | WhatsApp thread ID from Evolution API |
| status | ConversationStatus | OPEN default |
| assignedToId | String? | FK → TeamMember |
| aiHandled | Boolean | True while AI is responding |
| summary | String? | AI-generated summary |
| extractedContext | Json? | Structured data extracted from conversation |
| memoryVersion | Int | Incremented when context is updated |

**Message**
Individual message within a conversation.

| Field | Type | Notes |
|---|---|---|
| conversationId | String | FK → Conversation |
| role | MessageRole | USER / ASSISTANT / SYSTEM / STAFF |
| content | String | |
| isDraft | Boolean | |
| tokensUsed | Int? | Token count for ASSISTANT messages |
| provider | String? | AI provider used |
| model | String? | Model name |

**ConversationNote**
Internal staff note on a conversation (not visible to customer).

**Attachment**
File uploaded in a conversation. Stored in Supabase Storage, referenced by `storageKey`.

---

### Team

**TeamMember**
A staff member record. May or may not have a linked `userId` (invited but not yet accepted).

| Field | Type | Notes |
|---|---|---|
| userId | String? | FK → User (null if invite pending) |
| name | String | |
| email | String | |
| isActive | Boolean | Deactivated members cannot be assigned |
| maxAppointmentsPerDay | Int? | Capacity cap |
| inviteToken | String? | Unique token for invite link |
| deletedAt | DateTime? | |

**TeamMemberService**
Many-to-many: which services each team member can deliver.

---

### AI Configuration

**AISettings**
One record per tenant. Controls AI provider and behavior.

| Field | Type | Notes |
|---|---|---|
| provider | String | "openai" default |
| model | String | "gpt-4o" default |
| fallbackProvider | String? | Used if primary fails |
| temperature | Float | 0.7 default |
| systemPrompt | String? | Customized per tenant |
| maxTokens | Int | 1000 default |
| byokApiKey | String? | AES-256-GCM encrypted |
| autoBook | Boolean | AI can book without staff approval |
| requireConfirm | Boolean | AI-booked appointments start as PENDING |

**AIPromptVersion**
Version history of system prompts. Supports rollback. One active version at a time (`isActive`).

**AIUsageRecord**
Append-only token tracking per AI call.

| Field | Type | Notes |
|---|---|---|
| provider | String | |
| model | String | |
| promptTokens | Int | |
| completionTokens | Int | |
| totalTokens | Int | |
| estimatedCostUsd | Decimal | |
| isByok | Boolean | True if using customer's own API key |

---

### Calendar Integration

**CalendarIntegration**
OAuth connection to Google or Outlook calendar.

| Field | Type | Notes |
|---|---|---|
| provider | CalendarProvider | GOOGLE or OUTLOOK |
| accessToken | String | Encrypted |
| refreshToken | String | Encrypted |
| tokenExpiresAt | DateTime | |
| calendarId | String | Calendar to sync |
| syncDirection | SyncDirection | READ_ONLY / WRITE_ONLY / BIDIRECTIONAL |

---

### Analytics & Observability

**AnalyticsEvent**
Append-only raw event stream. One row per event.

| Field | Type | Notes |
|---|---|---|
| event | String | e.g. `appointment.booked`, `conversation.started` |
| properties | Json | Event-specific data |
| occurredAt | DateTime | |
| @@index([tenantId, event, occurredAt]) | | |

**DailySnapshot**
Pre-computed daily aggregate metrics. One row per tenant per day.
Contains: appointments booked/confirmed/cancelled/completed/no-show, conversations started/resolved/escalated, AI messages/tokens/cost, booking conversion rate, new customers, revenue.

**NotificationJob**
Queue table for outbound notifications. n8n (Phase 4) polls this.

| Field | Type | Notes |
|---|---|---|
| type | NotificationType | What kind of notification |
| channel | NotificationChannel | EMAIL / WHATSAPP / SMS / IN_APP |
| recipient | String | Email address or phone number |
| payload | Json | Template variables |
| status | JobStatus | PENDING default |
| scheduledFor | DateTime | When to send |
| attempts | Int | Retry counter |
| failureReason | String? | Last error |
| @@index([status, scheduledFor]) | | Efficient polling |

---

### Audit Log

**AuditLog**
Immutable audit trail. Set by `logAudit()` — fire-and-forget, never blocks mutations.

| Field | Type | Notes |
|---|---|---|
| actorId | String? | User ID or null for system/AI actors |
| actorType | AuditActorType | USER / SYSTEM / AI |
| action | String | e.g. `appointment.cancelled`, `customer.deleted` |
| resource | String | Model name |
| resourceId | String | Record ID |
| changes | Json? | Before/after snapshot |
| ipAddress | String? | |
| userAgent | String? | |

---

### Feature Management

**FeatureFlag**
Platform-level feature gates, enabled per plan.

**EntitlementOverride**
Per-tenant overrides. Can enable a flag for a STARTER tenant or disable for an ENTERPRISE one. Supports optional expiry.

---

## Relationship Map

```
User ──< TenantMember >── Tenant
                              │
                  ┌───────────┼───────────────┐
                  │           │               │
               Service   TeamMember       Customer
                  │           │               │
              Appointment ────┘        Conversation
                  │                        │
                  └── (conversationId) ──▶ │
                                        Message
                                        ConversationNote
                                        Attachment

Tenant ──▶ AISettings (1:1)
Tenant ──▶ AIPromptVersion (1:many)
Tenant ──▶ AIUsageRecord (1:many)
Tenant ──▶ AnalyticsEvent (1:many)
Tenant ──▶ DailySnapshot (1:many)
Tenant ──▶ NotificationJob (1:many)
Tenant ──▶ AuditLog (1:many)
Tenant ──▶ CalendarIntegration (1:many)
Tenant ──▶ FeatureFlag (via EntitlementOverride)
Tenant ──▶ Tenant (agency parent-child via parentTenantId)
```
