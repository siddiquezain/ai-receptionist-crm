import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display in a given IANA timezone.
 */
export function formatDate(
  date: Date | string,
  timezone: string,
  fmt = "MMM d, yyyy"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: fmt.includes("yyyy") ? "numeric" : undefined,
    month: fmt.includes("MMM") ? "short" : fmt.includes("MM") ? "2-digit" : undefined,
    day: fmt.includes("d") ? "numeric" : undefined,
    hour: fmt.includes("h") ? "numeric" : undefined,
    minute: fmt.includes("mm") ? "2-digit" : undefined,
    hour12: fmt.includes("a"),
  }).format(d);
}

/** "2 hours ago", "just now" */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a Decimal/number as currency.
 */
export function formatCurrency(
  amount: number | string,
  currency = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

/** Generate a URL-safe slug from a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
