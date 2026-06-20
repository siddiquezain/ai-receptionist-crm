"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-[5px] px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
          : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]"
      )}
    >
      {label}
    </Link>
  );
}
