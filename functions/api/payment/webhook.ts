import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { timingSafeEqual } from "../../_security";

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

  const webhookSecret = context.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return jsonResponse({ error: "Webhook signing secret is not configured" }, 503);
  }

  const rawBody = await context.request.text();
  const signatureHeader = context.request.headers.get("stripe-signature") ?? "";
  const verified = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  if (!verified) {
    return jsonResponse({ error: "Invalid webhook signature" }, 400);
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody || "{}") as WebhookBody;
  } catch {
    return badRequest("Invalid webhook payload");
  }

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
        `INSERT INTO course_purchases (id, course_id, user_id, payment_intent_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(course_id, user_id)
         DO UPDATE SET payment_intent_id = excluded.payment_intent_id`,
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

async function verifyStripeSignature(rawBody: string, header: string, secret: string) {
  const timestamp = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|,)v1=([0-9a-f]+)/g)].map((match) => match[1]);
  if (!timestamp || signatures.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const expected = await hmacSha256Hex(`${timestamp}.${rawBody}`, secret);
  return signatures.some((signature) => /^[0-9a-f]+$/i.test(signature) && timingSafeEqual(signature, expected));
}

async function hmacSha256Hex(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
