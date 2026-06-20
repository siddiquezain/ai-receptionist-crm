import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { PlanKey } from "@/lib/stripe";
import { BillingPanel } from "@/components/settings/billing-panel";

export const metadata: Metadata = { title: "Billing" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BillingPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      slug: true,
      plan: true,
      planStatus: true,
      planCurrentPeriodEnd: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!tenant) redirect("/login");

  const billing = {
    currentPlan: tenant.plan as PlanKey,
    planStatus: tenant.planStatus,
    planCurrentPeriodEnd: tenant.planCurrentPeriodEnd,
    trialEndsAt: tenant.trialEndsAt,
    stripeCustomerId: tenant.stripeCustomerId,
    stripeSubscriptionId: tenant.stripeSubscriptionId,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Billing & Plans</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your subscription and payment method.
        </p>
      </div>

      {sp.success && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 px-4 py-3 text-sm text-[var(--success)]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Subscription activated! Your plan has been upgraded.
        </div>
      )}

      {sp.cancelled && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 px-4 py-3 text-sm text-[var(--warning)]">
          <XCircle className="h-4 w-4 shrink-0" />
          Checkout was cancelled. No changes were made.
        </div>
      )}

      <BillingPanel tenantSlug={slug} billing={billing} />
    </div>
  );
}
