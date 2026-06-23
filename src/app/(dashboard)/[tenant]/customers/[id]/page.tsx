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
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-1 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronLeft className="size-3.5" />
          Customers
        </Link>
        <span style={{ color: "var(--border-strong)" }}>/</span>
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {customer.name}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Left column — 1/3 */}
          <div className="w-72 shrink-0 space-y-4">
            <CustomerHeader
              customer={customer}
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
            />

            <div
              className="rounded-[var(--radius-lg)] p-5"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <p className="section-label mb-4">Contact details</p>
              <CustomerEditForm
                customer={customer}
                tenantId={tenant.id}
                tenantSlug={tenant.slug}
              />
            </div>
          </div>

          {/* Right column — flex-1 */}
          <div className="min-w-0 flex-1 space-y-4">
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
    </div>
  );
}
