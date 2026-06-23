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

  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editName, setEditName]           = useState("");
  const [addingTagId, setAddingTagId]     = useState<string | null>(null);
  const [newTag, setNewTag]               = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  const nameInputRef  = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);
  const addingTagRef  = useRef(false);

  function startEditName(customer: CustomerListItem) {
    setEditingId(customer.id);
    setEditName(customer.name);
    setAddingTagId(null);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitEditName(customer: CustomerListItem) {
    if (committingRef.current) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === customer.name) { setEditingId(null); return; }
    committingRef.current = true;
    setEditingId(null);
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, { name: trimmed });
      if (!result.success) toast.error(result.error ?? "Failed to update name");
    } catch { toast.error("Failed to update name"); }
    finally { committingRef.current = false; }
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>, customer: CustomerListItem) {
    if (e.key === "Enter") commitEditName(customer);
    if (e.key === "Escape") setEditingId(null);
  }

  async function removeTag(customer: CustomerListItem, tag: string) {
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        tags: customer.tags.filter((t) => t !== tag),
      });
      if (!result.success) toast.error(result.error ?? "Failed to remove tag");
    } catch { toast.error("Failed to remove tag"); }
  }

  async function addTag(customer: CustomerListItem) {
    if (addingTagRef.current) return;
    const tag = newTag.trim();
    if (!tag || customer.tags.includes(tag)) { setAddingTagId(null); setNewTag(""); return; }
    addingTagRef.current = true;
    setAddingTagId(null);
    setNewTag("");
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        tags: [...customer.tags, tag],
      });
      if (!result.success) toast.error(result.error ?? "Failed to add tag");
    } catch { toast.error("Failed to add tag"); }
    finally { addingTagRef.current = false; }
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>, customer: CustomerListItem) {
    if (e.key === "Enter") addTag(customer);
    if (e.key === "Escape") { setAddingTagId(null); setNewTag(""); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteCustomer(tenantId, tenantSlug, id);
      if (!result.success) toast.error(result.error ?? "Failed to delete customer");
    } catch { toast.error("Failed to delete customer"); }
    finally { setDeletingId(null); setConfirmDeleteId(null); }
  }

  if (customers.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] py-20"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="flex size-12 items-center justify-center rounded-[var(--radius-lg)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Users className="size-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="text-center">
          {searchActive ? (
            <>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No customers match your search
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Try a different name or email.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No customers yet
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Add your first customer to get started.
              </p>
            </>
          )}
        </div>
        {searchActive ? (
          <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onCreateClick}>Add customer</Button>
        )}
      </div>
    );
  }

  const navigate = (id: string) => router.push(`/${tenantSlug}/customers/${id}`);

  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Tags</th>
              <th>Last seen</th>
              <th>Appts</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                {/* Avatar */}
                <td
                  className="cursor-pointer"
                  onClick={() => navigate(customer.id)}
                  style={{ paddingLeft: 16, paddingRight: 8 }}
                >
                  <CustomerAvatar name={customer.name} size="sm" />
                </td>

                {/* Name */}
                <td onClick={(e) => e.stopPropagation()}>
                  {editingId === customer.id ? (
                    <Input
                      ref={nameInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitEditName(customer)}
                      onKeyDown={(e) => handleNameKeyDown(e, customer)}
                      className="h-7 w-36 text-sm"
                    />
                  ) : (
                    <button
                      className="text-left text-sm font-medium transition-colors"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "var(--accent)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
                      }
                      onClick={() => startEditName(customer)}
                    >
                      {customer.name}
                    </button>
                  )}
                </td>

                {/* Email */}
                <td
                  className="cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => navigate(customer.id)}
                >
                  {customer.email ?? "—"}
                </td>

                {/* Phone */}
                <td
                  className="cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => navigate(customer.id)}
                >
                  {customer.phone ?? "—"}
                </td>

                {/* Tags */}
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-1">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: "var(--accent-subtle)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-subtle-border)",
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(customer, tag)}
                          className="transition-opacity opacity-60 hover:opacity-100"
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
                        placeholder="tag…"
                        className="h-5 w-16 px-1.5 text-xs"
                      />
                    ) : (
                      <button
                        onClick={() => { setAddingTagId(customer.id); setNewTag(""); }}
                        className="flex size-[18px] items-center justify-center rounded-full transition-colors"
                        style={{
                          border: "1px dashed var(--border-strong)",
                          color: "var(--text-muted)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                        }}
                        aria-label="Add tag"
                      >
                        <Plus className="size-2.5" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Last seen */}
                <td
                  className="cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => navigate(customer.id)}
                >
                  {customer.lastSeenAt ? timeAgo(customer.lastSeenAt) : "—"}
                </td>

                {/* Appts count */}
                <td
                  className="cursor-pointer font-mono tabular-nums"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => navigate(customer.id)}
                >
                  {customer._count.appointments}
                </td>

                {/* Actions */}
                <td onClick={(e) => e.stopPropagation()}>
                  {confirmDeleteId === customer.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Delete?</span>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={deletingId === customer.id}
                        onClick={() => handleDelete(customer.id)}
                      >
                        Yes
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
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
                      <Trash2 className="size-3.5" style={{ color: "var(--text-muted)" }} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div
          className="px-5 py-3 text-center"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Button variant="ghost" size="sm" onClick={onLoadMore}>Load more</Button>
        </div>
      )}
    </div>
  );
}
