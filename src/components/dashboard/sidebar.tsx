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

const NAV_ITEMS = [
  { label: "Dashboard",    icon: LayoutDashboard, segment: "dashboard"    },
  { label: "Appointments", icon: Calendar,         segment: "appointments" },
  { label: "Customers",    icon: Users,            segment: "customers"    },
  { label: "Inbox",        icon: MessageSquare,    segment: "inbox"        },
  { label: "Analytics",    icon: BarChart2,        segment: "analytics"    },
  { label: "Settings",     icon: Settings,         segment: "settings"     },
] as const;

export function Sidebar({ tenant, user, workspaces: _workspaces }: SidebarProps) {
  return (
    <aside
      className="flex h-screen w-[220px] shrink-0 flex-col"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Workspace header */}
      <div
        className="flex items-center gap-2.5 px-3 py-[13px]"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {tenant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-[22px] rounded-[var(--radius-sm)] object-cover shrink-0"
          />
        ) : (
          <div
            className="flex size-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[10px] font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {tenant.name}
          </p>
          <p
            className="text-[10px] leading-snug font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {tenant.plan}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
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
      <div
        className="px-2 py-2"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <UserMenu name={user.name} email={user.email} />
      </div>
    </aside>
  );
}
