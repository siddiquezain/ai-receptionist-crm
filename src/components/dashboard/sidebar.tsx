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

interface Workspace {
  name: string;
  slug: string;
  logo: string | null;
}

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
  workspaces: Workspace[];
}

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",  icon: LayoutDashboard, segment: "dashboard"  },
      { label: "Analytics",  icon: BarChart2,        segment: "analytics"  },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Appointments", icon: Calendar,      segment: "appointments" },
      { label: "Customers",    icon: Users,          segment: "customers"    },
      { label: "Inbox",        icon: MessageSquare,  segment: "inbox"        },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Settings", icon: Settings, segment: "settings" },
    ],
  },
] as const;

export function Sidebar({ tenant, user, workspaces: _workspaces }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      {/* Workspace header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--sidebar-border)] px-3 py-[13px]">
        {tenant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-[22px] shrink-0 rounded-[var(--radius-sm)] object-cover shadow-[var(--shadow-xs)]"
          />
        ) : (
          <div className="flex size-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[10px] font-semibold text-white shadow-[var(--shadow-xs)]">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-[var(--text-primary)]">
            {tenant.name}
          </p>
          <p className="text-[10px] font-medium uppercase leading-snug tracking-[0.05em] text-[var(--text-muted)]">
            {tenant.plan}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="section-label mb-1 px-2.5 py-1">{group.label}</p>
            <div className="space-y-px">
              {group.items.map((item) => (
                <NavItem
                  key={item.segment}
                  href={`/${tenant.slug}/${item.segment}`}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User menu */}
      <div className="border-t border-[var(--sidebar-border)] px-2 py-2">
        <UserMenu name={user.name} email={user.email} />
      </div>
    </aside>
  );
}
