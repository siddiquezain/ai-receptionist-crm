import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

  const membership = await prisma.tenantMember.findUnique({
    where: { userId_tenantId: { userId: dbUser.id, tenantId: tenant.id } },
    select: { role: true },
  });

  if (!membership) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-4">
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {tenant.name}
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
