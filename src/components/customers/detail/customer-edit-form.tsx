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
  email:  z.string().email("Invalid email").or(z.literal("")).optional(),
  phone:  z.string().optional(),
  notes:  z.string().optional(),
  source: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerEditFormProps {
  customer: CustomerDetail;
  tenantId: string;
  tenantSlug: string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function CustomerEditForm({ customer, tenantId, tenantSlug }: CustomerEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email:  customer.email  ?? "",
      phone:  customer.phone  ?? "",
      notes:  customer.notes  ?? "",
      source: customer.source ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      const result = await updateCustomer(tenantId, tenantSlug, customer.id, {
        email:  data.email  || null,
        phone:  data.phone  || null,
        notes:  data.notes  || null,
        source: data.source || null,
      });
      if (!result.success) { setErrorBanner(result.error ?? "Failed to save changes"); return; }
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
          className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm"
          style={{
            background: "var(--danger-subtle)",
            border: "1px solid var(--danger-subtle-border)",
            color: "var(--danger)",
          }}
        >
          {errorBanner}
        </div>
      )}

      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input id="edit-email" type="email" className="text-sm" {...form.register("email")} />
      </Field>

      <Field label="Phone">
        <Input id="edit-phone" type="tel" className="text-sm" {...form.register("phone")} />
      </Field>

      <Field label="Source">
        <Input
          id="edit-source"
          className="text-sm"
          placeholder="e.g. referral, google, walk-in"
          {...form.register("source")}
        />
      </Field>

      <Field label="Notes">
        <Textarea
          id="edit-notes"
          className="resize-none text-sm"
          rows={4}
          {...form.register("notes")}
        />
      </Field>

      <Button type="submit" size="sm" disabled={saving} className="w-full">
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
