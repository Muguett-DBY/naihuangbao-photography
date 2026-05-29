import { badRequest, jsonResponse, unavailable } from "../../_responses";

type ConfirmBody = {
  paymentIntentId?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as ConfirmBody;

  if (!body.paymentIntentId) {
    return badRequest("Payment intent ID is required");
  }

  try {
    const record = await context.env.DB.prepare(
      `SELECT id, status, amount_cents, currency, purpose FROM payment_intents WHERE id = ?`,
    ).bind(body.paymentIntentId).first() as {
      id: string;
      status: string;
      amount_cents: number;
      currency: string;
      purpose: string;
    } | null;

    if (!record) {
      return jsonResponse({ error: "Payment intent not found" }, 404);
    }

    return jsonResponse({
      status: record.status,
      paymentIntentId: record.id,
      amountCents: record.amount_cents,
      currency: record.currency,
      purpose: record.purpose,
    }, 200);
  } catch (error) {
    return unavailable("Failed to confirm payment", error, { route: "/api/payment/confirm", method: "POST" });
  }
};
