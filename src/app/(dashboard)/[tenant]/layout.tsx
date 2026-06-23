import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";

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

  // All workspaces this user can switch to
  const workspaces = dbUser.memberships.map((m) => ({
    name: m.tenant.name,
    slug: m.tenant.slug,
    logo: m.tenant.logo,
  }));

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
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
        workspaces={workspaces}
      />
      <main className="flex-1 overflow-y-auto min-w-0" style={{ background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
