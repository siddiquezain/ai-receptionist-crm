import { cn } from "@/lib/utils"

/** Base shimmer skeleton — replaces animate-pulse with a gradient sweep */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--surface-raised) 25%, var(--surface-overlay) 50%, var(--surface-raised) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
      {...props}
    />
  )
}

/** Inline text placeholder. width controls how wide it appears. */
function SkeletonText({
  width = "100%",
  size = "sm",
  className,
}: {
  width?: string | number
  size?: "sm" | "base"
  className?: string
}) {
  const h = size === "base" ? "h-4" : "h-3.5"
  return (
    <Skeleton
      className={cn(h, "rounded-sm", className)}
      style={{ width }}
    />
  )
}

/** Matches a stat card shell (label + number + delta row). */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] p-5 space-y-3",
        className
      )}
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between">
        <SkeletonText width={96} size="sm" />
        <Skeleton className="h-8 w-16 rounded-sm" />
      </div>
      <SkeletonText width={72} size="base" className="h-7" />
      <SkeletonText width={120} size="sm" />
    </div>
  )
}

/** Matches a data table row (5 columns: customer, service, staff, date, status). */
function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <tr
      className={cn("border-b border-[var(--border)]", className)}
      aria-hidden="true"
    >
      <td className="px-4 py-3.5"><SkeletonText width={120} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={96} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={80} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={110} /></td>
      <td className="px-4 py-3.5"><SkeletonText width={64} /></td>
    </tr>
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow }
