import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../_security";

type ConfirmBody = {
  paymentIntentId?: string;
  clientSecret?: string;
};

function normalizeStoredPaymentStatus(status: string) {
  if (status === "canceled") return "cancelled";
  if (["pending", "processing", "succeeded", "failed", "cancelled", "refunded"].includes(status)) return status;
  return "pending";
}

function toClientConfirmationStatus(status: string) {
  if (status === "pending") return "requires_confirmation";
  if (status === "processing") return "processing";
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  return "requires_payment_method";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "payment-confirm", 20, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter, 20);

  if (!context.env.DB) {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as ConfirmBody;

  if (!body.paymentIntentId) {
    return badRequest("Payment intent ID is required");
  }
  if (!body.clientSecret) {
    return badRequest("Client secret is required");
  }

  try {
    const record = await context.env.DB.prepare(
      `SELECT id, status, amount_cents, currency, purpose, provider FROM payment_intents WHERE id = ? AND client_secret = ?`,
    ).bind(body.paymentIntentId, body.clientSecret).first() as {
      id: string;
      status: string;
      amount_cents: number;
      currency: string;
      purpose: string;
      provider: string;
    } | null;

    if (!record) {
      return jsonResponse({ error: "Payment intent not found" }, 404);
    }

    const paymentStatus = normalizeStoredPaymentStatus(record.status);
    const confirmationStatus = toClientConfirmationStatus(paymentStatus);
    const nextAction = record.provider === "placeholder"
      ? "manual_follow_up"
      : confirmationStatus === "succeeded" || confirmationStatus === "failed" || confirmationStatus === "cancelled" || confirmationStatus === "refunded"
        ? "none"
        : "confirm_payment";

    return jsonResponse({
      status: confirmationStatus,
      paymentStatus,
      paymentIntentId: record.id,
      amountCents: record.amount_cents,
      currency: record.currency,
      purpose: record.purpose,
      provider: record.provider,
      nextAction,
    }, 200);
  } catch (error) {
    return unavailable("Failed to confirm payment", error, { route: "/api/payment/confirm", method: "POST" });
  }
};
