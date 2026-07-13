# Account-Owned Customer Records Implementation Plan

> **Execution contract:** Follow test-driven development. Every behavioral task begins with a failing focused test, then the smallest implementation, then focused GREEN verification. Work only on `main`, stage exact files, never stage `.agent/orchestrator-history`, apply the additive D1 migration before the code push, and close with exact-SHA GitHub/Cloudflare/live acceptance.

**Goal:** Replace contact/email-derived customer ownership with explicit session `user_id` ownership across bookings, waitlists, workshops, dashboard statistics, and booking mutations while keeping anonymous submissions available and making password-reset delivery truthful.

**Architecture:** Public creation handlers optionally resolve the normal signed user session and store its user ID in nullable ownership columns. Authenticated reads and mutations use only those columns. Booking success UI uses a server-provided `accountLinked` result instead of contact-format inference. Password reset checks delivery capability before any account lookup.

**Tech stack:** Cloudflare Pages Functions, D1/SQLite migrations, React 19, TypeScript, Vitest, Playwright, i18next, Wrangler.

---

## Task 1: Lock the ownership boundary with failing API tests

**Files:**
- Create: `functions/customer-ownership.test.ts`
- Modify: `functions/api.test.ts`

**Interfaces under test:**
- `POST /api/booking`
- `POST /api/booking/waitlist`
- `POST /api/workshops/:id/register`
- `GET /api/user/bookings`
- `GET /api/user/workshops`
- `GET /api/user/stats`
- `POST /api/user/bookings/:id/cancel`
- `POST /api/user/bookings/:id/reschedule`

- [x] **Step 1: Add a focused ownership test harness**

Create signed and anonymous requests plus D1 statement mocks that record SQL and bind values without relying on contact values for identity.

- [x] **Step 2: Add RED creation tests**

Require:

- authenticated booking insert binds `session.userId` to `user_id` and returns `accountLinked: true`;
- anonymous booking insert binds `NULL` and returns `accountLinked: false`;
- authenticated waitlist insert binds `session.userId`;
- authenticated workshop registration insert binds `session.userId`.

- [x] **Step 3: Add RED read/statistics tests**

Require:

- booking and active waitlist list SQL filters by `user_id = ?`;
- workshop list SQL filters by `wr.user_id = ?`;
- booking/workshop totals filter by `user_id = ?`;
- source SQL does not use account email, `contact like`, or `name/contact` identity fallbacks.

- [x] **Step 4: Add RED mutation tests**

Require cancellation and reschedule to return 403 when the selected record has the same contact email but a different `user_id`.

- [x] **Step 5: Run focused RED verification**

Run: `npx vitest run functions/customer-ownership.test.ts functions/api.test.ts`

Expected: new ownership assertions fail against contact/email-derived handlers.

---

## Task 2: Add additive ownership columns and optional session resolution

**Files:**
- Create: `db/migrations/015_add_customer_record_owners.sql`
- Modify: `db/schema.sql`
- Modify: `functions/_auth.ts`

- [x] **Step 1: Add the migration**

Add nullable `user_id` references with `ON DELETE SET NULL` to `booking_requests`, `booking_waitlist`, and `workshop_registrations`, plus indexes:

- `idx_booking_requests_user`
- `idx_booking_waitlist_user`
- `idx_workshop_registrations_user`

Do not backfill from contact.

- [x] **Step 2: Align the canonical schema**

Add the same columns, foreign keys, and indexes to `db/schema.sql` so a fresh database matches a migrated database.

- [x] **Step 3: Add an optional session helper**

Add a helper in `functions/_auth.ts` that returns the authenticated `userId` when `AUTH_SECRET` and a valid session are present, otherwise returns `null` without rejecting a public submission.

- [x] **Step 4: Add migration/source contract checks**

Extend `functions/customer-ownership.test.ts` or an existing source contract to require all three columns/indexes and prohibit contact-based backfill SQL.

- [x] **Step 5: Run focused checks**

Run: `npx vitest run functions/customer-ownership.test.ts`

Expected: migration/helper checks pass while handler behavior remains RED.

---

## Task 3: Bind account ownership during public submissions

**Files:**
- Modify: `functions/api/booking.ts`
- Modify: `functions/api/booking/waitlist.ts`
- Modify: `functions/api/workshops/[id]/register.ts`
- Modify: `functions/waitlist.test.ts`
- Modify: `functions/api.test.ts`

- [x] **Step 1: Link direct bookings**

Resolve the optional user ID before the insert, add `user_id` to the statement, bind the ID or `null`, and return `accountLinked` from the actual resolved value.

- [x] **Step 2: Link waitlist entries and duplicates**

Insert `user_id`. Authenticated duplicate detection uses `user_id`; anonymous duplicate prevention may use normalized contact but returns `accountLinked: false`. Existing entries return `accountLinked` only when ownership is confirmed by user ID.

- [x] **Step 3: Link workshop registrations**

Add `user_id` to the registration insert and return `accountLinked`.

- [x] **Step 4: Run creation GREEN checks**

Run: `npx vitest run functions/customer-ownership.test.ts functions/waitlist.test.ts functions/api.test.ts`

Expected: authenticated and anonymous creation contracts pass.

---

## Task 4: Replace every customer read, mutation, and statistic fallback

**Files:**
- Modify: `functions/api/user/bookings.ts`
- Modify: `functions/api/user/bookings/[id]/cancel.ts`
- Modify: `functions/api/user/bookings/[id]/reschedule.ts`
- Modify: `functions/api/user/workshops.ts`
- Modify: `functions/api/user/stats.ts`
- Modify: `functions/api.test.ts`
- Modify: `functions/customer-ownership.test.ts`

- [x] **Step 1: Read bookings and waitlist by user ID**

Remove the user-email lookup and filter both result sets directly with `user.userId`.

- [x] **Step 2: Authorize booking mutations by user ID**

Select booking `user_id`; cancellation and reschedule return 403 unless it equals the session user ID. Contact remains returned/displayed data only.

- [x] **Step 3: Read workshops and calculate stats by user ID**

Filter workshop registrations by `wr.user_id`. Count bookings and workshops by `user_id`; remove the `contact like` and `name/contact` fallbacks.

- [x] **Step 4: Run complete ownership GREEN checks**

Run: `npx vitest run functions/customer-ownership.test.ts functions/api.test.ts functions/waitlist.test.ts`

Expected: all ownership tests pass, including same-contact/different-owner rejection.

---

## Task 5: Make completion UI use server-confirmed linkage

**Files:**
- Modify: `src/components/BookingModal.tsx`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/lib/booking-conversion.test.ts`
- Modify: `e2e/booking.spec.ts`
- Modify: `e2e/offline-booking-recovery.spec.ts`

- [x] **Step 1: Add RED source contracts**

Require BookingModal to consume `accountLinked`, remove email-pattern ownership inference, and provide linked/unlinked copy in all locales.

- [x] **Step 2: Add RED browser contracts**

Require:

- anonymous email booking/waitlist response with `accountLinked: false` has no dashboard action;
- response with `accountLinked: true` has the dashboard action and account-linked guidance;
- offline-saved completion has no dashboard promise;
- existing non-email truthfulness and waitlist dashboard tests continue to pass.

- [x] **Step 3: Run RED verification**

Run: `npx vitest run src/lib/booking-conversion.test.ts`

Run: `npx playwright test e2e/booking.spec.ts e2e/offline-booking-recovery.spec.ts -c e2e/playwright.config.ts --workers=1 -g "account-linked|anonymous email|non-email waitlist|syncs an offline request" --reporter=line`

Expected: new server-linkage assertions fail before implementation.

- [x] **Step 4: Implement server-authoritative completion state**

Store `accountLinked` from booking/waitlist responses. Clear it for offline saves and new submissions. Show dashboard action and linked copy only when true. Remove `DASHBOARD_EMAIL_PATTERN` and contact-shape inference.

- [x] **Step 5: Localize the new contract**

Update all four locale files so linked copy states that the request is attached to the signed-in account, while unlinked copy promises only contact-channel updates. Make the direct success `nextStep` conditional as well.

- [x] **Step 6: Run UI GREEN checks**

Run the same focused Vitest and Playwright commands from Step 3.

Expected: all focused source and browser checks pass on desktop and mobile without overflow.

---

## Task 6: Make password-reset delivery truthful

**Files:**
- Modify: `functions/api/auth/forgot-password.ts`
- Modify: `functions/auth-password-reset.test.ts`
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/lib/audit-regressions.test.ts`
- Modify: `e2e/login.spec.ts`

- [x] **Step 1: Add the RED unavailable-delivery test**

When neither `RESEND_API_KEY` nor explicit demo mode is present, require status 503 and error code `email_delivery_unavailable`. Assert the users and reset-token tables are not queried or mutated so registered-email enumeration is impossible; rate-limit storage remains allowed.

- [x] **Step 2: Run RED verification**

Run: `npx vitest run functions/auth-password-reset.test.ts`

Expected: current false-success behavior returns 200 and fails the test.

- [x] **Step 3: Implement provider preflight**

Check Resend/demo capability before account lookup. Preserve configured Resend delivery and explicit demo behavior. Return the uniform 503 code otherwise.

- [x] **Step 4: Map the error in the login UI**

Add localized `auth.resetEmailUnavailable` copy and keep the user on the email step when the endpoint returns that code.

- [x] **Step 5: Run password-reset GREEN checks**

Run: `npx vitest run functions/auth-password-reset.test.ts src/lib/audit-regressions.test.ts`

Expected: provider, demo, anti-enumeration, and unavailable-delivery contracts all pass.

---

## Task 7: Visual comparison and complete local release gates

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-account-owned-customer-records.md`

- [x] **Step 1: Capture matching local states**

At `1440x1000` and `390x844`, inspect:

- anonymous email waitlist success without dashboard action;
- linked waitlist success with dashboard action;
- linked waitlist-only dashboard;
- reset-password unavailable error.

Require no overflow, clipped copy, overlapping controls, unexpected console errors, non-aborted request failures, or unexpected HTTP failures. The mocked reset-delivery state must produce its expected 503 response.

- [x] **Step 2: Run every local release gate**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Run: `npm audit --audit-level=moderate`

Run: `npx playwright test -c e2e/playwright.config.ts --workers=6 --reporter=line`

Run: `git diff --check`

Expected: all commands exit 0 and performance budgets pass.

- [x] **Step 3: Clean and review**

Restore tracked sitemap/test-result output, remove only this cycle's verified screenshot directory, and review the full diff from `bb3e657`. Critical or Important findings block release.

---

## Task 8: Apply D1 migration, commit, push, and verify production

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-account-owned-customer-records.md`

- [x] **Step 1: Apply migration 015 before the code push**

Run: `npx wrangler d1 migrations apply naihuangbao-photography --remote`

Verify no migrations remain and inspect all three `user_id` columns/indexes. Recheck aggregate customer row counts before applying; if nonzero, stop and reassess the no-backfill assumption.

- [ ] **Step 2: Stage exact planned files and commit**

Stage only the design/plan, migration/schema, listed handlers, focused tests, BookingModal/LoginPage, four locales, and E2E updates. Exclude `.agent/orchestrator-history`.

Commit: `fix: bind customer records to authenticated accounts`

- [ ] **Step 3: Push `main` and verify exact CI**

Push without force. Require GitHub Actions `headSha` equal to the new full HEAD and `conclusion: success`.

- [ ] **Step 4: Verify exact Cloudflare Production deployment**

Require `Branch: main`, `Source` equal to the new HEAD prefix, and HTTP 200 for `/` plus `/api/health` on the fixed deployment and `https://shoot.custard.top`.

- [ ] **Step 5: Run live security and product acceptance**

Against fixed and custom URLs, verify:

- anonymous success never shows a dashboard action;
- account-linked success does;
- dashboard booking/waitlist/workshop queries are user-ID scoped;
- password-reset unavailable state is truthful;
- custom-domain smoke suite passes;
- final screenshot/console/request checks pass.

- [ ] **Step 6: Final consistency audit**

Require local HEAD, `origin/main`, `git ls-remote`, CI SHA, and Cloudflare Source to agree. Worktree may contain only the protected `.agent/orchestrator-history` directories.
