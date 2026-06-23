// src/components/command-palette/types.ts

export interface MatchRange {
  start: number
  end: number
}

export interface CommandCtx {
  tenantId: string
  tenantSlug: string
}

export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: "User" | "Calendar" | "MessageSquare" | "LayoutDashboard" | "Settings"
  href: string
  section: string
  matches?: MatchRange[]
}

export interface CommandSection {
  id: string
  label: string
  items: CommandItem[]
}
