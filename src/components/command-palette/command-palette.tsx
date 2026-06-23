"use client"

import React, { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command"
import { globalSearch } from "@/lib/actions/search"
import { useCommandPalette } from "./command-palette-provider"
import type { CommandSection, CommandItem as CmdItem, MatchRange } from "./types"

const ICON_MAP = {
  User,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Settings,
}

function HighlightedText({ text, matches }: { text: string; matches?: MatchRange[] }) {
  if (!matches?.length) return <>{text}</>
  const parts: React.ReactNode[] = []
  let last = 0
  for (const { start, end } of matches) {
    if (start > last) parts.push(<span key={`t-${start}`}>{text.slice(last, start)}</span>)
    parts.push(
      <mark
        key={`m-${start}`}
        className="bg-[var(--accent)]/20 text-[var(--text-primary)] rounded-[3px] not-italic"
      >
        {text.slice(start, end)}
      </mark>
    )
    last = end
  }
  if (last < text.length) parts.push(<span key="tail">{text.slice(last)}</span>)
  return <>{parts}</>
}

const NAV_ITEMS: CmdItem[] = [
  { id: "nav-dashboard", title: "Dashboard", icon: "LayoutDashboard", href: "dashboard", section: "navigation" },
  { id: "nav-appointments", title: "Appointments", icon: "Calendar", href: "appointments", section: "navigation" },
  { id: "nav-customers", title: "Customers", icon: "User", href: "customers", section: "navigation" },
  { id: "nav-inbox", title: "Inbox", icon: "MessageSquare", href: "inbox", section: "navigation" },
  { id: "nav-settings", title: "Settings", icon: "Settings", href: "settings/profile", section: "navigation" },
]

interface CommandPaletteProps {
  tenantId: string
  tenantSlug: string
}

export function CommandPalette({ tenantId, tenantSlug }: CommandPaletteProps) {
  const { open, openPalette, closePalette } = useCommandPalette()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CommandSection[]>([])
  const [isPending, startTransition] = useTransition()
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const cacheRef = useRef<Map<string, CommandSection[]>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        openPalette()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [openPalette])

  // Focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
    } else {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
      setQuery("")
      setResults([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      return
    }
    if (cacheRef.current.has(query)) {
      setResults(cacheRef.current.get(query)!)
      return
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query, tenantId, tenantSlug)
        cacheRef.current.set(query, res)
        setResults(res)
      })
    }, 275)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, tenantId, tenantSlug])

  function handleSelect(item: CmdItem) {
    closePalette()
    const href = item.href.startsWith("/")
      ? item.href
      : `/${tenantSlug}/${item.href}`
    router.push(href)
  }

  const showNav = query.length < 2
  const showResults = query.length >= 2 && results.length > 0
  const showEmpty = query.length >= 2 && results.length === 0 && !isPending

  return (
    <CommandDialog open={open} onOpenChange={(v) => !v && closePalette()}>
      <Command shouldFilter={false}>
        <div className="flex items-center border-b border-[var(--border)] px-1">
          <CommandInput
            placeholder="Search customers, appointments, conversations…"
            value={query}
            onValueChange={setQuery}
            aria-label="Global search"
          />
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--text-muted)] shrink-0" />}
        </div>
        <CommandList>
          {showNav && (
            <CommandGroup heading="Navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon]
                return (
                  <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item)}>
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>{item.title}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {showEmpty && (
            <CommandEmpty>No results for "{query}"</CommandEmpty>
          )}

          {showResults &&
            results.map((section, idx) => (
              <React.Fragment key={`section-${section.id}`}>
                {idx > 0 && <CommandSeparator key={`sep-${section.id}`} />}
                <CommandGroup key={section.id} heading={section.label}>
                  {section.items.map((item) => {
                    const Icon = ICON_MAP[item.icon]
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="truncate text-sm">
                            <HighlightedText text={item.title} matches={item.matches} />
                          </span>
                          {item.subtitle && (
                            <span className="truncate text-xs text-[var(--text-muted)]">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
