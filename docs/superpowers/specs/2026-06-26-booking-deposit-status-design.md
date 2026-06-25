# Booking Deposit Status Design

## Goal

Complete the user-visible path from booking request to deposit status while the deployment still lacks a real payment provider.

## Product Decision

The site must not imply that a card was charged when the backend only creates a placeholder `payment_intents` row. The booking remains valid whether the customer records a pending deposit intent, defers payment, or submits while offline.

## Experience

- The payment surface shows the booking deposit amount and clearly states that online charging is unavailable.
- Recording the deposit creates a pending intent and returns immediately instead of polling for a success state that cannot occur.
- Deferring payment still completes the booking request and records a distinct user-visible next step.
- Offline bookings skip server payment creation until the booking has synchronized.
- Authenticated booking cards show `not started`, `pending`, `processing`, `paid`, `failed`, or `cancelled` deposit state with amount details when available.

## Data Flow

1. `POST /api/booking` creates the booking request.
2. `POST /api/payment/create-intent` creates a placeholder pending intent and returns its provider and status.
3. `GET /api/user/bookings` joins each booking to its latest booking-deposit intent.
4. The booking modal and dashboard render the returned state without treating `pending` as payment success.

## Error And Edge Handling

- Missing payment rows map to `not_started`.
- Historical Stripe spelling `canceled` maps to `cancelled`.
- Placeholder intents never enter confirmation polling.
- Offline local booking IDs never create server payment records.
- Existing real-provider confirmation handling remains available for future provider integration.

## Verification

- API regression tests for payment response metadata and booking payment projection.
- Source regressions for offline gating and visible deposit status.
- Full TypeScript, Vitest, production build, booking Playwright, desktop/mobile browser checks, CI, and deployment verification.
