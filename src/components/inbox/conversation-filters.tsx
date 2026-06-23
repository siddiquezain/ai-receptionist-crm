// src/components/inbox/conversation-filters.tsx
"use client"

import type { ConversationListItem } from "@/lib/inbox-queries"

export interface ConversationFilterState {
  status: "ALL" | "OPEN" | "ESCALATED" | "RESOLVED"
  aiHandled: boolean | null
  assigned: boolean | null
}

export const DEFAULT_FILTER_STATE: ConversationFilterState = {
  status: "ALL",
  aiHandled: null,
  assigned: null,
}

export function applyConversationFilter(
  conversations: ConversationListItem[],
  filter: ConversationFilterState
): ConversationListItem[] {
  return conversations.filter((c) => {
    if (filter.status !== "ALL" && c.status !== filter.status) return false
    if (filter.aiHandled !== null && c.aiHandled !== filter.aiHandled) return false
    if (filter.assigned !== null) {
      const isAssigned = c.assignedToId !== null
      if (filter.assigned !== isAssigned) return false
    }
    return true
  })
}

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  { value: "OPEN" as const, label: "Open" },
  { value: "ESCALATED" as const, label: "Escalated" },
  { value: "RESOLVED" as const, label: "Resolved" },
]

interface ConversationFiltersProps {
  conversations: ConversationListItem[]
  value: ConversationFilterState
  onChange: (state: ConversationFilterState) => void
}

export function ConversationFilters({
  conversations,
  value,
  onChange,
}: ConversationFiltersProps) {
  function countByStatus(status: ConversationFilterState["status"]) {
    // Count against conversations filtered by toggles only (not by status)
    const toggleFiltered = conversations.filter((c) => {
      if (value.aiHandled !== null && c.aiHandled !== value.aiHandled) return false
      if (value.assigned !== null) {
        const isAssigned = c.assignedToId !== null
        if (value.assigned !== isAssigned) return false
      }
      return true
    })
    if (status === "ALL") return toggleFiltered.length
    return toggleFiltered.filter((c) => c.status === status).length
  }

  return (
    <div className="border-b border-[var(--border)] px-3 py-2 space-y-2">
      {/* Status tabs */}
      <div className="flex items-center gap-0.5">
        {STATUS_TABS.map((tab) => {
          const count = countByStatus(tab.value)
          const isActive = value.status === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onChange({ ...value, status: tab.value })}
              className={`flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-[6px] px-1 py-0.5 text-[10px] leading-none ${
                  isActive ? "bg-white/20 text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Toggle filters */}
      <div className="flex items-center gap-2">
        <ToggleButton
          active={value.aiHandled === true}
          onClick={() =>
            onChange({ ...value, aiHandled: value.aiHandled === true ? null : true })
          }
          label="AI Handled"
        />
        <ToggleButton
          active={value.aiHandled === false}
          onClick={() =>
            onChange({ ...value, aiHandled: value.aiHandled === false ? null : false })
          }
          label="Human"
        />
        <ToggleButton
          active={value.assigned === true}
          onClick={() =>
            onChange({ ...value, assigned: value.assigned === true ? null : true })
          }
          label="Assigned"
        />
      </div>
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[6px] px-2 py-0.5 text-[11px] font-medium border transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  )
}
