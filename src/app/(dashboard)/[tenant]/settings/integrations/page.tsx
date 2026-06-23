import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessagingIntegrationForm } from "@/components/settings/messaging-integration-form";

export const metadata: Metadata = { title: "Integrations" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function IntegrationsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const integration = await prisma.messagingIntegration.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
    select: {
      id: true,
      provider: true,
      instanceName: true,
      displayName: true,
      phoneNumber: true,
      apiEndpoint: true,
      isActive: true,
      lastConnectedAt: true,
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Integrations</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Connect WhatsApp to receive and send messages from the Inbox.
        </p>
      </div>
      <MessagingIntegrationForm
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        existing={integration}
      />
    </div>
  );
}
