import { badRequest, jsonResponse, unavailable } from "../../_responses";

type WebhookBody = {
  type?: string;
  data?: {
    object?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
};

export const onRequestPost: PagesFunction<Env & { STRIPE_WEBHOOK_SECRET?: string }> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as WebhookBody;

  if (!body.type || !body.data?.object?.id) {
    return badRequest("Invalid webhook payload");
  }

  const { type, data } = body;
  const obj = data?.object;
  if (!obj?.id || !obj.status) {
    return badRequest("Missing payment intent details");
  }
  const paymentIntentId = obj.id;
  const rawStatus = obj.status;
  const metadata = obj.metadata;

  const statusMap: Record<string, string> = {
    succeeded: "succeeded",
    processing: "processing",
    requires_payment_method: "pending",
    requires_confirmation: "pending",
    canceled: "cancelled",
    failed: "failed",
  };

  const normalizedStatus = statusMap[rawStatus] || "pending";

  try {
    const existing = await context.env.DB.prepare(
      `SELECT id, purpose, reference_id, status FROM payment_intents WHERE id = ?`,
    ).bind(paymentIntentId).first() as {
      id: string;
      purpose: string;
      reference_id: string;
      status: string;
    } | null;

    if (!existing) {
      return jsonResponse({ received: true, note: "Payment intent not found, skipping" }, 200);
    }

    await context.env.DB.prepare(
      `UPDATE payment_intents SET status = ?, updated_at = ? WHERE id = ?`,
    ).bind(normalizedStatus, new Date().toISOString(), paymentIntentId).run();

    if (type === "payment_intent.succeeded" && existing.purpose === "course_purchase") {
      await context.env.DB.prepare(
        `INSERT OR REPLACE INTO course_purchases (id, course_id, user_id, payment_intent_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          metadata?.course_id || existing.reference_id,
          metadata?.user_id || "anonymous",
          paymentIntentId,
          new Date().toISOString(),
        )
        .run();
    }

    if (type === "payment_intent.succeeded" && existing.purpose === "workshop_registration") {
      await context.env.DB.prepare(
        `UPDATE workshop_registrations SET status = 'confirmed' WHERE id = ?`,
      ).bind(existing.reference_id).run();
    }

    if (type === "payment_intent.succeeded" && existing.purpose === "booking_deposit") {
      await context.env.DB.prepare(
        `UPDATE booking_requests SET status = 'confirmed' WHERE id = ?`,
      ).bind(existing.reference_id).run();
    }

    return jsonResponse({ received: true }, 200);
  } catch (error) {
    return unavailable("Webhook processing failed", error, { route: "/api/payment/webhook", method: "POST" });
  }
};
