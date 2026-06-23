"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortDropdown } from "@/components/ui/sort-dropdown";
import { CustomersTable } from "./customers-table";
import { CustomerCreateSlideOver } from "./customer-create-slide-over";
import type { CustomerListItem, CustomerSortValue } from "@/lib/customers-queries";
import type { SortOption } from "@/lib/sorting";

interface CustomersClientProps {
  customers: CustomerListItem[];
  hasMore: boolean;
  tenantId: string;
  tenantSlug: string;
  search: string;
  sortOptions: SortOption<CustomerSortValue>[];
  defaultSort: CustomerSortValue;
}

export function CustomersClient({
  customers,
  hasMore,
  tenantId,
  tenantSlug,
  search,
  sortOptions,
  defaultSort,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

  function pushSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPage = parseInt(params.get("page") ?? "1", 10);
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Customers
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New customer
        </Button>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search customers…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") pushSearch(searchValue);
            }}
            onBlur={() => pushSearch(searchValue)}
            className="pl-8 text-sm"
          />
        </div>
        <SortDropdown options={sortOptions} defaultSort={defaultSort} />
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
        onClearSearch={() => {
          setSearchValue("");
          pushSearch("");
        }}
      />

      {/* Create slide-over */}
      <CustomerCreateSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
      />
    </>
  );
}
