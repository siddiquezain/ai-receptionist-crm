"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Zap, Sparkles, Building2 } from "lucide-react";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    icon: Sparkles,
    monthlyPrice: "Free",
    annualPrice: "Free",
    desc: "Perfect for solo operators just getting started.",
    features: [
      "50 appointments / month",
      "1 team member",
      "Public booking page",
      "AI chat (10 msgs / day)",
      "Email notifications",
    ],
    cta: "Get started free",
    href: "/register",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    icon: Zap,
    monthlyPrice: "$49",
    annualPrice: "$39",
    desc: "For growing businesses that need the full feature set.",
    features: [
      "Unlimited appointments",
      "Up to 10 team members",
      "AI booking agent (unlimited)",
      "Email notifications & reminders",
      "Analytics dashboard",
      "Google Calendar sync",
      "Stripe billing integration",
    ],
    cta: "Start 14-day trial",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    icon: Building2,
    monthlyPrice: "$149",
    annualPrice: "$119",
    desc: "For agencies and multi-location businesses.",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "WhatsApp integration",
      "Custom AI system prompt",
      "Bring your own API key",
      "Agency multi-tenant management",
      "Priority support & SLA",
    ],
    cta: "Start 14-day trial",
    href: "/register?plan=enterprise",
    highlight: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-[var(--bg)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Pricing
          </p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)]">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-[var(--text-muted)]">
            Start free. Upgrade as you grow. Cancel anytime.
          </p>

          {/* Interval toggle */}
          <div className="mt-6 inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={[
                "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
                !annual
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={[
                "rounded-lg px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                annual
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              Annual
              <span className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                annual ? "bg-white/20 text-white" : "bg-[var(--success)]/10 text-[var(--success)]",
              ].join(" ")}>
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const isPaid = price !== "Free";

            return (
              <div
                key={plan.key}
                className={[
                  "relative rounded-2xl border p-7 flex flex-col",
                  plan.highlight
                    ? "border-[var(--accent)] shadow-xl shadow-[var(--accent)]/10 bg-[var(--surface)]"
                    : "border-[var(--border)] bg-[var(--surface)]",
                ].join(" ")}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1 text-xs font-bold text-white">
                    Most popular
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={[
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      plan.highlight ? "bg-[var(--accent)] text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]",
                    ].join(" ")}>
                      <plan.icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="font-bold text-[var(--text-primary)]">{plan.name}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-extrabold text-[var(--text-primary)]">{price}</span>
                    {isPaid && <span className="text-sm text-[var(--text-muted)]">/mo</span>}
                  </div>
                  {annual && isPaid && (
                    <p className="text-xs text-[var(--success)]">Billed annually — save 20%</p>
                  )}
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.desc}</p>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-[var(--success)] mt-0.5" />
                      <span className="text-[var(--text-muted)]">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={[
                    "block rounded-xl py-3 text-center text-sm font-semibold transition-colors",
                    plan.highlight
                      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      : "border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--border)]",
                  ].join(" ")}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          All paid plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  );
}
