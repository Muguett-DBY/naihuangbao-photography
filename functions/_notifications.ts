import { isValidEmail } from "./_security";

export type NotificationEnv = Env & {
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
};

export type TransactionalNotificationType = "booking_confirmation" | "workshop_registration" | "payment_receipt";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const templates: Record<TransactionalNotificationType, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  booking_confirmation: (data) => ({
    subject: `Booking received - ${escapeHtml(data.packageName || "Portrait session")}`,
    html: `<h2>Booking received</h2><p>Dear ${escapeHtml(data.name)},</p><p>Your booking request has been received.</p><ul><li>Package: ${escapeHtml(data.packageName || "To be confirmed")}</li><li>Date: ${escapeHtml(data.preferredDate || "To be confirmed")}</li><li>Time: ${escapeHtml(data.preferredTime || "To be confirmed")}</li></ul><p>Booking ID: ${escapeHtml(data.bookingId)}</p>`,
  }),
  workshop_registration: (data) => ({
    subject: `Workshop registration - ${escapeHtml(data.workshopTitle || "Workshop")}`,
    html: `<h2>Workshop registration received</h2><p>Dear ${escapeHtml(data.name)},</p><ul><li>Workshop: ${escapeHtml(data.workshopTitle)}</li><li>Date: ${escapeHtml(data.eventDate || "TBD")}</li><li>Location: ${escapeHtml(data.location || "TBD")}</li></ul><p>Registration ID: ${escapeHtml(data.registrationId)}</p>`,
  }),
  payment_receipt: (data) => ({
    subject: `Payment receipt - ${escapeHtml(data.purpose || "Transaction")}`,
    html: `<h2>Payment receipt</h2><p>Dear ${escapeHtml(data.name || "Customer")},</p><ul><li>Amount: ${escapeHtml(formatAmount(data.amountCents, data.currency))}</li><li>Purpose: ${escapeHtml(data.purpose)}</li><li>Transaction ID: ${escapeHtml(data.paymentIntentId)}</li></ul>`,
  }),
};

function formatAmount(amount: unknown, currency: unknown) {
  const cents = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `${(cents / 100).toFixed(2)} ${String(currency || "USD").toUpperCase()}`;
}

export async function sendTransactionalNotification(
  env: NotificationEnv,
  type: TransactionalNotificationType,
  recipient: string,
  data: Record<string, unknown>,
) {
  const to = recipient.trim().toLowerCase();
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey || !isValidEmail(to)) return { sent: false as const, reason: "not_configured_or_not_email" as const };

  const template = templates[type](data);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM?.trim() || "Naihuangbao Photography <noreply@shoot.custard.top>",
      to: [to],
      subject: template.subject,
      html: template.html,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return { sent: true as const };
}

export function sendTransactionalNotificationSafely(
  env: NotificationEnv,
  type: TransactionalNotificationType,
  recipient: string,
  data: Record<string, unknown>,
) {
  return sendTransactionalNotification(env, type, recipient, data).catch((error) => {
    console.warn("Transactional notification delivery failed", error);
    return { sent: false as const, reason: "delivery_failed" as const };
  });
}
