"use client";

import {
  BarChart2,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { NavItem } from "./nav-item";
import { UserMenu } from "./user-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

interface SidebarProps {
  tenant: {
    name: string;
    slug: string;
    logo: string | null;
    plan: string;
  };
  user: {
    name: string | null;
    email: string;
  };
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, segment: "dashboard" },
  { label: "Appointments", icon: Calendar, segment: "appointments" },
  { label: "Customers", icon: Users, segment: "customers" },
  { label: "Inbox", icon: MessageSquare, segment: "inbox" },
  { label: "Analytics", icon: BarChart2, segment: "analytics" },
  { label: "Settings", icon: Settings, segment: "settings" },
] as const;

export function Sidebar({ tenant, user }: SidebarProps) {
  return (
    <TooltipProvider>
      <aside className="flex h-screen w-12 md:w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all overflow-hidden">
        {/* Workspace header */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-3.5">
          {tenant.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="size-6 rounded object-cover shrink-0"
            />
          ) : (
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--accent)] text-[10px] font-bold text-white">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="hidden md:block min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {tenant.name}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-tight">
              {tenant.plan}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.segment}
              href={`/${tenant.slug}/${item.segment}`}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        {/* User menu */}
        <div className="border-t border-[var(--border)] px-2 py-2">
          <UserMenu name={user.name} email={user.email} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
