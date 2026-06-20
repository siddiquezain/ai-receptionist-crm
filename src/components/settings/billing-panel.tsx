"use client";

import { useState, useTransition } from "react";
import { Check, Zap, Building2, Sparkles } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/stripe";

interface BillingData {
  currentPlan: PlanKey;
  planStatus: string | null;
  planCurrentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface Props {
  tenantSlug: string;
  billing: BillingData;
}

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  STARTER: <Sparkles className="h-5 w-5" />,
  PRO: <Zap className="h-5 w-5" />,
  ENTERPRISE: <Building2 className="h-5 w-5" />,
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const color =
    status === "active" || status === "trialing"
      ? "bg-[var(--success)]/10 text-[var(--success)]"
      : status === "past_due"
      ? "bg-[var(--warning)]/10 text-[var(--warning)]"
      : "bg-[var(--border)] text-[var(--text-muted)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {status === "trialing" ? "Free Trial" : status?.replace("_", " ")}
    </span>
  );
}

export function BillingPanel({ tenantSlug, billing }: Props) {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [isPending, startTransition] = useTransition();
  const [loadingPlanKey, setLoadingPlanKey] = useState<PlanKey | null>(null);

  const hasPaidSub = !!billing.stripeSubscriptionId;

  function handleUpgrade(plan: PlanKey) {
    const priceDef = PLANS[plan];
    const priceId =
      billingInterval === "annual" ? priceDef.annualPriceId : priceDef.monthlyPriceId;
    if (!priceId) return;

    setLoadingPlanKey(plan);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantSlug, priceId, interval: billingInterval }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } finally {
        setLoadingPlanKey(null);
      }
    });
  }

  function handleManage() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Current plan summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              {PLAN_ICONS[billing.currentPlan]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--text-primary)]">
                  {PLANS[billing.currentPlan].name} Plan
                </p>
                <StatusBadge status={billing.planStatus} />
              </div>
              {billing.trialEndsAt && (
                <p className="text-xs text-[var(--text-muted)]">
                  Trial ends {billing.trialEndsAt.toLocaleDateString()}
                </p>
              )}
              {billing.planCurrentPeriodEnd && !billing.trialEndsAt && (
                <p className="text-xs text-[var(--text-muted)]">
                  Renews {billing.planCurrentPeriodEnd.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {hasPaidSub && (
            <button
              type="button"
              onClick={handleManage}
              disabled={isPending}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg)] disabled:opacity-50 transition-colors"
            >
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Interval toggle */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Upgrade Plan</h3>
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
            {(["monthly", "annual"] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => setBillingInterval(iv)}
                className={[
                  "px-3 py-1.5 font-medium transition-colors",
                  billingInterval === iv
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--bg)]",
                ].join(" ")}
              >
                {iv === "monthly" ? "Monthly" : "Annual"}
                {iv === "annual" && (
                  <span className="ml-1.5 rounded-full bg-[var(--success)]/20 px-1.5 text-[var(--success)] text-[10px]">
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {(["STARTER", "PRO", "ENTERPRISE"] as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const isCurrent = billing.currentPlan === key;
            const price = billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const hasPrice = !!plan.monthlyPriceId;

            return (
              <div
                key={key}
                className={[
                  "rounded-xl border p-5 flex flex-col gap-4 transition-colors",
                  isCurrent
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface)]",
                ].join(" ")}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[var(--accent)]">{PLAN_ICONS[key]}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{plan.name}</span>
                    {isCurrent && (
                      <span className="ml-auto rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    {price ? (
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        {price}
                        <span className="text-sm font-normal text-[var(--text-muted)]">/mo</span>
                      </span>
                    ) : (
                      <span className="text-2xl font-bold text-[var(--text-primary)]">Free</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)] mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && hasPrice && (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(key)}
                    disabled={isPending || loadingPlanKey === key}
                    className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
                  >
                    {loadingPlanKey === key ? "Redirecting…" : `Upgrade to ${plan.name}`}
                  </button>
                )}
                {isCurrent && (
                  <div className="text-center text-sm text-[var(--text-muted)]">
                    Current plan
                  </div>
                )}
                {!isCurrent && !hasPrice && key === "ENTERPRISE" && (
                  <a
                    href="mailto:sales@appointease.com"
                    className="block w-full rounded-lg border border-[var(--border)] py-2 text-center text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
                  >
                    Contact Sales
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trial / webhook setup note */}
      <p className="text-xs text-[var(--text-muted)]">
        All paid plans include a 14-day free trial. You won&apos;t be charged until the trial ends.
        Cancel anytime from the billing portal.
      </p>
    </div>
  );
}
