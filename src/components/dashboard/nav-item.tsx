"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-sm font-medium transition-colors",
        isActive
          ? "text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--border)]/40 hover:text-[var(--text-primary)]"
      )}
      style={
        isActive
          ? { background: "var(--accent-subtle)" }
          : undefined
      }
    >
      <Icon
        className={cn(
          "size-[15px] shrink-0 transition-colors",
          isActive
            ? "text-[var(--accent)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        )}
      />
      {label}
    </Link>
  );
}
