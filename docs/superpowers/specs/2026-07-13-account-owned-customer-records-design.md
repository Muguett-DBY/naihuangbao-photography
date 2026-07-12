# Account-Owned Customer Records Design

## Problem

Customer-facing booking, waitlist, workshop, cancellation, reschedule, and dashboard queries currently infer ownership from a free-form contact value or an account email. Registration does not verify email ownership, so a newly created account can read or mutate records submitted by someone else who used the same email address.

The dashboard statistics endpoint is also incorrect: it searches booking contacts with the authenticated user ID and searches workshop names or contacts with that same ID. These queries do not represent ownership and normally return zero.

Production email delivery is not configured. The forgot-password endpoint nevertheless creates a token and tells the user that it was sent, leaving the account unrecoverable while presenting a false success state.

## Verified Production Preconditions

- The production D1 database has zero users, bookings, and waitlist records at the time of this design.
- The previously pending create-only migration `014_create_photo_object_delete_queue.sql` has been applied and verified.
- Production has `AUTH_SECRET` but does not have `RESEND_API_KEY`.
- Booking, waitlist, and workshop submission must remain available to signed-out visitors.

Because no customer records exist, ownership can move to explicit user IDs without an unsafe email-based backfill or user-visible data loss.

## Goals

1. Make the authenticated session user ID the only dashboard and mutation ownership key.
2. Preserve anonymous booking, waitlist, and workshop conversion flows.
3. Link a new record to an account only when a valid user session exists at submission time.
4. Make success-screen dashboard actions depend on server-confirmed account linkage.
5. Correct booking and workshop dashboard statistics.
6. Fail password-reset requests truthfully when delivery is unavailable without leaking whether an account exists.
7. Keep the migration additive and safe to apply before the code deployment.

## Non-Goals

- Adding a new email provider or creating a production email secret.
- Retrospectively claiming anonymous records by email.
- Adding an email-verification lifecycle to account registration.
- Changing admin booking or workshop operations.
- Changing notification delivery for booking or workshop confirmations.

## Data Model

Add a nullable `user_id` foreign key to:

- `booking_requests`
- `booking_waitlist`
- `workshop_registrations`

Each column references `users(id)` with `ON DELETE SET NULL`. Add an index for each user-scoped query.

The migration does not backfill from `contact`. Matching a free-form contact to an account after the fact would preserve the vulnerability this change is intended to remove.

Update `db/schema.sql` so new databases are equivalent to migrated databases.

## Ownership At Submission

Booking, waitlist, and workshop registration handlers will attempt to read the normal signed user session:

- valid session: insert the authenticated `userId` into `user_id`;
- missing, invalid, or unavailable session secret: insert `NULL` and continue the public submission.

Contact remains a communication field. It no longer grants dashboard access or mutation authority.

Successful booking and waitlist responses include `accountLinked: boolean`. Workshop registration also returns the field for API consistency, even though its current confirmation UI does not show a dashboard action.

Duplicate anonymous waitlist detection may still use normalized contact to avoid repeated entries, but it does not create ownership. Authenticated duplicate detection uses `user_id` so account linkage remains explicit.

## Authenticated Reads And Mutations

The following operations use only the session user ID:

- booking list: `booking_requests.user_id = session.userId`;
- active waitlist list: `booking_waitlist.user_id = session.userId`;
- workshop list: `workshop_registrations.user_id = session.userId`;
- booking cancellation and reschedule: selected booking `user_id` must equal `session.userId`;
- overview booking and workshop totals: count rows by `user_id`.

No authenticated customer query may derive ownership from `contact`, `name`, or account email.

## Success UI Contract

`BookingModal` stores the server-provided `accountLinked` result.

- linked online submission: show the dashboard action and explain that the request is attached to the signed-in account;
- anonymous online submission: hide the dashboard action and explain that updates will use the supplied contact channel;
- offline saved submission: treat as unlinked until a server sync actually succeeds, so no dashboard promise is shown;
- waitlist duplicate: show a dashboard action only when the API confirms the existing entry is owned by the current account.

This replaces contact-format guessing. An email-shaped contact alone is never sufficient.

## Password Reset Truthfulness

Before querying the user table, the forgot-password endpoint checks delivery capability:

- `RESEND_API_KEY` configured: keep the current anti-enumeration success response and send the token;
- `DEMO_MODE=true`: keep the explicit local demo-token behavior;
- neither configured: return a uniform `503` with error code `email_delivery_unavailable`.

The provider check happens before account lookup, so the unavailable response cannot enumerate registered emails. The login UI maps the code to localized guidance instead of advancing to the token form.

## Migration And Release Order

1. Complete local API, source, build, and browser verification.
2. Apply migration `015` to production D1 before pushing code.
3. Verify the three columns and indexes exist and that no migrations remain pending.
4. Push `main`, wait for exact-SHA GitHub CI and Cloudflare Production deployment.
5. Verify anonymous and account-linked completion behavior, authenticated dashboard ownership, HTTP health, and custom-domain smoke tests.

The additive columns are ignored by the old deployment, so applying the migration before code is backward compatible.

## Test Strategy

### API

- authenticated booking, waitlist, and workshop submissions bind the session user ID;
- anonymous submissions bind `NULL` and remain successful;
- customer lists and stats query `user_id`, not contact or email;
- cancellation and reschedule reject a same-contact record owned by another user;
- password reset returns uniform `503` before database access when delivery is unavailable;
- configured Resend and explicit demo mode keep their existing behavior.

### Browser

- anonymous email booking/waitlist success has no dashboard action;
- server-confirmed linked booking/waitlist success has the dashboard action;
- waitlist-only dashboard rendering continues to work;
- mobile and desktop success states have no overflow or overlapping actions.

### Release Gates

- lint/typecheck;
- full Vitest suite;
- production build and performance budget;
- dependency audit;
- full Playwright suite;
- exact-SHA CI, D1 migration, Cloudflare deployment, HTTP, browser, and custom-domain smoke verification.

## Risks And Mitigations

- **Anonymous users cannot later claim a record by registering the same email.** This is intentional; contact-based claiming is insecure without email verification. Copy sets the expectation before exposing a dashboard action.
- **An offline request may sync after the login session expires.** Offline success never promises account linkage. The API decides ownership at actual sync time.
- **A migration/code ordering mistake can break reads.** Apply and verify the additive migration before the code push.
- **Password reset remains unavailable until a provider secret is configured.** The product reports this truthfully and keeps login/registration usable; configuring Resend remains an external deployment task.
