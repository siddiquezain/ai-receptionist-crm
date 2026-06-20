// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(tenantName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${tenantName}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e5e5e5;padding:20px 32px;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#737373;text-align:center;">
              This email was sent by ${tenantName}. Powered by AppointEase.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#737373;font-size:14px;width:130px;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#0a0a0a;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

function detailTable(rows: [string, string][]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    ${rows.map(([l, v]) => detailRow(l, v)).join("")}
  </table>`;
}

function primaryButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;margin-top:8px;">${text}</a>`;
}

// ─── Payload types ─────────────────────────────────────────────────────────────

export interface AppointmentEmailPayload {
  tenantName: string;
  customerName: string;
  serviceName: string;
  date: string;     // "Saturday, June 21, 2026"
  time: string;     // "10:00 AM"
  notes?: string;
  tenantSlug?: string;
}

export interface StaffEmailPayload extends AppointmentEmailPayload {
  customerPhone?: string;
  customerEmail?: string;
  appointmentId: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function appointmentConfirmation(p: AppointmentEmailPayload): string {
  const rows: [string, string][] = [
    ["Service", p.serviceName],
    ["Date", p.date],
    ["Time", p.time],
  ];
  if (p.notes) rows.push(["Notes", p.notes]);

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0a0a0a;">You&rsquo;re booked, ${p.customerName}!</h1>
    <p style="margin:0 0 4px;color:#737373;font-size:15px;">Your appointment with <strong>${p.tenantName}</strong> is confirmed.</p>
    ${detailTable(rows)}
    <p style="color:#737373;font-size:13px;margin-top:16px;">Need to make changes? Contact us directly.</p>
  `;
  return layout(p.tenantName, body);
}

export function appointmentReminder(p: AppointmentEmailPayload, when: "24h" | "1h"): string {
  const timeDesc = when === "24h" ? "tomorrow" : "in 1 hour";
  const rows: [string, string][] = [
    ["Service", p.serviceName],
    ["Date", p.date],
    ["Time", p.time],
  ];

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0a0a0a;">Reminder: appointment ${timeDesc}</h1>
    <p style="margin:0 0 4px;color:#737373;font-size:15px;">Hi ${p.customerName}, just a friendly reminder about your upcoming appointment with <strong>${p.tenantName}</strong>.</p>
    ${detailTable(rows)}
    <p style="color:#737373;font-size:13px;margin-top:16px;">We look forward to seeing you!</p>
  `;
  return layout(p.tenantName, body);
}

export function appointmentCancelled(p: AppointmentEmailPayload): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0a0a0a;">Appointment cancelled</h1>
    <p style="margin:0 0 4px;color:#737373;font-size:15px;">Hi ${p.customerName}, your appointment with <strong>${p.tenantName}</strong> has been cancelled.</p>
    ${detailTable([
      ["Service", p.serviceName],
      ["Date", p.date],
      ["Time", p.time],
    ])}
    <p style="color:#737373;font-size:13px;margin-top:16px;">If you&rsquo;d like to rebook, please visit our booking page.</p>
    ${p.tenantSlug ? primaryButton("Book a new appointment", `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${p.tenantSlug}`) : ""}
  `;
  return layout(p.tenantName, body);
}

export function staffNewBooking(p: StaffEmailPayload): string {
  const rows: [string, string][] = [
    ["Customer", p.customerName],
    ["Service", p.serviceName],
    ["Date", p.date],
    ["Time", p.time],
  ];
  if (p.customerPhone) rows.push(["Phone", p.customerPhone]);
  if (p.customerEmail) rows.push(["Email", p.customerEmail]);
  if (p.notes) rows.push(["Notes", p.notes]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const dashLink = p.tenantSlug
    ? `${appUrl}/${p.tenantSlug}/appointments`
    : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0a0a0a;">New appointment booked</h1>
    <p style="margin:0 0 4px;color:#737373;font-size:15px;">A new appointment has been scheduled for <strong>${p.tenantName}</strong>.</p>
    ${detailTable(rows)}
    ${dashLink ? primaryButton("View in dashboard", dashLink) : ""}
  `;
  return layout(p.tenantName, body);
}

export function staffCancellation(p: StaffEmailPayload): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#dc2626;">Appointment cancelled</h1>
    <p style="margin:0 0 4px;color:#737373;font-size:15px;">The following appointment has been cancelled.</p>
    ${detailTable([
      ["Customer", p.customerName],
      ["Service", p.serviceName],
      ["Date", p.date],
      ["Time", p.time],
    ])}
  `;
  return layout(p.tenantName, body);
}
