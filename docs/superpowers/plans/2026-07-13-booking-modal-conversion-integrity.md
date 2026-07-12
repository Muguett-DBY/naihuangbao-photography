# Booking Modal Conversion Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the public booking form fixed and fully visible in the current viewport while removing a notification-permission prompt that has no delivery path.

**Architecture:** Load only the CSS sidecar that belongs to the `animal-island-ui` Modal component through the local theme CSS dependency graph, leaving the full component-library stylesheet and the main CSS budget unchanged. Remove the unused permission banner at its root-layout boundary, then protect both decisions with source contracts and desktop/mobile browser geometry assertions.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 4, Playwright 1.61, animal-island-ui 1.2.1.

## Global Constraints

- Work directly on `main`; do not create a branch or force-push.
- Do not restore `animal-island-ui/style` or raise the 200 KiB main CSS budget.
- Do not change booking fields, validation, capacity, payment, or API behavior.
- Preserve modal focus handling, Escape behavior, ARIA labels, scroll locking, and photography-theme overrides.
- Do not add a replacement notification prompt without a real subscription and delivery path.
- Preserve unrelated `.agent/orchestrator-history` files and do not stage `output/playwright` evidence.

---

### Task 1: Lock the source boundaries

**Files:**
- Create: `src/lib/booking-conversion.test.ts`

**Interfaces:**
- Consumes: raw source for `BookingModal`, `RootLayout`, `main.tsx`, and notification files.
- Produces: source contracts for the Modal CSS sidecar and removal of the dead permission surface.

- [x] **Step 1: Write the failing source contracts**

```ts
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("public booking conversion shell", () => {
  it("loads only the Modal structural CSS sidecar", () => {
    const bookingModal = read("src/components/BookingModal.tsx");
    const animalTheme = read("src/styles/animal-theme.css");
    const main = read("src/main.tsx");

    expect(animalTheme).toContain('@import "animal-island-ui/es/components/Modal/modal.module.css"');
    expect(bookingModal).not.toContain('animal-island-ui/es/components/Modal/modal.module.css');
    expect(bookingModal).toContain("booking-modal-close");
    expect(bookingModal).toContain("<X");
    expect(main).not.toContain('animal-island-ui/style');
  });

  it("does not advertise notifications without a delivery path", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    const baseCss = read("src/styles/base.css");
    const pagesCss = read("src/styles/pages.css");

    expect(layout).not.toContain("PushNotificationBanner");
    expect(baseCss).not.toContain("push-notification-banner");
    expect(pagesCss).not.toContain("push-notification-banner");
    expect(existsSync(resolve(root, "src/components/PushNotificationBanner.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "src/hooks/usePushNotification.ts"))).toBe(false);
  });
});
```

- [x] **Step 2: Run the source contracts to verify RED**

Run: `npx vitest run src/lib/booking-conversion.test.ts`

Expected: FAIL because `BookingModal` lacks the sidecar import and the notification prompt still exists.

---

### Task 2: Lock desktop and mobile booking geometry

**Files:**
- Modify: `e2e/booking.spec.ts`

**Interfaces:**
- Consumes: the public homepage booking CTA and rendered `animal-island-ui` dialog DOM.
- Produces: a browser regression requiring fixed mask positioning, bounded dialog geometry, stable scroll, and no dead permission prompt.

- [x] **Step 1: Add a failing geometry regression**

Add this test before the existing submission-flow test:

```ts
  test("keeps the public booking modal fixed inside desktop and mobile viewports", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const bookingButton = page.locator(".hero-cover-primary-btn");
      await expect(bookingButton).toBeVisible();

      const initialScrollY = await page.evaluate(() => window.scrollY);
      await bookingButton.evaluate((button: HTMLButtonElement) => button.click());
      await expect(page.locator("#booking-package")).toBeVisible();

      const dialog = page.getByRole("dialog").filter({ has: page.locator(".booking-modal-content") });
      const mask = dialog.locator("..");
      await expect(mask).toHaveCSS("position", "fixed");
      await expect(page.locator(".push-notification-banner")).toHaveCount(0);

      const [dialogBox, scrollY] = await Promise.all([
        dialog.boundingBox(),
        page.evaluate(() => window.scrollY),
      ]);
      expect(dialogBox).not.toBeNull();
      expect(scrollY).toBeLessThanOrEqual(initialScrollY + 2);
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);

      const closeButton = dialog.locator(".booking-modal-close");
      await expect(closeButton).toBeVisible();
      const closeButtonBox = await closeButton.boundingBox();
      expect(closeButtonBox).not.toBeNull();
      expect(closeButtonBox!.width).toBeGreaterThanOrEqual(40);
      expect(closeButtonBox!.height).toBeGreaterThanOrEqual(40);
      await closeButton.click();
      await expect(dialog).toBeHidden();
    }
  });
```

- [x] **Step 2: Build and run the geometry regression to verify RED**

Run: `npm run build`

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "keeps the public booking modal fixed" --reporter=line`

Expected: FAIL because the mask has `position: static`; the page scrolls to the footer and the notification banner exists.

---

### Task 3: Restore modal structure and remove the dead prompt

**Files:**
- Modify: `src/styles/animal-theme.css`
- Modify: `src/components/BookingModal.tsx`
- Modify: `src/styles/sections.css`
- Modify: `src/layouts/RootLayout.tsx`
- Modify: `src/styles/base.css`
- Modify: `src/styles/pages.css`
- Modify: `src/lib/audit-regressions.test.ts`
- Delete: `src/components/PushNotificationBanner.tsx`
- Delete: `src/hooks/usePushNotification.ts`

**Interfaces:**
- Consumes: `animal-island-ui/es/components/Modal/modal.module.css`, whose generated selectors match the installed Modal component.
- Produces: a fixed viewport mask and dialog; a public shell with no unsupported notification request.

- [x] **Step 1: Load only the Modal CSS sidecar through the theme entrypoint**

Add before the theme overrides in `src/styles/animal-theme.css`:

```css
@import "animal-island-ui/es/components/Modal/modal.module.css";
```

- [x] **Step 2: Remove the unsupported notification surface**

In `src/layouts/RootLayout.tsx`, remove both:

```ts
import { PushNotificationBanner } from "../components/PushNotificationBanner";
```

```tsx
{!isEditor && <PushNotificationBanner />}
```

Delete `src/components/PushNotificationBanner.tsx` and `src/hooks/usePushNotification.ts`.

- [x] **Step 3: Keep a visible close action above the scrolling form**

Replace the library title prop with a visible `booking-modal-heading` inside `booking-modal-content`. Use an `h2` with `id={titleId}` plus a native button containing the Lucide `X` icon, `aria-label={t("bookingModal.cancel")}`, and `onClick={onClose}`. Style the heading as sticky and the button as a 44-by-44-pixel circular control in `src/styles/sections.css`, preserving at least 40 pixels throughout the library's zoom-in animation.

- [x] **Step 4: Remove obsolete CSS and source-audit input**

Delete the complete `/* ── Push Notification Banner ── */` block through its `slideUp` keyframes from `src/styles/base.css`.

Change the print selector in `src/styles/pages.css` from:

```css
.pwa-install-banner, .pwa-update-banner, .push-notification-banner,
```

to:

```css
.pwa-install-banner, .pwa-update-banner,
```

Remove this entry from `resilientClientStorageSources` in `src/lib/audit-regressions.test.ts`:

```ts
"src/components/PushNotificationBanner.tsx",
```

- [x] **Step 5: Run focused GREEN checks**

Run: `npx vitest run src/lib/booking-conversion.test.ts src/lib/a11y-modal.test.ts src/lib/audit-regressions.test.ts src/lib/performance.test.ts`

Run: `npm run build`

Run: `npx playwright test e2e/booking.spec.ts -c e2e/playwright.config.ts --workers=1 -g "keeps the public booking modal fixed" --reporter=line`

Expected: all focused checks PASS; the main CSS remains under 200 KiB.

---

### Task 4: Visual comparison and complete local gates

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-booking-modal-conversion-integrity.md`

**Interfaces:**
- Consumes: the focused GREEN implementation and pre-fix screenshots under `output/playwright/booking-flow-audit-2026-07-13`.
- Produces: inspected desktop/mobile post-fix screenshots and full release evidence.

- [x] **Step 1: Capture matching local post-fix states**

Use Chrome at `1440x1000` and `390x844` against the local preview. Capture the homepage and opened booking dialog to:

```text
output/playwright/booking-flow-audit-2026-07-13/05-home-desktop-fixed.png
output/playwright/booking-flow-audit-2026-07-13/06-booking-modal-desktop-fixed.png
output/playwright/booking-flow-audit-2026-07-13/07-home-mobile-fixed.png
output/playwright/booking-flow-audit-2026-07-13/08-booking-modal-mobile-fixed.png
```

Inspect every saved screenshot. Expected: the prompt is absent; the dialog is centered, bounded by the viewport, scrollable internally, and not clipped by bottom navigation or chat controls.

- [x] **Step 2: Run every local release gate**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Run: `npm audit --audit-level=moderate`

Run: `npx playwright test -c e2e/playwright.config.ts --workers=6 --reporter=line`

Run: `git diff --check`

Expected: every command exits 0; the geometry regression is included in the full browser count.

- [x] **Step 3: Restore generated artifacts and remove audit screenshots**

Restore tracked sitemap and test-result noise generated by the gates. Remove only the verified directory `output/playwright/booking-flow-audit-2026-07-13` after confirming its resolved path is inside the repository's `output/playwright` directory.

Run: `git status --short --untracked-files=all`

Expected: only planned files plus the known unrelated `.agent/orchestrator-history` files remain.

---

### Task 5: Review, release, and verify production

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-booking-modal-conversion-integrity.md`

**Interfaces:**
- Consumes: reviewed, locally verified implementation files.
- Produces: a scoped `main` commit, successful CI, matching Cloudflare Production deployment, and live geometry proof.

- [x] **Step 1: Review the complete worktree diff**

Review from design base `89d585c` through current worktree. Treat Critical and Important findings as release blockers and rerun affected focused checks after fixes.

- [ ] **Step 2: Stage only planned files**

Run:

```text
git add -- docs/superpowers/specs/2026-07-13-booking-modal-conversion-integrity-design.md docs/superpowers/plans/2026-07-13-booking-modal-conversion-integrity.md e2e/booking.spec.ts src/components/BookingModal.tsx src/layouts/RootLayout.tsx src/styles/animal-theme.css src/styles/base.css src/styles/pages.css src/styles/sections.css src/lib/audit-regressions.test.ts src/lib/booking-conversion.test.ts
git add -u -- src/components/PushNotificationBanner.tsx src/hooks/usePushNotification.ts
```

- [ ] **Step 3: Commit and push**

Run: `git commit -m "fix: restore public booking modal integrity"`

Run: `git push origin main`

- [ ] **Step 4: Verify GitHub Actions and Cloudflare**

Watch the GitHub Actions run whose `headSha` equals the new `main` HEAD and require `conclusion: success`.

Poll `npx wrangler pages deployment list --project-name naihuangbao-photography --json` until the newest Production deployment has `Branch: main` and `Source` equal to the new HEAD prefix.

- [ ] **Step 5: Verify fixed and custom domains**

Require HTTP 200 from `/` and `/api/health` on both the fixed deployment URL and `https://shoot.custard.top`.

Run the non-mutating booking geometry regression against both the fixed deployment URL and the custom domain, then run the complete `e2e/smoke.spec.ts` suite against the custom domain. Capture and inspect one final live desktop booking-dialog screenshot.

Expected: fixed mask positioning, stable scroll, bounded dialog, no permission prompt, successful public smoke suite, no console errors, and no failed requests.
