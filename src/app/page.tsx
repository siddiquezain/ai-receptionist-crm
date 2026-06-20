import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFirstTenantSlug } from "@/lib/auth-actions";
import { LandingNav } from "@/components/marketing/landing-nav";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { CtaSection } from "@/components/marketing/cta-section";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "AppointEase — AI-Powered Appointment Booking",
  description:
    "Let AI handle your bookings 24/7. Public booking page, email reminders, Google Calendar sync, and a full analytics dashboard — one platform for every business.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated users go straight to their dashboard
  if (user) {
    const slug = await getFirstTenantSlug(user.id);
    if (slug) redirect(`/${slug}/dashboard`);
    redirect("/register");
  }

  // Unauthenticated visitors see the marketing landing page
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <PricingSection />
        <Testimonials />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
