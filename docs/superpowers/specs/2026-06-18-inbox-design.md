# Inbox — Design Specification

**Date:** 2026-06-18
**Status:** Approved
**Author:** Mohammed Siddique Zain

---

## 1. Overview

A 3-column conversation inbox at `/{slug}/inbox`. Staff primarily monitor the AI receptionist and occasionally take over when needed. The AI handles conversations autonomously; when it escalates (or a customer requests a human, or staff intervenes manually), it switches to suggestion mode — drafting replies that staff review and send.

---

## 2. Layout & URL Structure

**URL:** `/{slug}/inbox?conversation={id}`

The selected conversation ID lives in the URL so conversations are deep-linkable and the Server Component can SSR the selected thread on first paint.

### Three columns

| Column | Width | Contents |
|---|---|---|
| Left | 280px fixed | Conversation list |
| Middle | flex-1 | Message thread |
| Right | 320px fixed | Customer + AI Activity tabs |

**Left column — conversation list**
- Sorted: escalated conversations float to the top, then `updatedAt desc`
- Each row: customer name, channel badge (WhatsApp / Web Chat), last message preview (1 line truncated), relative timestamp, status dot (green = OPEN, amber = ESCALATED, grey = RESOLVED)

**Middle column — message thread**
- Messages grouped by sender role: `CUSTOMER`, `ASSISTANT`, `STAFF`
- AI messages have a subtle tint and a small robot icon
- Sticky banner at top when conversation is ESCALATED or staff has taken over
- Thread header: conversation title, channel, status, "Take over" / "Release to AI" / "Resolve" action buttons

**Right column — tabbed panel**
- "Customer" tab: avatar, name, contact info, tags, next upcoming appointment, total appointments count (links to `/{slug}/customers/{id}`)
- "AI Activity" tab: chronological log of AI decisions for the selected conversation

**Empty state (no conversation selected):** When `?conversation=` is absent (e.g. first visit, or all conversations resolved), the middle column shows a centred empty state: inbox icon + *"Select a conversation to get started."* The right panel is hidden.

**Mobile:** List fills screen → tap row → thread-only view with back button. Right panel hidden.

---

## 3. Data Layer

### Query functions (`src/lib/inbox-queries.ts`)

```
getConversations(tenantId)
  → ConversationListItem[] — all non-archived conversations
    ordered: ESCALATED first, then updatedAt desc
    includes: customer name, channel, status, last message preview, assignedToId

getConversationMessages(tenantId, conversationId)
  → Message[] — last 100 messages, ascending (top = oldest)
    includes: role (CUSTOMER | ASSISTANT | STAFF), content, createdAt, isDraft

getConversationDetail(tenantId, conversationId)
  → ConversationDetail — status, assignedToId, channel, customerId

getConversationCustomerSnapshot(tenantId, customerId)
  → CustomerSnapshot — name, email, phone, tags, avatarUrl,
    nextAppointment (service name, startAt, status),
    totalAppointments count

getConversationAIActivity(tenantId, conversationId)
  → AIActivityEntry[] — from AIUsageRecord filtered by conversationId
    includes: createdAt, description, confidenceScore?
```

### Server actions (`src/lib/actions/inbox.ts`)

```
sendMessage(tenantId, conversationId, content)
  → inserts Message { role: STAFF }, revalidatePath

takeoverConversation(tenantId, conversationId, userId)
  → sets conversation.assignedToId = userId, revalidatePath

releaseConversation(tenantId, conversationId)
  → clears conversation.assignedToId, revalidatePath

resolveConversation(tenantId, conversationId)
  → sets conversation.status = RESOLVED, revalidatePath
```

---

## 4. Real-Time (Supabase Realtime)

`InboxClient` subscribes to two channels on mount, torn down on unmount or conversation change:

1. **`messages:conversation_id=eq.{id}`** — new messages appended to local state immediately (no page reload)
2. **`conversations:tenant_id=eq.{tenantId}`** — status changes broadcast to all staff; triggers re-sort of conversation list and escalation banner

---

## 5. AI Handoff Mechanics

All three triggers converge on the same state: `conversation.assignedToId = staffUserId`.

### Trigger 1 — Manual takeover
"Take over" button in thread header (visible when `assignedToId` is null). Staff clicks → `takeoverConversation` fires → Realtime broadcasts to all staff → button swaps to "Release to AI".

### Trigger 2 — AI escalation
AI sets `conversation.status = ESCALATED` via the AI chat API route. Realtime picks this up → amber sticky banner in thread: *"AI needs help — review and take over."* → conversation floats to top of list with amber dot. Staff clicks "Take over" in the banner.

### Trigger 3 — Customer requests human
AI detects human-request intent → triggers same escalation path as Trigger 2. UI is identical.

### Suggestion mode
Active when `assignedToId` is set. AI continues generating drafts but does not send them. Drafts arrive via Realtime as `Message { role: ASSISTANT, isDraft: true }`. In the message input area, the draft surfaces as pre-filled grey text with:
- **Send** — adopts draft, sends as staff message
- **Dismiss** — clears input

Staff can ignore the draft entirely and type their own reply.

### Release to AI
"Release to AI" button in thread header → `releaseConversation` → clears `assignedToId` → AI resumes autonomous handling → suggestion mode deactivates.

---

## 6. Right Panel Tabs

### "Customer" tab
Read-only snapshot from the customer record:
- Avatar, name, email, phone, tags
- Next upcoming appointment (service name, date/time, status badge)
- Total appointments count (links to `/{slug}/customers/{id}`)
- If no customer linked: *"No customer linked."*

### "AI Activity" tab
Chronological log from `AIUsageRecord` filtered by `conversationId`:
- Each entry: timestamp, plain-text description of AI action, optional confidence score
- Read-only; gives staff context on what the AI has already attempted

---

## 7. Component Map

```
src/
├── lib/
│   ├── inbox-queries.ts
│   └── actions/
│       └── inbox.ts
│
├── components/
│   └── inbox/
│       ├── inbox-client.tsx              # Client — Realtime subscriptions, conversation selection
│       ├── conversation-list.tsx         # Server-rendered list, patched by client
│       ├── conversation-list-item.tsx    # Row with status dot, preview, channel badge
│       ├── message-thread.tsx            # Scrollable message list
│       ├── message-bubble.tsx            # Single message (CUSTOMER / ASSISTANT / STAFF)
│       ├── message-input.tsx             # Text input + Send + AI draft suggestion UI
│       ├── thread-header.tsx             # Takeover / Release / Resolve buttons + status
│       ├── escalation-banner.tsx         # Sticky amber banner for ESCALATED conversations
│       ├── right-panel.tsx               # Tab container
│       ├── customer-snapshot.tsx         # "Customer" tab content
│       └── ai-activity-log.tsx           # "AI Activity" tab content
│
└── app/(dashboard)/[tenant]/inbox/
    └── page.tsx                          # Server Component — fetches initial data
```

---

## 8. Page Component (Server)

```
InboxPage (Server Component)
  ├── awaits params → resolves tenant
  ├── awaits searchParams → reads ?conversation=
  ├── parallel fetches:
  │     getConversations(tenantId)
  │     getConversationMessages(tenantId, conversationId?)
  │     getConversationDetail(tenantId, conversationId?)
  │     getConversationCustomerSnapshot(...)
  │     getConversationAIActivity(...)
  └── renders InboxClient with all data as props
```

`InboxClient` takes over from there: manages Realtime subscriptions, local state patches, and passes derived state down to child components.

---

## 9. Constraints & Decisions

- **No typing indicators** — out of scope for v1
- **No file/image attachments in the send UI** — messages are plain text only; attachments from customers are displayed read-only if the `Attachment` model is populated by the webhook
- **No pagination on message thread** — last 100 messages covers all real-world cases at this stage; infinite scroll can be added later
- **`isDraft` flag on Message** — needs a migration adding `isDraft Boolean @default(false)` to the `Message` model; the AI API route sets this when in suggestion mode
- **`assignedToId` on Conversation** — needs a migration adding `assignedToId String?` with a relation to `User`; this is the single source of truth for handoff state
