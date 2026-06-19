import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  getCustomerDetail,
  getCustomerAppointments,
  getCustomerConversations,
} from "@/lib/customers-queries";
import { CustomerHeader } from "@/components/customers/detail/customer-header";
import { CustomerEditForm } from "@/components/customers/detail/customer-edit-form";
import { CustomerAppointments } from "@/components/customers/detail/customer-appointments";
import { CustomerConversations } from "@/components/customers/detail/customer-conversations";
import { CustomerActivity } from "@/components/customers/detail/customer-activity";

export const metadata: Metadata = { title: "Customer" };

interface Props {
  params: Promise<{ tenant: string; id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { tenant: slug, id } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  const [customer, appointments, conversations] = await Promise.all([
    getCustomerDetail(tenant.id, id),
    getCustomerAppointments(tenant.id, id),
    getCustomerConversations(tenant.id, id),
  ]);

  if (!customer) redirect(`/${slug}/customers`);

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href={`/${slug}/customers`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="size-3.5" />
        Customers
      </Link>

      {/* Two-column layout */}
      <div className="flex items-start gap-6">
        {/* Left column — 1/3 */}
        <div className="w-1/3 shrink-0 space-y-6">
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <CustomerHeader
              customer={customer}
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
            />
          </div>
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Contact details
            </p>
            <CustomerEditForm
              customer={customer}
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
            />
          </div>
        </div>

        {/* Right column — 2/3 */}
        <div className="min-w-0 flex-1 space-y-6">
          <CustomerActivity
            appointments={appointments}
            conversations={conversations}
          />
          <CustomerAppointments
            appointments={appointments}
            tenantSlug={tenant.slug}
            timezone={tenant.timezone}
          />
          <CustomerConversations conversations={conversations} />
        </div>
      </div>
    </div>
  );
}
