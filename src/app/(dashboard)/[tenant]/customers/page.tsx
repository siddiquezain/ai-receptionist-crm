import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomers } from "@/lib/customers-queries";
import { CustomersClient } from "@/components/customers/customers-client";

export const metadata: Metadata = { title: "Customers" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const { customers, hasMore } = await getCustomers(tenant.id, {
    search,
    page,
  });

  return (
    <div className="space-y-4 p-6">
      <CustomersClient
        customers={customers}
        hasMore={hasMore}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        search={search ?? ""}
      />
    </div>
  );
}
