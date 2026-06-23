# Conversation Lifecycle

The complete lifecycle of a customer conversation through the AI Chat Inbox.

---

## State Machine

```
CUSTOMER INITIATES CONTACT
         │
         ├── Web Chat widget ──────────────────────────────────────┐
         │                                                         │
         └── WhatsApp (Phase 4) ─── Evolution API ─── n8n ────────┤
                                                                   │
                                                                   ▼
                                                          ┌──────────────┐
                                                          │     OPEN     │
                                                          │ aiHandled:   │
                                                          │    true      │
                                                          └──────┬───────┘
                                                                 │
                                    ┌────────────────────────────┼────────────────────────────┐
                                    │                            │                            │
                                    ▼                            ▼                            ▼
                             AI responds              AI books appointment          Customer asks to
                             (ASSISTANT msg)          (creates Appointment)         speak to human
                                    │                            │                            │
                                    │                            │                    ┌───────▼────────┐
                                    │                            │                    │  Staff assigned │
                                    │                            │                    │  aiHandled:     │
                                    │                            │                    │    false        │
                                    │                            │                    └───────┬────────┘
                                    │                            │                            │
                                    │                   ┌────────┴────────┐                  │
                                    │                   │  Conversation   │                  │
                                    │                   │  continues to   │                  │
                                    │                   │  track booking  │                  │
                                    │                   └─────────────────┘                  │
                                    │                                                        │
                         ┌──────────┴────────────────────────────────────────┬──────────────┘
                         │                                                   │
                         ▼                                                   ▼
                  ┌────────────┐                                    ┌──────────────┐
                  │  RESOLVED  │◀─── Staff marks resolved          │  ESCALATED   │◀─── Staff escalates
                  └────────────┘                                    └──────┬───────┘
                                                                           │
                                                                    (Eventually)
                                                                           │
                                                                    ┌──────▼───────┐
                                                                    │   RESOLVED   │
                                                                    └──────────────┘

                  ┌────────────┐
                  │  ARCHIVED  │◀─── Staff archives (from any terminal state)
                  └────────────┘
```

---

## Status Definitions

| Status | Meaning |
|---|---|
| `OPEN` | Active conversation, AI or staff responding |
| `RESOLVED` | Issue resolved, no further action needed |
| `ESCALATED` | Needs human attention — flagged for priority review |
| `ARCHIVED` | Closed and moved to archive — not deleted |

---

## Channels

| Channel | Description | Current Status |
|---|---|---|
| `WEB_CHAT` | In-browser chat widget embedded on customer-facing site | Active |
| `WHATSAPP` | WhatsApp messages via Evolution API + n8n | Phase 4 |

---

## Key Fields on Conversation

| Field | Purpose |
|---|---|
| `aiHandled` | `true` = AI is responding. `false` = staff has taken over. |
| `assignedToId` | Which team member is handling (null = unassigned) |
| `extractedContext` | JSON — structured data AI has extracted (customer intent, service requested, etc.) |
| `summary` | AI-generated summary of the conversation |
| `memoryVersion` | Incremented when `extractedContext` is updated — used to track context staleness |
| `externalId` | WhatsApp thread ID from Evolution API (null for web chat) |

---

## Flow: Web Chat (Current)

```
1. Customer opens chat widget
2. Sends first message
3. Dashboard creates Conversation (channel: WEB_CHAT, status: OPEN, aiHandled: true)
4. Dashboard creates Message (role: USER, content: customer's message)
5. Server action calls getAIProvider(settings) → sends messages to LLM
6. LLM responds
7. Dashboard creates Message (role: ASSISTANT, content: response)
8. AIUsageRecord written (tokens, cost, model)
9. If AI detects booking intent → creates Appointment
10. Staff can view conversation in Inbox
11. Staff clicks "Assign to me" → assignedToId set
12. Staff can send messages (role: STAFF)
13. Staff clicks "Resolve" → status: RESOLVED
```

---

## Flow: WhatsApp (Phase 4)

```
1. Customer sends WhatsApp message
2. Evolution API receives → sends webhook to n8n
3. n8n checks if existing open Conversation exists for this phone/tenant
   - If yes: add Message to existing Conversation
   - If no: create Customer (if new) + create Conversation (channel: WHATSAPP, externalId: thread_id)
4. n8n runs Gemini inference → generates reply
5. n8n creates Message (role: ASSISTANT) in Supabase
6. n8n sends reply via Evolution API back to customer
7. Dashboard staff can view WhatsApp conversation in Inbox (read-only realtime)
8. Staff can take over: aiHandled = false, assignedToId set
9. Staff sends message → n8n relays to Evolution API
```

---

## Message Roles

| Role | Who sends it | Visible to customer? |
|---|---|---|
| `USER` | Customer | Yes — their own message |
| `ASSISTANT` | AI (LLM response) | Yes |
| `SYSTEM` | Platform (e.g., conversation started) | No |
| `STAFF` | Human staff member | Yes |

---

## Staff Takeover

When `aiHandled = false`:
- AI stops auto-responding
- `assignedToId` is set to the team member who took over
- Staff messages have role `STAFF`
- The `escalation-banner.tsx` component shows if status is `ESCALATED`

---

## Notes

Staff can add internal notes via `ConversationNote` — these are not visible to the customer and are stored separately from `Message` records.

---

## Related Models

- `Conversation` — the thread
- `Message` — individual messages
- `ConversationNote` — internal staff notes
- `Attachment` — files shared in conversation
- `Customer` — the contact
- `TeamMember` — assigned staff member
- `AIUsageRecord` — token/cost tracking per AI message
- `Appointment` — linked if AI booked during conversation
