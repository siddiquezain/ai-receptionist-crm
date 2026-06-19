"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerAvatar } from "./customer-avatar";
import { updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { timeAgo } from "@/lib/utils";
import type { CustomerListItem } from "@/lib/customers-queries";

interface CustomersTableProps {
  customers: CustomerListItem[];
  hasMore: boolean;
  tenantId: string;
  tenantSlug: string;
  onLoadMore: () => void;
  onCreateClick: () => void;
  searchActive: boolean;
  onClearSearch: () => void;
}

export function CustomersTable({
  customers,
  hasMore,
  tenantId,
  tenantSlug,
  onLoadMore,
  onCreateClick,
  searchActive,
  onClearSearch,
}: CustomersTableProps) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);
  const addingTagRef = useRef(false);

  function startEditName(customer: CustomerListItem) {
    setEditingId(customer.id);
    setEditName(customer.name);
    setAddingTagId(null);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitEditName(customer: CustomerListItem) {
    if (committingRef.current) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === customer.name) {
      setEditingId(null);
      return;
    }
    committingRef.current = true;
    setEditingId(null);
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        name: trimmed,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to update name");
      }
    } catch {
      toast.error("Failed to update name");
    } finally {
      committingRef.current = false;
    }
  }

  function handleNameKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    customer: CustomerListItem
  ) {
    if (e.key === "Enter") commitEditName(customer);
    if (e.key === "Escape") setEditingId(null);
  }

  async function removeTag(customer: CustomerListItem, tag: string) {
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        tags: customer.tags.filter((t) => t !== tag),
      });
      if (!result.success) toast.error(result.error ?? "Failed to remove tag");
    } catch {
      toast.error("Failed to remove tag");
    }
  }

  async function addTag(customer: CustomerListItem) {
    if (addingTagRef.current) return;
    const tag = newTag.trim();
    if (!tag || customer.tags.includes(tag)) {
      setAddingTagId(null);
      setNewTag("");
      return;
    }
    addingTagRef.current = true;
    setAddingTagId(null);
    setNewTag("");
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        tags: [...customer.tags, tag],
      });
      if (!result.success) toast.error(result.error ?? "Failed to add tag");
    } catch {
      toast.error("Failed to add tag");
    } finally {
      addingTagRef.current = false;
    }
  }

  function handleTagKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    customer: CustomerListItem
  ) {
    if (e.key === "Enter") addTag(customer);
    if (e.key === "Escape") {
      setAddingTagId(null);
      setNewTag("");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteCustomer(tenantId, tenantSlug, id);
      if (!result.success) toast.error(result.error ?? "Failed to delete customer");
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] py-16">
        <Users className="size-10 text-[var(--border)]" />
        {searchActive ? (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              No customers match your search
            </p>
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              Clear search
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              No customers found
            </p>
            <Button variant="outline" size="sm" onClick={onCreateClick}>
              Add your first customer
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {[
                { key: "avatar", label: "" },
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "tags", label: "Tags" },
                { key: "lastSeen", label: "Last seen" },
                { key: "appts", label: "Appts" },
                { key: "actions", label: "" },
              ].map(({ key, label }) => (
                <th key={key} className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
              >
                <td
                  className="cursor-pointer px-3 py-2.5"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/${tenantSlug}/customers/${customer.id}`);
                    }
                  }}
                >
                  <CustomerAvatar name={customer.name} size="sm" />
                </td>

                <td className="px-3 py-2.5">
                  {editingId === customer.id ? (
                    <Input
                      ref={nameInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitEditName(customer)}
                      onKeyDown={(e) => handleNameKeyDown(e, customer)}
                      className="h-7 w-36 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      className="text-left text-sm font-medium text-[var(--text-primary)] hover:underline"
                      onClick={() => startEditName(customer)}
                    >
                      {customer.name}
                    </button>
                  )}
                </td>

                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/${tenantSlug}/customers/${customer.id}`);
                    }
                  }}
                >
                  {customer.email ?? "—"}
                </td>

                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/${tenantSlug}/customers/${customer.id}`);
                    }
                  }}
                >
                  {customer.phone ?? "—"}
                </td>

                <td
                  className="px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap items-center gap-1">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(customer, tag)}
                          className="ml-0.5 text-[var(--accent)]/60 hover:text-[var(--accent)]"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}
                    {addingTagId === customer.id ? (
                      <Input
                        autoFocus
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={() => addTag(customer)}
                        onKeyDown={(e) => handleTagKeyDown(e, customer)}
                        placeholder="tag name"
                        className="h-5 w-20 px-1.5 text-xs"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setAddingTagId(customer.id);
                          setNewTag("");
                        }}
                        className="flex size-4 items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        aria-label="Add tag"
                      >
                        <Plus className="size-2.5" />
                      </button>
                    )}
                  </div>
                </td>

                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/${tenantSlug}/customers/${customer.id}`);
                    }
                  }}
                >
                  {customer.lastSeenAt ? timeAgo(customer.lastSeenAt) : "—"}
                </td>

                <td
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--text-muted)]"
                  onClick={() => router.push(`/${tenantSlug}/customers/${customer.id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/${tenantSlug}/customers/${customer.id}`);
                    }
                  }}
                >
                  {customer._count.appointments}
                </td>

                <td
                  className="px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirmDeleteId === customer.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--text-muted)]">Delete?</span>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={deletingId === customer.id}
                        onClick={() => handleDelete(customer.id)}
                      >
                        Yes
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(customer.id)}
                      aria-label="Delete customer"
                    >
                      <Trash2 className="size-3.5 text-[var(--text-muted)]" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-[var(--border)] px-4 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
