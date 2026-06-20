import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";

export const metadata: Metadata = { title: "Team Members" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TeamSettingsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const members = await prisma.teamMember.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      inviteToken: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Team Members</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Add and manage staff who handle appointments and conversations.
        </p>
      </div>
      <TeamMembersPanel tenantId={tenant.id} tenantSlug={tenant.slug} members={members} />
    </div>
  );
}
