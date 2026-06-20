import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Profile Settings" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function ProfileSettingsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true, timezone: true, plan: true, logo: true },
  });
  if (!tenant) redirect("/login");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Business Profile</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Update your business name, timezone, and branding.
        </p>
      </div>
      <ProfileForm tenant={tenant} />
    </div>
  );
}
