"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { queueBookingNotifications } from "@/lib/notifications";
import { pushAppointmentSync } from "@/lib/calendar/sync";

const bookingSchema = z.object({
  tenantId: z.string(),
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone number is required").max(30),
  notes: z.string().max(500).optional(),
});

export type BookingState = {
  error?: string;
  appointmentId?: string;
};

export async function createBooking(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const raw = {
    tenantId: formData.get("tenantId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone"),
    notes: formData.get("notes") || "",
  };

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, serviceId, date, time, name, email, phone, notes } = parsed.data;

  // Fetch service to compute endAt
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, isActive: true },
    select: { duration: true, bufferTime: true },
  });
  if (!service) return { error: "Service not found" };

  const [h, m] = time.split(":").map(Number);
  const startAt = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  const endAt = new Date(startAt.getTime() + (service.duration + service.bufferTime) * 60000);

  // Upsert customer by phone (within tenant)
  let customer = await prisma.customer.findFirst({
    where: { tenantId, phone },
    select: { id: true },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        name,
        phone,
        email: email || null,
        source: "SELF_SERVICE",
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastSeenAt: new Date(), name },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      customerId: customer.id,
      serviceId,
      startAt,
      endAt,
      status: "PENDING",
      notes: notes || null,
      bookedVia: "SELF_SERVICE",
    },
    select: { id: true },
  });

  // Fire-and-forget: email notifications + calendar sync
  queueBookingNotifications(appointment.id).catch((err) =>
    console.error("[booking] failed to queue notifications:", err)
  );
  pushAppointmentSync(appointment.id).catch((err) =>
    console.error("[booking] failed to push to calendar:", err)
  );

  return { appointmentId: appointment.id };
}
