# Payment Live Readiness Runbook

This runbook keeps the current placeholder/manual follow-up flow safe until real Stripe live payments are enabled. Do not commit real secret values to this repository.

## Required live configuration

- `STRIPE_SECRET_KEY`: set as a Cloudflare Pages secret for server-side PaymentIntent creation.
- `STRIPE_PUBLISHABLE_KEY`: expose only the publishable client key through the frontend runtime path chosen for Payment Element.
- `STRIPE_WEBHOOK_SECRET`: set as a Cloudflare Pages secret and verify every `/api/payment/webhook` request with the raw body and `stripe-signature` header.
- `AUTH_SECRET`, `RATE_LIMIT_SECRET`, and admin credentials remain required before payment operations are trusted.

## Payment Element client path

1. Keep placeholder/manual follow-up as the default until live keys are configured in the target environment.
2. Load Stripe.js only on the payment surface that needs Payment Element.
3. Create a server PaymentIntent through `/api/payment/create-intent`.
4. Mount Payment Element with the returned client secret.
5. Submit with Stripe confirmation, then call `/api/payment/confirm` to read the stored status.
6. Show `pending`, `processing`, `succeeded`, `failed`, `cancelled`, and `refunded` exactly as the existing customer and admin status model defines them.

## Webhook event matrix

| Stripe event | Stored status | Required handling |
| --- | --- | --- |
| `payment_intent.succeeded` | `succeeded` | Mark the payment intent paid and unlock the matching booking deposit, course purchase, or workshop registration side effect. |
| `payment_intent.processing` | `processing` | Keep the booking in manual follow-up until Stripe sends a terminal event. |
| `payment_intent.payment_failed` | `failed` | Keep the customer-facing retry path available and leave the admin item visible for manual follow-up. |
| `payment_intent.canceled` | `cancelled` | Tell the customer no charge was completed and keep the admin item reviewable. |
| `charge.refunded` | `refunded` | Record the refunded state and keep the booking visible for reconciliation; do not treat refund events as new successful payments. |

## Refund and failure operations

- Refunds need a stored refund status, amount, Stripe charge id, actor, and timestamp before the team can reconcile them safely.
- Failed payments should remain visible in the admin payment follow-up queue until the customer retries, cancels, or staff resolves the booking manually.
- Manual follow-up is the fallback whenever Stripe returns an unknown status, a webhook arrives out of order, or the local payment intent is missing.

## Rollback

Use this rollback plan when live payments need to be paused without losing the booking request flow.

1. Disable the live payment UI flag or remove the publishable key from the deployment environment.
2. Keep `/api/payment/create-intent` returning placeholder/manual follow-up readiness.
3. Leave webhook verification in place, but treat live events as non-customer-visible until reconciliation is complete.
4. Use the admin pending/processing queue to contact affected customers.

## Verification checklist

- Local tests cover Payment Element readiness copy, confirmation states, webhook idempotency, and admin manual follow-up.
- A signed webhook fixture updates each supported status once and ignores duplicate same-status events.
- Unsigned webhook requests still fail before checking deployment secrets.
- Admin booking filters show pending, processing, and refunded counts before launch.
- No `sk_live_` or `whsec_` values exist in committed source, docs, logs, or test snapshots.
