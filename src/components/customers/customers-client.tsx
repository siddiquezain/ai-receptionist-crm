"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomersTable } from "./customers-table";
import { CustomerCreateSlideOver } from "./customer-create-slide-over";
import type { CustomerListItem } from "@/lib/customers-queries";

interface CustomersClientProps {
  customers: CustomerListItem[];
  hasMore: boolean;
  tenantId: string;
  tenantSlug: string;
  search: string;
}

export function CustomersClient({
  customers,
  hasMore,
  tenantId,
  tenantSlug,
  search,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

  function pushSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) { params.set("search", value); } else { params.delete("search"); }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPage = parseInt(params.get("page") ?? "1", 10);
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h1 className="page-title">Customers</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New customer
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative w-64">
          <Search
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            placeholder="Search customers…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") pushSearch(searchValue); }}
            onBlur={() => pushSearch(searchValue)}
            className="pl-8 text-sm"
          />
        </div>

        {/* Table */}
        <CustomersTable
          customers={customers}
          hasMore={hasMore}
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          onLoadMore={handleLoadMore}
          onCreateClick={() => setCreateOpen(true)}
          searchActive={!!search}
          onClearSearch={() => { setSearchValue(""); pushSearch(""); }}
        />
      </div>

      {/* Create slide-over */}
      <CustomerCreateSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
