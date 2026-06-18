"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCustomer } from "@/lib/actions/customers";
import type { CustomerDetail } from "@/lib/customers-queries";

const schema = z.object({
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerEditFormProps {
  customer: CustomerDetail;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerEditForm({
  customer,
  tenantId,
  tenantSlug,
}: CustomerEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
      source: customer.source ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        source: data.source || null,
      });
      if (!result.success) {
        setErrorBanner(result.error ?? "Failed to save changes");
        return;
      }
      toast.success("Changes saved");
    } catch {
      setErrorBanner("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {errorBanner && (
        <div
          role="alert"
          className="rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          {errorBanner}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="edit-email"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Email
        </label>
        <Input
          id="edit-email"
          type="email"
          className="text-sm"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-[var(--danger)]">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-phone"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Phone
        </label>
        <Input
          id="edit-phone"
          type="tel"
          className="text-sm"
          {...form.register("phone")}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-source"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Source
        </label>
        <Input
          id="edit-source"
          className="text-sm"
          placeholder="e.g. referral, google, walk-in"
          {...form.register("source")}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="edit-notes"
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          Notes
        </label>
        <Textarea
          id="edit-notes"
          className="resize-none text-sm"
          rows={4}
          {...form.register("notes")}
        />
      </div>

      <Button type="submit" size="sm" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
