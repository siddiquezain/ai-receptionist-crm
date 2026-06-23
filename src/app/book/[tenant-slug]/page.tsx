// src/app/book/[tenant-slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingClient } from "./booking-client";

interface Props {
  params: Promise<{ "tenant-slug": string }>;
}

export async function generateMetadata({ params }: Props) {
  const { "tenant-slug": slug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true },
  });
  return { title: tenant ? `Book with ${tenant.name}` : "Book Appointment" };
}

export default async function PublicBookingPage({ params }: Props) {
  const { "tenant-slug": slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true, logo: true, timezone: true },
  });
  if (!tenant) notFound();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, deletedAt: null, isActive: true },
    select: { id: true, name: true, description: true, duration: true, price: true, currency: true },
    orderBy: { name: "asc" },
  });

  if (services.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">No services available for booking at this time.</p>
        </div>
      </div>
    );
  }

  // Serialize Decimal fields before passing to Client Component
  const serializedServices = services.map((s) => ({
    ...s,
    price: s.price != null ? Number(s.price) : null,
  }));

  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-8 text-center">
          {tenant.logo && (
            <img src={tenant.logo} alt={tenant.name} className="mx-auto mb-4 h-12 w-auto" />
          )}
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Book your appointment online</p>
        </div>
        <BookingClient
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          timezone={tenant.timezone}
          services={serializedServices}
        />
      </div>
    </div>
  );
}
