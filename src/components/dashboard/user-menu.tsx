"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  name: string | null;
  email: string;
}

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={loading} className="flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-sm hover:bg-[var(--bg)] transition-colors outline-none disabled:opacity-50">
        <Avatar size="sm">
          <AvatarFallback className="text-xs font-medium">
            {initials(name, email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-medium text-[var(--text-primary)] leading-tight">
            {name ?? email}
          </p>
          {name && (
            <p className="truncate text-xs text-[var(--text-muted)] leading-tight">
              {email}
            </p>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium text-[var(--text-primary)]">{name ?? email}</p>
          {name && <p className="text-xs text-[var(--text-muted)]">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut />
          {loading ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
