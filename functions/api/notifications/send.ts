import { jsonResponse, badRequest, unavailable } from "../../_responses";
import { enforceRateLimit, isValidEmail, rateLimited, requirePublicMutationRequest } from "../../_security";

type NotificationType = "booking_confirmation" | "workshop_registration" | "payment_receipt";

type NotificationBody = {
  type: NotificationType;
  to: string;
  data: Record<string, unknown>;
};

/** Escape HTML special characters to prevent injection */
function esc(val: unknown): string {
  const s = String(val ?? "");
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const notificationTemplates: Record<NotificationType, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  booking_confirmation: (data) => ({
    subject: `Booking Confirmation - ${esc(data.packageName || "Portrait Session")}`,
    html: `
      <h2>Booking Confirmation</h2>
      <p>Dear ${esc(data.name)},</p>
      <p>Your portrait booking has been confirmed.</p>
      <ul>
        <li>Package: ${esc(data.packageName || "Standard")}</li>
        <li>Date: ${esc(data.preferredDate || "To be determined")}</li>
        <li>Time: ${esc(data.preferredTime || "To be determined")}</li>
      </ul>
      <p>We will contact you shortly to finalize the details.</p>
      <p>Booking ID: ${esc(data.bookingId)}</p>
    `,
  }),
  workshop_registration: (data) => ({
    subject: `Workshop Registration - ${esc(data.workshopTitle || "Workshop")}`,
    html: `
      <h2>Workshop Registration Confirmed</h2>
      <p>Dear ${esc(data.name)},</p>
      <p>You have been successfully registered for the workshop.</p>
      <ul>
        <li>Workshop: ${esc(data.workshopTitle || "Workshop")}</li>
        <li>Date: ${esc(data.eventDate || "TBD")}</li>
        <li>Location: ${esc(data.location || "TBD")}</li>
      </ul>
      <p>Registration ID: ${esc(data.registrationId)}</p>
    `,
  }),
  payment_receipt: (data) => ({
    subject: `Payment Receipt - ${esc(data.purpose || "Transaction")}`,
    html: `
      <h2>Payment Receipt</h2>
      <p>Dear ${esc(data.name || "Customer")},</p>
      <p>Your payment has been processed successfully.</p>
      <ul>
        <li>Amount: $${esc(((data.amountCents as number) / 100).toFixed(2))} ${esc((data.currency as string)?.toUpperCase() || "USD")}</li>
        <li>Purpose: ${esc(data.purpose || "Purchase")}</li>
        <li>Transaction ID: ${esc(data.paymentIntentId || data.transactionId)}</li>
      </ul>
      <p>Thank you for your purchase!</p>
    `,
  }),
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "notification-send", 10, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as NotificationBody;

  if (!body.type || !body.to) {
    return badRequest("Missing required fields: type, to");
  }

  if (!isValidEmail(body.to.trim())) {
    return badRequest("Invalid recipient email");
  }

  if (!notificationTemplates[body.type]) {
    return badRequest(`Invalid notification type: ${body.type}`);
  }

  const template = notificationTemplates[body.type](body.data || {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = context.env as any;
  const from = env.EMAIL_FROM || "noreply@portrait-booking.example.com";

  try {
    // Placeholder: In production, replace with actual email provider API call
    // Example with Resend: await resend.emails.send({ from, to: body.to, subject: template.subject, html: template.html });
    // Example with Cloudflare Email Workers: await context.env.SEND_EMAIL(from, body.to, template.subject, template.html);

    return jsonResponse({
      ok: true,
      message: "Notification queued for delivery",
      type: body.type,
    });
  } catch (error) {
    return unavailable("Failed to send notification", error, {
      route: "/api/notifications/send",
      method: "POST",
    });
  }
};
