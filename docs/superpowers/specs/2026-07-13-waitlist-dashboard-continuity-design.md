# Waitlist Dashboard Continuity Design

## Objective

Make the post-submission promise truthful: customers who join a full-date waitlist with an email address can see that active waitlist entry in My Bookings, while customers who provide a phone number or social handle are not sent to a dashboard that cannot identify their request.

## Current Evidence

A fresh production audit used an isolated authenticated customer session and intercepted only the booking policy, availability, waitlist submission, and user-data responses so no production record was created.

1. The waitlist success state is clear and responsive. It shows the saved reference, preferred date, follow-up copy, and a primary View My Bookings action on desktop and mobile.
2. Following that primary action for the same contact email opens My Bookings, but the page renders its empty state: "No sessions booked yet."
3. The API confirms the mismatch. `/api/user/bookings` selects only `booking_requests`; it never selects `booking_waitlist`, even though the waitlist response says customers can check bookings.
4. Both booking and waitlist forms accept a general contact value. The dashboard identifies records only by the authenticated account email, so phone numbers and social handles cannot be claimed there.

## Options Considered

### Copy-only correction

Remove the dashboard action from waitlist completion and direct everyone to Xiaohongshu. This is small, but it preserves a real self-service gap for email customers and makes the dashboard less useful.

### Add waitlist continuity to My Bookings

Return active waitlist entries beside bookings from the existing authenticated endpoint, render them as a dedicated non-manageable section, and gate completion-page dashboard guidance on whether the submitted contact is an email. This fixes the broken handoff without a database migration or new route.

### Full waitlist management

Add a separate waitlist page, cancellation endpoint, token recovery, and notification history. This is a useful future direction, but it expands mutation security, lifecycle policy, and product scope beyond the observed failure.

## Chosen Design

Use the additive My Bookings approach.

### API Contract

`GET /api/user/bookings` keeps its existing `bookings` array and adds a `waitlist` array. The handler resolves the authenticated user's email once, then queries bookings and active waitlist rows for that email. Matching is case-insensitive.

Each waitlist row exposes only dashboard-safe fields:

```ts
type WaitlistEntry = {
  id: string;
  package_name: string;
  preferred_date: string;
  name: string;
  active: boolean;
  notified: boolean;
  created_at: string;
};
```

The API returns active rows only, newest first. Existing clients remain compatible because `bookings` is unchanged and `waitlist` is additive. Database errors still use the existing unavailable response path.

### Dashboard Experience

My Bookings treats the page as empty only when both arrays are empty. When active waitlist entries exist, a dedicated Waitlist section appears before confirmed booking cards and uses the existing dashboard card language, spacing, borders, and responsive behavior.

Each waitlist card shows:

- package name and a localized Waiting or Availability update status;
- preferred date and request date;
- a short explanation that the date is full and contact will happen through the submitted channel;
- no cancel, reschedule, deposit, or booking timeline controls, because those actions do not exist for waitlist records.

The booking summary cards remain scoped to actual bookings. They are hidden when the customer has only waitlist entries, avoiding a contradictory row of booking zeroes above a real waitlist record.

### Completion Guidance

The booking modal considers a contact dashboard-compatible only when its trimmed value is a syntactically valid email address.

- For email contacts, completion keeps the dashboard action and explicitly tells the customer to sign in or register with the same email to see status.
- For phone numbers or social handles, completion omits the dashboard action and says updates will go to the contact channel provided. Xiaohongshu and Continue browsing remain available.
- The same rule applies to direct bookings, waitlist joins, duplicate waitlist confirmations, and offline-saved booking completion.

This is a truthfulness boundary, not an account-linking claim: the dashboard query remains exact-email based and does not infer identity from phone numbers or social handles.

### Localization

Add the new waitlist section, status, detail, and contact-specific completion copy to zh-CN, en, ja, and ko. Do not fall back to English for visible dashboard or completion text.

## Boundaries

- Do not add or alter database tables, waitlist tokens, cancellation behavior, or notification delivery.
- Do not expose waitlist contact values or unsubscribe tokens in the dashboard response.
- Do not merge waitlist rows into booking status, payment, cancellation, or reschedule logic.
- Preserve existing booking response fields and all booking-management behavior.
- Preserve the unrelated `.agent/orchestrator-history` files outside release commits.

## Verification

- Add API regression coverage proving same-email active waitlists are returned, inactive rows are excluded by the query, and the existing bookings response is preserved.
- Add source regression coverage for the additive contract, contact gating, and all four locales.
- Extend booking Playwright coverage so a waitlist-only authenticated customer sees the waitlist card instead of the empty state.
- Add a non-email completion regression proving the dashboard action is absent while the contact follow-up and Xiaohongshu paths remain.
- Capture matching desktop/mobile post-fix states and compare them with the accepted production audit screenshots.
- Run lint, all Vitest tests, `build:full`, dependency audit, full Playwright, CI, exact-head Cloudflare Production verification, and fixed/custom-domain live acceptance.

## Rollback

If the additive waitlist query causes a production compatibility problem, remove only the new `waitlist` field and dashboard section, then restore contact-specific completion copy that does not promise dashboard visibility. Do not restore the current misleading waitlist dashboard action without data support.
