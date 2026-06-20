import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { getBookingTenant } from "@/lib/booking-queries";
import { ChatWidget } from "@/components/booking/chat-widget";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getBookingTenant(slug);
  if (!tenant) return { title: "AI Booking Assistant" };
  return { title: `AI Assistant — ${tenant.name}` };
}

export default async function BookingChatPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await getBookingTenant(slug);
  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          {tenant.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo} alt={tenant.name} className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">AI-powered appointment booking</p>
        </div>

        {/* Chat */}
        <ChatWidget tenant={tenant} />

        {/* Footer links */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <Link
            href={`/book/${slug}`}
            className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Use the booking form instead
          </Link>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          Powered by AppointEase
        </p>
      </div>
    </div>
  );
}
