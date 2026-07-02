"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function ErrorPage({
  error,
  reset,
  title = "Something went wrong",
  description = "This page couldn't load. Try again or return to the dashboard.",
  backHref,
  backLabel = "Go to dashboard",
}: ErrorPageProps) {
  useEffect(() => {
    console.error("[ErrorPage]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10">
        <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button size="sm" variant="ghost" render={<Link href={backHref ?? "/"} />}>
          {backLabel}
        </Button>
      </div>
    </div>
  )
}
