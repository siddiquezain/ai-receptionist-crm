import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

// ─── Plan definitions ─────────────────────────────────────────────────────────

export type PlanKey = "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanDef {
  key: PlanKey;
  name: string;
  monthlyPrice: string | null;
  annualPrice: string | null;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  features: string[];
}

export const PLANS: Record<PlanKey, PlanDef> = {
  STARTER: {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: null,
    annualPrice: null,
    monthlyPriceId: null,
    annualPriceId: null,
    features: [
      "Up to 50 appointments / month",
      "1 team member",
      "Public booking page",
      "AI chat (10 msgs / day)",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    monthlyPrice: "$49",
    annualPrice: "$39",
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? null,
    features: [
      "Unlimited appointments",
      "Up to 10 team members",
      "AI booking agent (unlimited)",
      "Email notifications",
      "Analytics dashboard",
      "Google Calendar sync",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: "$149",
    annualPrice: "$119",
    monthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? null,
    annualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ?? null,
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "WhatsApp integration",
      "Custom AI system prompt",
      "Bring your own API key",
      "Priority support & SLA",
      "Agency multi-tenant management",
    ],
  },
};

// Map Stripe price ID → plan key
export function planFromPriceId(priceId: string): PlanKey {
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId || plan.annualPriceId === priceId) {
      return plan.key;
    }
  }
  return "STARTER";
}
