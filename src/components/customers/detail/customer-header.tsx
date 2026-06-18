"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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

export function CustomerHeader({
  customer,
  tenantId,
  tenantSlug,
}: CustomerHeaderProps) {
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
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <CustomerAvatar
          name={customer.name}
          avatarUrl={customer.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {customer.name}
          </h1>
          {customer.lastSeenAt && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Last seen {timeAgo(customer.lastSeenAt)}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" />
        Delete customer
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {customer.name}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. All associated data will be retained but
              this customer will be removed from all lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
