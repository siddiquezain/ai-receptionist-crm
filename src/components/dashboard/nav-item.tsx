"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Tooltip>
      <TooltipTrigger render={
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-sm transition-colors",
            isActive
              ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
              : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]"
          )}
        >
          <Icon
            className={cn(
              "size-4 shrink-0",
              isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            )}
          />
          <span className="hidden md:inline truncate text-sm">{label}</span>
        </Link>
      } />
      <TooltipContent side="right" className="md:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
