import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { WhatsappPanel } from "@/components/settings/whatsapp-panel";

export const metadata: Metadata = { title: "WhatsApp Integration" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function WhatsappSettingsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      slug: true,
      evolutionInstanceName: true,
      evolutionApiKey: true,
      evolutionApiUrl: true,
    },
  });
  if (!tenant) redirect("/login");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const appUrl = `${proto}://${host}`;

  const isConnected = !!(tenant.evolutionInstanceName && tenant.evolutionApiKey);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">WhatsApp</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Connect your WhatsApp Business number via Evolution API so customers can book via chat.
        </p>
      </div>

      <WhatsappPanel
        tenantId={tenant.id}
        instanceName={tenant.evolutionInstanceName}
        isConnected={isConnected}
        appUrl={appUrl}
      />
    </div>
  );
}
