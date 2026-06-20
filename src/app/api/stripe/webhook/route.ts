import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// In Stripe v22 current_period_end lives on SubscriptionItem, not Subscription
function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) return;

  const priceId = sub.items.data[0]?.price.id ?? null;
  const plan = priceId ? planFromPriceId(priceId) : "STARTER";

  await prisma.tenant.updateMany({
    where: { id: tenantId },
    data: {
      plan,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      planStatus: sub.status,
      planCurrentPeriodEnd: getPeriodEnd(sub),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // In Stripe v22 the object is typed as the inline checkout session shape
        const session = event.data.object as { mode: string; metadata?: Record<string, string>; customer?: string };
        if (session.mode !== "subscription") break;

        const tenantId = session.metadata?.tenantId;
        if (!tenantId) break;

        if (session.customer) {
          await prisma.tenant.updateMany({
            where: { id: tenantId },
            data: { stripeCustomerId: session.customer },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) break;

        await prisma.tenant.updateMany({
          where: { id: tenantId },
          data: {
            plan: "STARTER",
            stripeSubscriptionId: null,
            stripePriceId: null,
            planStatus: "cancelled",
            planCurrentPeriodEnd: null,
            trialEndsAt: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.updateMany({
            where: { id: tenantId },
            data: { planStatus: "past_due" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await handleSubscriptionUpsert(sub);
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe/webhook] error handling ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
