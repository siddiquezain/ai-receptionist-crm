"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { ArrowUpDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SortOption } from "@/lib/sorting"

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[]
  defaultSort: T
}

export function SortDropdown<T extends string>({
  options,
  defaultSort,
}: SortDropdownProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = (searchParams.get("sort") as T) ?? defaultSort

  const handleChange = useCallback(
    (value: T | null) => {
      if (value === null) return
      const params = new URLSearchParams(searchParams.toString())
      params.set("sort", value)
      params.delete("dir")
      params.delete("page")
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <Select value={currentSort} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-44 text-xs gap-1">
        <ArrowUpDown className="h-3 w-3 text-[var(--text-muted)]" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
