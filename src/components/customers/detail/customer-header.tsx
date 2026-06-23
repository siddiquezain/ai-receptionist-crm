"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Mail, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomerAvatar } from "../customer-avatar";
import { deleteCustomer } from "@/lib/actions/customers";
import { timeAgo } from "@/lib/utils";
import type { CustomerDetail } from "@/lib/customers-queries";

interface CustomerHeaderProps {
  customer: CustomerDetail;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerHeader({ customer, tenantId, tenantSlug }: CustomerHeaderProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteCustomer(tenantId, tenantSlug, customer.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete customer");
        return;
      }
      toast.success("Customer deleted");
      router.push(`/${tenantSlug}/customers`);
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div
        className="rounded-[var(--radius-lg)] p-5"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        {/* Avatar + name row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <CustomerAvatar name={customer.name} avatarUrl={customer.avatarUrl} size="lg" />
            <div>
              <h1
                className="text-xl font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {customer.name}
              </h1>
              {customer.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-subtle-border)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete customer"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Meta row */}
        <div
          className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5"
          style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
        >
          {customer.email && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Mail className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Phone className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              {customer.phone}
            </span>
          )}
          {customer.lastSeenAt && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
              <Clock className="size-3.5 shrink-0" />
              Last seen {timeAgo(customer.lastSeenAt)}
            </span>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {customer.name}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. All associated data will be retained but this customer
              will be removed from all lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
