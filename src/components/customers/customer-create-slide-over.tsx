"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer } from "@/lib/actions/customers";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // comma-separated, split on submit
});

type FormData = z.infer<typeof schema>;

interface CustomerCreateSlideOverProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantSlug: string;
}

export function CustomerCreateSlideOver({
  open,
  onClose,
  tenantId,
  tenantSlug,
}: CustomerCreateSlideOverProps) {
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", notes: "", tags: "" },
  });

  function handleOpenChange(o: boolean) {
    if (!o) {
      form.reset();
      setErrorBanner(null);
      onClose();
    }
  }

  async function onSubmit(data: FormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      const tags = data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const result = await createCustomer(tenantId, tenantSlug, {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
        tags,
      });

      if (!result.success) {
        setErrorBanner(result.error ?? "Failed to create customer");
        return;
      }

      toast.success("Customer created");
      form.reset();
      onClose();
    } catch {
      setErrorBanner("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-[var(--border)] px-5 py-4">
          <SheetTitle className="text-base font-semibold text-[var(--text-primary)]">
            New customer
          </SheetTitle>
        </SheetHeader>

        {errorBanner && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorBanner}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <label
                htmlFor="create-name"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Name *
              </label>
              <Input
                id="create-name"
                className="text-sm"
                placeholder="Jane Doe"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-[var(--danger)]">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-email"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Email
              </label>
              <Input
                id="create-email"
                type="email"
                className="text-sm"
                placeholder="jane@example.com"
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
                htmlFor="create-phone"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Phone
              </label>
              <Input
                id="create-phone"
                type="tel"
                className="text-sm"
                placeholder="+1 555 000 0000"
                {...form.register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-tags"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Tags
              </label>
              <Input
                id="create-tags"
                className="text-sm"
                placeholder="vip, loyal, referral (comma-separated)"
                {...form.register("tags")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-notes"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Notes
              </label>
              <Textarea
                id="create-notes"
                className="resize-none text-sm"
                rows={3}
                placeholder="Internal notes…"
                {...form.register("notes")}
              />
            </div>
          </div>

          <SheetFooter className="border-t border-[var(--border)] px-5 py-4">
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Create customer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
