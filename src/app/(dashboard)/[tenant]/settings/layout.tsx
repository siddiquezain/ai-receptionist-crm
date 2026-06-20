import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SettingsNavLink } from "@/components/settings/settings-nav-link";

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

const NAV = [
  { label: "Profile", segment: "profile" },
  { label: "Working Hours", segment: "working-hours" },
  { label: "Team Members", segment: "team" },
  { label: "AI Settings", segment: "ai" },
  { label: "Calendar", segment: "calendar" },
  { label: "WhatsApp", segment: "whatsapp" },
  { label: "Billing", segment: "billing" },
] as const;

export default async function SettingsLayout({ children, params }: Props) {
  const { tenant: slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  return (
    <div className="flex h-full">
      {/* Settings sub-nav */}
      <aside className="w-44 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-3 space-y-0.5">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Settings
        </p>
        {NAV.map((item) => (
          <SettingsNavLink
            key={item.segment}
            href={`/${slug}/settings/${item.segment}`}
            label={item.label}
          />
        ))}
      </aside>

      {/* Settings content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

