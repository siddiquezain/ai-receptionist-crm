import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // h-10 for primary forms; callers can override with h-8 for dense contexts
        "h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] transition-[border-color,box-shadow] outline-none",
        "placeholder:text-[var(--text-disabled)]",
        "focus-visible:border-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent)]/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-50",
        "aria-invalid:border-[var(--danger)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--danger)]/30",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "dark:bg-white/5 dark:disabled:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export { Input }
