import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
    <BookingClient
      tenant={tenant}
      services={services}
      availableDates={availableDates}
    />
  );
}
