# Waitlist Dashboard Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show active email-linked waitlist requests in My Bookings and stop sending non-email contacts to a dashboard that cannot identify their request.

**Architecture:** Extend the existing authenticated `/api/user/bookings` response with a separate additive `waitlist` array, then render those rows in a dedicated dashboard section that never enters booking payment or mutation logic. Gate the completion-page dashboard action with a local email-contact check and provide localized contact-channel guidance when dashboard linking is unavailable.

**Tech Stack:** React 19, TypeScript 7, Cloudflare Pages Functions/D1, react-i18next, Vitest 4, Playwright 1.61.

## Global Constraints

- Work directly on `main`; do not create a branch, force-push, or use `git add .`.
- Do not change the database schema, waitlist token lifecycle, cancellation behavior, notification delivery, or booking-management mutations.
- Preserve the existing `bookings` response shape and all booking payment, cancellation, and reschedule behavior.
- Return only dashboard-safe waitlist fields; never expose contact values or unsubscribe tokens.
- Localize every new visible string in zh-CN, en, ja, and ko.
- Preserve unrelated `.agent/orchestrator-history` files and do not stage audit screenshots.

---

### Task 1: Add the authenticated waitlist API contract

**Files:**
- Modify: `functions/api.test.ts`
- Modify: `functions/api/user/bookings.ts`

**Interfaces:**
- Consumes: authenticated `user.userId`, `users.email`, `booking_requests`, and `booking_waitlist`.
- Produces: `GET /api/user/bookings -> { bookings: BookingRow[]; waitlist: WaitlistRow[] }` with active same-email waitlist rows only.

- [x] **Step 1: Write the failing API regression**

Add a test beside `projects the latest booking deposit state into the customer booking list`. The database double must return the authenticated email from `first()`, booking rows only for SQL containing `from booking_requests`, and waitlist rows only for SQL containing `from booking_waitlist`.

```ts
it("returns active same-email waitlist entries beside customer bookings", async () => {
  const secret = "test-auth-secret-with-32-characters";
  const session = await createUserSession("user-12345678", secret);
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const waitlistRow = {
    id: "wl_customer_123",
    package_name: "Portrait Session",
    preferred_date: "2099-08-21",
    name: "Guest",
    active: 1,
    notified: 0,
    created_at: "2026-07-13T00:00:00.000Z",
  };
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn((...values: unknown[]) => {
          statements.push({ sql, values });
          return statement;
        }),
        first: vi.fn(async () => (
          sql.includes("from users") ? { email: "Guest@Example.com" } : null
        )),
        all: vi.fn(async () => ({
          results: sql.includes("from booking_waitlist") ? [waitlistRow] : [],
        })),
      };
      return statement;
    }),
  };

  const response = await getUserBookings({
    request: jsonRequest("https://shoot.custard.top/api/user/bookings", {
      headers: { cookie: `nhb_user_session=${session}` },
    }),
    env: { DB: db, AUTH_SECRET: secret },
  } as never);
  const body = (await response.json()) as {
    bookings?: unknown[];
    waitlist?: Array<{ id?: string; active?: boolean; notified?: boolean }>;
  };

  expect(response.status).toBe(200);
  expect(body.bookings).toEqual([]);
  expect(body.waitlist).toEqual([expect.objectContaining({
    id: "wl_customer_123",
    active: true,
    notified: false,
  })]);
  const waitlistQuery = statements.find((entry) => entry.sql.includes("from booking_waitlist"));
  expect(waitlistQuery?.sql).toContain("active = 1");
  expect(waitlistQuery?.sql).toContain("lower(contact) = lower(?)");
  expect(waitlistQuery?.values).toEqual(["Guest@Example.com"]);
  expect(waitlistQuery?.sql).not.toContain("token");
});
```

- [x] **Step 2: Run the API regression to verify RED**

Run: `npx vitest run functions/api.test.ts -t "returns active same-email waitlist entries"`

Expected: FAIL because the response has no `waitlist` array and no waitlist query.

- [x] **Step 3: Implement the additive API response**

In `functions/api/user/bookings.ts`, define a private row type:

```ts
type WaitlistRow = {
  id: string;
  package_name: string;
  preferred_date: string;
  name: string;
  active: number;
  notified: number;
  created_at: string;
};
```

Resolve the account email first. If no matching user exists, return `{ bookings: [], waitlist: [] }`. Query bookings and active waitlist entries with `Promise.all`, using the resolved email as the only waitlist bind:

```ts
const account = await context.env.DB.prepare(
  "select email from users where id = ?",
).bind(user.userId).first<{ email: string }>();

if (!account?.email) return jsonResponse({ bookings: [], waitlist: [] });

const [bookingResult, waitlistResult] = await Promise.all([
  context.env.DB.prepare(
    `select b.id, b.package_name, b.preferred_date, b.preferred_time, b.name, b.contact, b.notes,
            case when b.status = 'canceled' then 'cancelled' else b.status end as status,
            b.created_at,
            pi.id as payment_intent_id,
            coalesce(pi.status, 'not_started') as payment_status,
            pi.provider as payment_provider,
            pi.amount_cents as payment_amount_cents,
            pi.currency as payment_currency
     from booking_requests b
     left join payment_intents pi
       on pi.id = (
         select latest.id
         from payment_intents latest
         where latest.purpose = 'booking_deposit'
           and latest.reference_id = b.id
         order by latest.created_at desc
         limit 1
       )
     where lower(b.contact) = lower(?)
     order by b.created_at desc`,
  ).bind(account.email).all<BookingRow>(),
  context.env.DB.prepare(
    `select id, package_name, preferred_date, name, active, notified, created_at
     from booking_waitlist
     where active = 1 and lower(contact) = lower(?)
     order by created_at desc`,
  ).bind(account.email).all<WaitlistRow>(),
]);
```

Return the existing normalized bookings plus waitlist rows with numeric flags converted to booleans:

```ts
return jsonResponse({
  bookings,
  waitlist: waitlistResult.results.map((entry) => ({
    ...entry,
    active: entry.active === 1,
    notified: entry.notified === 1,
  })),
});
```

Update the existing booking projection test double so its `all()` result is selected by SQL instead of returning a booking row for every query.

- [x] **Step 4: Run the API tests to verify GREEN**

Run: `npx vitest run functions/api.test.ts`

Expected: all API tests PASS, including the existing payment projection test and the new waitlist contract.

---

### Task 2: Render waitlist continuity in My Bookings

**Files:**
- Modify: `src/types/dashboard.ts`
- Modify: `src/components/dashboard/BookingsTab.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `e2e/booking.spec.ts`

**Interfaces:**
- Consumes: `{ bookings: Booking[]; waitlist: WaitlistEntry[] }` from `/api/user/bookings`.
- Produces: a dedicated `.dashboard-waitlist-section` and `.dashboard-waitlist-card` that coexist with booking cards without using booking mutations.

- [x] **Step 1: Write the failing dashboard browser regression**

Add a test before the existing deposit-state dashboard test:

```ts
test("shows an active waitlist entry instead of an empty bookings dashboard", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: { id: "user-1", email: "waitlist@example.com", displayName: "Waitlist Guest" },
    }),
  }));
  await page.route("**/api/user/stats", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ bookings: 0, photos: 0, purchases: 0, courses: 0, workshops: 0 }),
  }));
  await page.route("**/api/user/bookings**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      bookings: [],
      waitlist: [{
        id: "wl_customer_123",
        package_name: "Portrait Session",
        preferred_date: "2099-08-21",
        name: "Waitlist Guest",
        active: true,
        notified: false,
        created_at: "2026-07-13T00:00:00.000Z",
      }],
    }),
  }));

  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "My Bookings", exact: true }).click();

  const waitlistCard = page.locator(".dashboard-waitlist-card");
  await expect(waitlistCard).toBeVisible();
  await expect(waitlistCard).toContainText("Portrait Session");
  await expect(waitlistCard).toContainText("2099-08-21");
  await expect(page.getByText("Waiting for availability", { exact: true })).toBeVisible();
  await expect(page.getByText("No sessions booked yet", { exact: true })).toHaveCount(0);
  await expect(page.locator(".dashboard-booking-overview")).toHaveCount(0);
  await expect(waitlistCard.getByRole("button")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await waitlistCard.evaluate((card) => ({
    page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    card: card.scrollWidth > card.clientWidth,
  }));
  expect(overflow).toEqual({ page: false, card: false });
});
```

- [x] **Step 2: Run the dashboard regression to verify RED**

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "shows an active waitlist entry" --reporter=line`

Expected: FAIL because `BookingsTab` ignores `waitlist` and renders the empty state.

- [x] **Step 3: Add the dashboard waitlist type and UI**

Add to `src/types/dashboard.ts`:

```ts
export type WaitlistEntry = {
  id: string;
  package_name: string;
  preferred_date: string;
  name: string;
  active: boolean;
  notified: boolean;
  created_at: string;
};
```

Update `BookingsTab` to fetch both arrays, set `empty={bookings.length === 0 && waitlist.length === 0}`, render the booking summary only when bookings exist, and render a semantic waitlist section before `.dashboard-list`:

```tsx
<section className="dashboard-waitlist-section" aria-labelledby="dashboard-waitlist-title">
  <div className="dashboard-waitlist-heading">
    <div>
      <span>{t("dashboard.waitlist.eyebrow")}</span>
      <h3 id="dashboard-waitlist-title">{t("dashboard.waitlist.title")}</h3>
    </div>
    <strong>{waitlist.length}</strong>
  </div>
  <div className="dashboard-waitlist-list">
    {waitlist.map((entry) => (
      <article key={entry.id} className="dashboard-card dashboard-waitlist-card">
        <div className="dashboard-card-header">
          <h4>{entry.package_name}</h4>
          <span className={`dashboard-waitlist-status${entry.notified ? " is-notified" : ""}`}>
            {entry.notified ? t("dashboard.waitlist.notified") : t("dashboard.waitlist.waiting")}
          </span>
        </div>
        <div className="dashboard-booking-schedule">
          <div className="dashboard-booking-schedule-item">
            <span className="dashboard-booking-label">{t("dashboard.waitlist.preferredDate")}</span>
            <strong>{entry.preferred_date}</strong>
          </div>
          <div className="dashboard-booking-schedule-item">
            <span className="dashboard-booking-label">{t("dashboard.waitlist.requestedOn")}</span>
            <strong>{new Date(entry.created_at).toLocaleDateString()}</strong>
          </div>
        </div>
        <p className="dashboard-status-insight">
          {entry.notified ? t("dashboard.waitlist.notifiedDetail") : t("dashboard.waitlist.waitingDetail")}
        </p>
      </article>
    ))}
  </div>
</section>
```

Use existing schedule classes for preferred/requested dates. Add compact waitlist section, count, status, and mobile styles in `src/styles/pages.css`; do not create nested cards or action controls.

- [x] **Step 4: Add all four locale entries**

Under `dashboard`, add the same keys in zh-CN, en, ja, and ko:

```json
"waitlist": {
  "eyebrow": "Waitlist status",
  "title": "Waiting for a date",
  "waiting": "Waiting for availability",
  "notified": "Availability update",
  "preferredDate": "Preferred date",
  "requestedOn": "Joined on",
  "waitingDetail": "This date is full. I will contact you through the details you provided if space opens.",
  "notifiedDetail": "A space may be available. Check your contact channel and message me if you need help."
}
```

Translate naturally in the other three locale files; keep keys identical so the existing i18n consistency tests enforce coverage.

- [x] **Step 5: Run focused dashboard GREEN checks**

Run: `npx vitest run src/lib/audit-regressions.test.ts`

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "shows an active waitlist entry" --reporter=line`

Expected: both commands PASS; the mobile overflow result is false for page and card.

---

### Task 3: Gate completion guidance by contact type

**Files:**
- Modify: `src/components/BookingModal.tsx`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `e2e/booking.spec.ts`
- Modify: `src/lib/booking-conversion.test.ts`

**Interfaces:**
- Consumes: the current booking/waitlist `contact` state.
- Produces: dashboard guidance only for syntactically valid email contacts; non-email completion retains Xiaohongshu and Continue browsing.

- [x] **Step 1: Write failing source and browser regressions**

Extend `src/lib/booking-conversion.test.ts` so the booking source must contain an email-contact helper, a `showDashboard` option, and the new contact-only translation key:

```ts
expect(bookingModal).toContain("isDashboardCompatibleContact");
expect(bookingModal).toContain("showDashboard");
expect(bookingModal).toContain("successBridgeContactDetail");
```

Add a browser test that repeats the stubbed full-date waitlist flow with `#booking-contact` set to `xiaohongshu:waitlist-guest`, then asserts:

```ts
await expect(page.getByRole("link", { name: "View My Bookings", exact: true })).toHaveCount(0);
await expect(page.getByText("Updates will go to the contact details you provided.", { exact: false })).toBeVisible();
await expect(page.getByRole("link", { name: "Message on Xiaohongshu", exact: true })).toBeVisible();
await expect(page.getByRole("button", { name: "Continue browsing", exact: true })).toBeVisible();
```

- [x] **Step 2: Run both regressions to verify RED**

Run: `npx vitest run src/lib/booking-conversion.test.ts`

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "keeps non-email waitlist follow-up truthful" --reporter=line`

Expected: source test fails on missing contact gating; browser test fails because View My Bookings is still visible.

- [x] **Step 3: Implement contact-aware bridge rendering**

Add a local anchored email pattern and helper near the component types:

```ts
const DASHBOARD_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isDashboardCompatibleContact = (value: string) => DASHBOARD_EMAIL_PATTERN.test(value.trim());
```

Change `renderSuccessBridge` to accept `{ showDashboard: boolean }`. Render the dashboard `Link` only when true. At each success callsite, select the detail key based on `isDashboardCompatibleContact(contact)`:

```tsx
const showDashboard = isDashboardCompatibleContact(contact);
renderSuccessBridge(
  t(showDashboard
    ? "bookingModal.successBridgeWaitlistDetail"
    : "bookingModal.successBridgeContactDetail"),
  { showDashboard },
)
```

Use the same branch for direct booking, duplicate waitlist, and offline completion. Keep the two remaining actions and existing responsive grid behavior.

- [x] **Step 4: Add contact-specific copy in all locales**

Add `bookingModal.successBridgeContactDetail` and revise `successBridgeWaitlistDetail` / `successBridgeDashboardDetail` so email guidance explicitly says to use the same email account.

English contract:

```json
"successBridgeContactDetail": "Updates will go to the contact details you provided. Message me if anything changes.",
"successBridgeWaitlistDetail": "Sign in or register with this same email to see your waitlist status here.",
"successBridgeDashboardDetail": "Sign in or register with this same email to see booking, date, and deposit updates."
```

- [x] **Step 5: Run focused completion GREEN checks**

Run: `npx vitest run src/lib/booking-conversion.test.ts src/lib/a11y-modal.test.ts src/lib/audit-regressions.test.ts`

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "waitlist|keeps non-email waitlist follow-up truthful" --reporter=line`

Expected: all focused source and browser checks PASS.

---

### Task 4: Visual comparison and complete release

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-waitlist-dashboard-continuity.md`

**Interfaces:**
- Consumes: the focused GREEN implementation and accepted pre-fix screenshots in `output/playwright/booking-waitlist-dashboard-audit-2026-07-13`.
- Produces: inspected post-fix screenshots, a scoped implementation commit, successful CI, exact-head Cloudflare Production deployment, and live acceptance.

- [x] **Step 1: Capture matching local post-fix evidence**

Capture waitlist success and waitlist-only My Bookings at `1440x1000` and `390x844`. Compare them with accepted pre-fix screenshots 02, 03, and 04. Require:

- email completion still exposes the dashboard action with same-email guidance;
- My Bookings shows the waitlist card instead of the empty state;
- non-email completion has no dashboard action;
- no horizontal overflow, clipped text, overlapping actions, console errors, or failed requests.

- [x] **Step 2: Run every local release gate**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Run: `npm audit --audit-level=moderate`

Run: `npx playwright test -c e2e/playwright.config.ts --workers=6 --reporter=line`

Run: `git diff --check`

Expected: every command exits 0; the main CSS remains under 200 KiB.

- [x] **Step 3: Clean generated evidence and review the full diff**

Restore tracked sitemap/test-result noise. Remove only the verified audit directory under `output/playwright`. Review from design base `a0d1066` through the worktree and treat Critical or Important findings as blockers.

- [ ] **Step 4: Stage only planned files, commit, and push**

```text
git add -- docs/superpowers/plans/2026-07-13-waitlist-dashboard-continuity.md functions/api.test.ts functions/api/user/bookings.ts src/types/dashboard.ts src/components/dashboard/BookingsTab.tsx src/components/BookingModal.tsx src/styles/pages.css src/i18n/locales/zh-CN.json src/i18n/locales/en.json src/i18n/locales/ja.json src/i18n/locales/ko.json e2e/booking.spec.ts src/lib/booking-conversion.test.ts
git commit -m "feat: connect waitlist status to dashboard"
git push origin main
```

- [ ] **Step 5: Verify CI, Cloudflare, and live behavior**

Require the GitHub Actions run whose `headSha` equals the new HEAD to complete with `conclusion: success`.

Require the newest Cloudflare Production deployment to have `Branch: main` and `Source` equal to the new HEAD prefix. If the Git trigger does not create a deployment after condition-based polling, use the already verified `dist` with `wrangler pages deploy` and exact commit metadata.

Require HTTP 200 from `/` and `/api/health` on the fixed deployment URL and `https://shoot.custard.top`. Run the waitlist dashboard and non-email completion regressions against both URLs, then run `e2e/smoke.spec.ts` against the custom domain. Capture and inspect one final live waitlist-only dashboard screenshot.
