"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface CommandPaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  return (
    <CommandPaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error("useCommandPalette must be inside CommandPaletteProvider")
  return ctx
}
