import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";
import { getBookingTenant, getBookingServices, getAvailableDates } from "@/lib/booking-queries";
import { BookingClient } from "@/components/booking/booking-client";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getBookingTenant(slug);
  if (!tenant) return { title: "Book an Appointment" };
  return { title: `Book with ${tenant.name}` };
}

export default async function BookingPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await getBookingTenant(slug);
  if (!tenant) notFound();

  const services = await getBookingServices(tenant.id);
  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="text-[var(--text-muted)]">No services available at the moment.</p>
        </div>
      </div>
    );
  }

  // Pre-fetch dates for the first service so the initial render is populated
  const availableDates = await getAvailableDates(tenant.id, services[0].id);

  return (
    <>
      <BookingClient
        tenant={tenant}
        services={services}
        availableDates={availableDates}
      />
      <div className="fixed bottom-4 right-4">
        <Link
          href={`/book/${slug}/chat`}
          className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Bot className="h-4 w-4" />
          Chat with AI
        </Link>
      </div>
    </>
  );
}
