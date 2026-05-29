import { badRequest, jsonResponse, unavailable } from "../../_responses";

type CreateIntentBody = {
  purpose?: string;
  amountCents?: number;
  currency?: string;
  referenceId?: string;
  metadata?: Record<string, string>;
};

const VALID_PURPOSES = ["booking_deposit", "course_purchase", "workshop_registration", "preset_purchase", "merchandise_purchase"];
const VALID_CURRENCIES = ["usd", "eur", "gbp", "cny", "jpy"];

export const onRequestPost: PagesFunction<Env & { STRIPE_SECRET_KEY?: string }> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "Payment service temporarily unavailable" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as CreateIntentBody;

  const purpose = body.purpose;
  const amountCents = body.amountCents;
  const referenceId = body.referenceId;

  if (!purpose || !VALID_PURPOSES.includes(purpose)) {
    return badRequest("Invalid payment purpose");
  }

  if (!amountCents || !Number.isInteger(amountCents) || amountCents <= 0) {
    return badRequest("Invalid payment amount");
  }

  if (amountCents > 1000000) {
    return badRequest("Payment amount exceeds maximum");
  }

  if (!referenceId) {
    return badRequest("Reference ID is required");
  }

  const currency = (body.currency || "usd").toLowerCase();
  if (!VALID_CURRENCIES.includes(currency)) {
    return badRequest("Invalid currency");
  }

  const paymentIntentId = `pi_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const clientSecret = `${paymentIntentId}_secret_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const createdAt = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `INSERT INTO payment_intents (id, purpose, reference_id, amount_cents, currency, status, provider, client_secret, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 'placeholder', ?, ?, ?, ?)`,
    )
      .bind(
        paymentIntentId,
        purpose,
        referenceId,
        amountCents,
        currency,
        clientSecret,
        body.metadata ? JSON.stringify(body.metadata) : null,
        createdAt,
        createdAt,
      )
      .run();

    return jsonResponse({
      clientSecret,
      paymentIntentId,
      amountCents,
      currency,
    }, 201);
  } catch (error) {
    return unavailable("Failed to create payment intent", error, { route: "/api/payment/create-intent", method: "POST" });
  }
};
