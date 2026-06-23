import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { tenant: slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        select: {
          role: true,
          tenant: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      },
    },
  });

  if (!dbUser) {
    redirect("/register");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      logo: true,
      parentTenantId: true,
    },
  });

  if (!tenant) {
    redirect("/login");
  }

  const membership = dbUser.memberships.find((m) => m.tenant.id === tenant.id);

  if (!membership) {
    redirect("/login");
  }

  return (
    <CommandPaletteProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-[6px] focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <CommandPalette tenantId={tenant.id} tenantSlug={tenant.slug} />
      <div className="flex h-screen bg-[var(--bg)]">
        <Sidebar
          tenant={{
            name: tenant.name,
            slug: tenant.slug,
            logo: tenant.logo,
            plan: tenant.plan,
          }}
          user={{
            name: dbUser.name,
            email: dbUser.email,
          }}
        />
        <main id="main-content" className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </CommandPaletteProvider>
  );
}
