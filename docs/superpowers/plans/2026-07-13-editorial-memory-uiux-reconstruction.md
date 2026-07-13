# Editorial Memory UI/UX Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct the complete portrait-booking product in the approved Nanjing Portrait Field Notes visual system without changing business contracts.

**Architecture:** Keep the React Router, providers, API types, and route boundaries intact. Establish semantic CSS tokens in `base.css`, then update each existing route-scoped stylesheet and the small set of shared layout components so the new system wins through normal cascade order rather than a global override file. Reuse the six authorized AVIF/WebP contact-sheet assets as the art direction across public routes.

**Tech Stack:** React 19, React Router 7, TypeScript 7, Vite 8, CSS, Framer Motion, GSAP, Lucide React, Vitest, Playwright.

## Global Constraints

- Work directly in the current `main` branch; do not create or switch branches.
- Preserve all existing business behavior, API schemas, providers, routes, data ownership, booking semantics, and test coverage.
- Do not stage `.agent/orchestrator-history/campaign-015/` or `.agent/orchestrator-history/campaign-016/`.
- Use only authorized local gallery imagery; add no external image or font request.
- Do not add a runtime dependency, gradient orb, glow blob, glass panel, nested card, fake control, or emoji icon.
- Cards use at most 8px radius; controls use Lucide icons and 44px touch targets where applicable.
- Do not scale fonts with viewport width and keep letter spacing at `0`.
- Support `prefers-reduced-motion`, visible keyboard focus, semantic landmarks, labels, accessible names, and focus restoration.
- Validate at 375, 430, 768, 1024, 1440, and 1920 pixels, with no overlap or horizontal overflow.
- Run lint, all Vitest tests, `build:full`, Playwright E2E, browser console/network checks, GitHub Actions, and live deployment checks before completion.

---

### Task 1: Editorial foundation and application shell

**Files:**
- Modify: `src/styles/base.css`
- Modify: `src/styles/site.css`
- Modify: `src/styles/hero.css` (masthead/navigation selectors only)
- Modify: `src/styles/sections.css` (footer/mobile-bottom-navigation selectors only)
- Modify: `src/styles/chat.css`
- Modify: `src/styles/animal-theme.css`
- Modify: `src/layouts/RootLayout.tsx`
- Modify: `src/components/shared/Header.tsx`
- Modify: `src/components/shared/Footer.tsx`
- Modify: `src/components/shared/MobileBottomNav.tsx`
- Modify: `src/components/ThemeToggle.tsx`
- Modify: `src/components/MoodToggle.tsx`
- Delete: `src/components/LoadingScreen.tsx`
- Create: `src/components/shared/RouteLoadingState.tsx`
- Create: `src/lib/editorial-system.test.ts`

**Interfaces:**
- Consumes: existing `useAuth`, `useSiteContent`, `PrefetchLink`, i18n keys, and RootLayout providers.
- Produces: semantic CSS variables, publication masthead, accessible utility menu, responsive drawer, footer, bottom navigation, and `<RouteLoadingState />` for later tasks.

- [ ] **Step 1: Write the failing source contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("editorial design system", () => {
  it("defines the Field Notes semantic tokens", () => {
    const css = read("src/styles/base.css");
    for (const token of ["--ink", "--newsprint", "--moss", "--coral", "--font-note", "--radius-card"]) {
      expect(css).toContain(token);
    }
    expect(css).not.toContain("hero-glow-orb");
  });

  it("does not block first paint with the old loading cover", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    expect(layout).not.toContain("LoadingScreen");
    expect(layout).toContain("RouteLoadingState");
  });
});
```

- [ ] **Step 2: Run the contract test and confirm it fails**

Run: `npx vitest run src/lib/editorial-system.test.ts`

Expected: FAIL because semantic tokens and `RouteLoadingState` do not exist.

- [ ] **Step 3: Implement the semantic token foundation**

Replace the warm/cute root palette with exact tokens and compatibility aliases:

```css
:root {
  --ink: #17201b;
  --newsprint: #f4f0e7;
  --paper: #fffdf8;
  --moss: #355c4b;
  --moss-dark: #234336;
  --coral: #d95f4b;
  --coral-dark: #ad3f31;
  --sky-note: #b9d7dc;
  --sun-note: #e6c867;
  --text-muted: #667069;
  --hairline: rgba(23, 32, 27, 0.18);
  --font-display: Georgia, "Songti SC", "STSong", "SimSun", serif;
  --font-body: "PingFang SC", "Microsoft YaHei UI", system-ui, sans-serif;
  --font-note: "Naihuangbao WenKai", "Kaiti SC", "KaiTi", serif;
  --radius-card: 8px;
  --radius-control: 4px;
  --focus-ring: 0 0 0 2px var(--paper), 0 0 0 5px var(--coral);
  --caramel-text: var(--ink);
  --caramel-deep: var(--moss-dark);
  --caramel-muted: var(--text-muted);
  --peach-accent: var(--coral);
  --paper-white: var(--paper);
  --custard-bg: var(--newsprint);
}
```

Remove decorative body symbols, glow backgrounds, continuous floating animation,
and universal `transition: all`. Add stable page widths, focus rings, typographic
roles, tabular numbers, reduced-motion rules, and dark theme aliases.

- [ ] **Step 4: Rebuild shell components and styles**

Keep current links and authentication behavior. Move language, theme, and mood
controls into one utility menu; expose account and booking as the right-side
actions; place all utilities and account actions in the mobile drawer. Add focus
management to both menus, route-current markers, publication issue metadata, and
44px control targets. Replace the blocking loading cover with:

```tsx
export function RouteLoadingState() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-index">NHB / LOADING</span>
      <span className="route-loading-rule" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
```

Use it as the `<Suspense>` fallback in `RootLayout`. Rebuild footer, mobile bottom
rail, chat launcher, toast, PWA, and offline states in the same token system.

- [ ] **Step 5: Run the task tests**

Run: `npx vitest run src/lib/editorial-system.test.ts src/lib/architecture-contracts.test.ts src/lib/a11y-modal.test.ts src/lib/public-chat.test.ts src/lib/pwa-install.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the shell task**

```bash
git add docs/superpowers/specs/2026-07-13-editorial-memory-uiux-reconstruction-design.md docs/superpowers/plans/2026-07-13-editorial-memory-uiux-reconstruction.md src/styles/base.css src/styles/site.css src/styles/chat.css src/styles/animal-theme.css src/layouts/RootLayout.tsx src/components/shared/Header.tsx src/components/shared/Footer.tsx src/components/shared/MobileBottomNav.tsx src/components/shared/RouteLoadingState.tsx src/components/LoadingScreen.tsx src/lib/editorial-system.test.ts
git commit -m "feat: establish editorial portrait design system"
```

### Task 2: Home and gallery storytelling

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/GalleryPage.tsx`
- Modify: `src/pages/PhotoDetailPage.tsx`
- Modify: `src/components/Gallery.tsx`
- Modify: `src/components/FilmStripStory.tsx`
- Modify: `src/components/PhotoOfTheDay.tsx`
- Modify: `src/components/RecentlyViewedStrip.tsx`
- Modify: `src/components/StyleQuiz.tsx`
- Modify: `src/components/WhyChooseUs.tsx`
- Modify: `src/components/Reviews.tsx`
- Modify: `src/styles/hero.css`
- Modify: `src/styles/gallery.css`
- Modify: `src/styles/filmstrip-story.css`
- Modify: `src/styles/pages.css` (home and style-quiz selectors only)
- Modify: `src/styles/sections.css` (home story/review selectors only)
- Test: `src/lib/gallery-uiux.test.ts`
- Test: `src/lib/gallery-card-hover.test.ts`

**Interfaces:**
- Consumes: public `PhotoItem` data, booking modal, saved searches, favorites, quick view, and image fallbacks.
- Produces: full-bleed home hero, contact-sheet gallery rhythm, accessible filter toolbar, and photo-detail composition.

- [ ] **Step 1: Extend gallery source tests for the new composition**

Assert that the home hero contains `hero-contact-sheet`, issue metadata, one H1,
two real task actions, and no glow-orb elements. Assert gallery controls expose a
result count and selected-state semantics.

- [ ] **Step 2: Run targeted tests and confirm the new assertions fail**

Run: `npx vitest run src/lib/gallery-uiux.test.ts src/lib/gallery-card-hover.test.ts`

Expected: FAIL on the new class and semantics assertions.

- [ ] **Step 3: Recompose the home hero and story bands**

Use `gallery-jiangnan-01` as the first responsive picture and `gallery-urban-01`
as a secondary contact sheet. Render brand name as H1, issue/location metadata,
one-line positioning copy, booking CTA, and gallery CTA directly over the hero.
Remove glow orbs, float elements, SVG decoration, and scroll-linked drifting
photos. Convert service links, reviews, quiz, and final CTA into alternating
unframed paper/ink bands with asymmetric editorial grids. Replace the style quiz's
Emoji option markers with semantically mapped Lucide icons while preserving all
answers, package recommendation behavior, sharing, restart, and navigation.

- [ ] **Step 4: Rebuild gallery and detail styles**

Give filters 44px targets, visible selected/focus state, and result count. Use
stable 3:4, 4:5, and 1:1 grid tracks without hover-induced layout changes. Keep
favorite, quick view, compare, keyboard shortcuts, and lightbox behavior intact.
Use a full image stage and adjacent metadata/actions on detail, then a contact
sheet of related items.

- [ ] **Step 5: Run gallery tests and browser smoke**

Run: `npx vitest run src/lib/gallery-uiux.test.ts src/lib/gallery-card-hover.test.ts src/lib/favorites.test.ts src/lib/quick-view.test.ts src/lib/keyboard-shortcut.test.ts`

Run: `npx playwright test -c e2e/playwright.config.ts e2e/gallery.spec.ts e2e/photo-detail.spec.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the storytelling task**

```bash
git add src/pages/HomePage.tsx src/pages/GalleryPage.tsx src/pages/PhotoDetailPage.tsx src/components/Gallery.tsx src/components/FilmStripStory.tsx src/components/PhotoOfTheDay.tsx src/components/RecentlyViewedStrip.tsx src/components/StyleQuiz.tsx src/components/WhyChooseUs.tsx src/components/Reviews.tsx src/styles/hero.css src/styles/gallery.css src/styles/filmstrip-story.css src/styles/pages.css src/styles/sections.css src/lib/gallery-uiux.test.ts src/lib/gallery-card-hover.test.ts
git commit -m "feat: recompose portrait stories and gallery"
```

### Task 3: Public catalogue and detail routes

**Files:**
- Modify: `src/components/shared/PageHero.tsx`
- Modify: `src/components/shared/DataState.tsx`
- Modify: `src/components/shared/DetailLoading.tsx`
- Modify: `src/components/shared/DetailNotFound.tsx`
- Modify: `src/pages/CoursesPage.tsx`
- Modify: `src/pages/CourseDetailPage.tsx`
- Modify: `src/pages/ProductsPage.tsx`
- Modify: `src/pages/PresetDetailPage.tsx`
- Modify: `src/pages/WorkshopsPage.tsx`
- Modify: `src/pages/WorkshopDetailPage.tsx`
- Modify: `src/pages/ShopPage.tsx`
- Modify: `src/pages/ShopDetailPage.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/styles/sections.css`
- Create: `src/lib/editorial-routes.test.ts`

**Interfaces:**
- Consumes: existing route fetch hooks, payment/registration callbacks, related items, and page SEO.
- Produces: image-backed `PageHero`, shared editorial state layout, catalogue grids, and coherent detail purchasing flows.

- [ ] **Step 1: Write route composition contracts**

Test that `PageHero` accepts `image`, `imageAlt`, and `issue` props; that
`DataState` renders a recovery action when supplied; and that all four index routes
provide a local gallery image and issue value.

- [ ] **Step 2: Run the new contract test and confirm failure**

Run: `npx vitest run src/lib/editorial-routes.test.ts`

Expected: FAIL because the new PageHero contract is absent.

- [ ] **Step 3: Implement the shared page hero and state primitives**

Add optional media props without breaking existing call sites. Render a `<picture>`
with AVIF/WebP sources, a numbered issue label, title, subtitle, and optional back
link. Give `DataState`, detail loading, and not-found views consistent marker,
title, description, retry/back action, and live-region semantics.

- [ ] **Step 4: Apply route-specific art direction**

Assign one of the six authorized contact sheets to each index. Keep API behavior,
filtering, purchase, download, enrollment, workshop registration, inventory, and
related-item logic unchanged. Reorganize markup only where needed for clear media,
metadata, price/status, and action hierarchy. Style catalogue and detail surfaces
through stable grids and unframed sections in `pages.css` and `sections.css`.

- [ ] **Step 5: Run route and regression tests**

Run: `npx vitest run src/lib/editorial-routes.test.ts src/lib/audit-regressions.test.ts src/lib/performance.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the public route task**

```bash
git add src/components/shared/PageHero.tsx src/components/shared/DataState.tsx src/components/shared/DetailLoading.tsx src/components/shared/DetailNotFound.tsx src/pages/CoursesPage.tsx src/pages/CourseDetailPage.tsx src/pages/ProductsPage.tsx src/pages/PresetDetailPage.tsx src/pages/WorkshopsPage.tsx src/pages/WorkshopDetailPage.tsx src/pages/ShopPage.tsx src/pages/ShopDetailPage.tsx src/styles/pages.css src/styles/sections.css src/lib/editorial-routes.test.ts
git commit -m "feat: unify catalogue and detail experiences"
```

### Task 4: Booking, authentication, map, and comparison workflows

**Files:**
- Modify: `src/pages/BookingPage.tsx`
- Modify: `src/components/BookingModal.tsx`
- Modify: `src/components/BookingCalendar.tsx`
- Modify: `src/components/BookingTimeSlotPicker.tsx`
- Modify: `src/components/PaymentForm.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/MapPage.tsx`
- Modify: `src/components/LocationSearch.tsx`
- Modify: `src/pages/ComparePage.tsx`
- Modify: `src/components/CompareSlider.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/styles/sections.css`
- Test: `src/lib/booking-conversion.test.ts`
- Test: `src/lib/compare.test.ts`

**Interfaces:**
- Consumes: booking policies, availability, offline queue, auth mutations, map data, and compare state.
- Produces: numbered appointment flow, portrait-backed auth plane, operational map search, and stable comparison stage.

- [ ] **Step 1: Add failing contracts for numbered steps and accessible controls**

Assert that the booking surface exposes an ordered step rail, login mode switching
uses selected semantics, map search retains a label, and compare controls have
accessible names plus stable dimensions.

- [ ] **Step 2: Run targeted tests and confirm failure**

Run: `npx vitest run src/lib/booking-conversion.test.ts src/lib/compare.test.ts`

Expected: FAIL on the new structure assertions.

- [ ] **Step 3: Recompose conversion and utility flows**

Keep every mutation and validation branch. Introduce numbered visual groups for
package, date/time, contact, payment, and confirmation; preserve modal focus
management and waitlist/offline paths. Recompose login as an image-backed auth
surface with explicit labels and recovery. Make map search/results one grid and
compare controls a labeled, fixed-size toolbar.

- [ ] **Step 4: Complete interaction states**

Style hover, press, focus, selected, disabled, loading, success, and error states.
Ensure submit controls cannot shift layout, sticky mobile actions clear safe areas,
and inline errors point to recovery. Retain 44px targets and reduced motion.

- [ ] **Step 5: Run workflow suites**

Run: `npx vitest run src/lib/booking-conversion.test.ts src/lib/compare.test.ts src/components/BookingTimeSlotPicker.test.ts src/utils/offlineBooking.test.ts`

Run: `npx playwright test -c e2e/playwright.config.ts e2e/booking.spec.ts e2e/offline-booking-recovery.spec.ts e2e/login.spec.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the workflow task**

```bash
git add src/pages/BookingPage.tsx src/components/BookingModal.tsx src/components/BookingCalendar.tsx src/components/BookingTimeSlotPicker.tsx src/components/PaymentForm.tsx src/pages/LoginPage.tsx src/pages/MapPage.tsx src/components/LocationSearch.tsx src/pages/ComparePage.tsx src/components/CompareSlider.tsx src/styles/pages.css src/styles/sections.css src/lib/booking-conversion.test.ts src/lib/compare.test.ts
git commit -m "feat: refine booking and account workflows"
```

### Task 5: Dashboard, editor, admin, and boundary states

**Files:**
- Modify: `src/components/dashboard/DashboardWorkspace.tsx`
- Modify: `src/components/dashboard/OverviewTab.tsx`
- Modify: `src/components/dashboard/DashboardTabWrapper.tsx`
- Modify: `src/pages/PhotoEditorPage.tsx`
- Modify: `src/pages/PhotoEditorWorkspace.tsx`
- Modify: `src/components/AdminDashboard.tsx`
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `src/components/NotFound.tsx`
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: `src/components/ImageWithFallback.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/styles/admin.css`
- Test: `src/lib/editor-regressions.test.ts`
- Test: `src/lib/audit-regressions.test.ts`

**Interfaces:**
- Consumes: current dashboard tabs, editor state/export, admin tabs/data tables, error reporting, and image fallback behavior.
- Produces: consistent high-density workspace styling and complete error/404/image boundary states.

- [ ] **Step 1: Add source contracts for operational surfaces**

Assert tabular numeric styling, 44px mobile dashboard tabs, labeled editor icon
buttons, admin table overflow handling, and actionable 404/error/image fallbacks.

- [ ] **Step 2: Run operational regression tests and confirm failure**

Run: `npx vitest run src/lib/editor-regressions.test.ts src/lib/audit-regressions.test.ts`

Expected: FAIL on new Field Notes structure or style assertions.

- [ ] **Step 3: Recompose dashboard and editor**

Preserve tab selection, keyboard behavior, API calls, and export logic. Use a clear
workspace rail, compact metrics, action-first empty states, stable canvas sizing,
icon controls with tooltips, and a neutral editor working plane.

- [ ] **Step 4: Recompose admin and global boundary states**

Keep every admin permission, CRUD, moderation, payment, audit, and reporting path.
Apply a publication-desk shell, consistent toolbars, tabular tables, semantic
status indicators, mobile overflow/row fallback, and coherent dialogs. Rebuild 404,
error, failed image, empty, and retry views with the shared state hierarchy.

- [ ] **Step 5: Run operational and E2E tests**

Run: `npx vitest run src/lib/editor-regressions.test.ts src/lib/audit-regressions.test.ts src/lib/public-chat.test.ts`

Run: `npx playwright test -c e2e/playwright.config.ts e2e/admin-moderation.spec.ts e2e/storage-resilience.spec.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the operational task**

```bash
git add src/components/dashboard/DashboardWorkspace.tsx src/components/dashboard/OverviewTab.tsx src/components/dashboard/DashboardTabWrapper.tsx src/pages/PhotoEditorPage.tsx src/pages/PhotoEditorWorkspace.tsx src/components/AdminDashboard.tsx src/components/admin/AdminShell.tsx src/components/NotFound.tsx src/components/ErrorBoundary.tsx src/components/ImageWithFallback.tsx src/styles/pages.css src/styles/admin.css src/lib/editor-regressions.test.ts src/lib/audit-regressions.test.ts
git commit -m "feat: align account and operational surfaces"
```

### Task 6: Responsive, accessibility, and performance hardening

**Files:**
- Modify: any task-owned frontend file with a verified defect
- Modify: `e2e/smoke.spec.ts`
- Create: `e2e/editorial-responsive.spec.ts`
- Modify: `scripts/check-performance-budget.mjs` only if a justified stable budget measurement is missing; never raise a failing budget to hide regression.

**Interfaces:**
- Consumes: completed UI across Tasks 1-5.
- Produces: automated viewport, keyboard, focus, reduced-motion, overflow, overlap, console, and performance evidence.

- [ ] **Step 1: Add the six-viewport browser contract**

Create a Playwright test that visits every public route at 375, 430, 768, 1024,
1440, and 1920 widths, waits for route settlement, checks
`document.documentElement.scrollWidth <= window.innerWidth`, verifies visible H1
and main content, collects console/page/request failures, and checks that fixed
navigation, chat, and primary actions do not intersect.

- [ ] **Step 2: Add keyboard and reduced-motion contracts**

At desktop and mobile widths, Tab through masthead, drawer, filters, booking form,
auth form, and dialogs. Verify visible focus; Escape closure and focus return; and
that computed animation/transition durations are effectively disabled under
`reducedMotion: "reduce"` for non-essential motion.

- [ ] **Step 3: Run the new browser audit and fix every verified defect**

Run: `npx playwright test -c e2e/playwright.config.ts e2e/editorial-responsive.spec.ts`

Expected: PASS with zero overflow, overlap, console error, page error, or app-owned
failed request. Repeat after each fix until green.

- [ ] **Step 4: Run source and performance gates**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Expected: type check, all Vitest tests, production build, SEO generation,
performance budget, and bundle analysis PASS.

- [ ] **Step 5: Commit hardening**

```bash
git add e2e/smoke.spec.ts e2e/editorial-responsive.spec.ts src scripts/check-performance-budget.mjs
git commit -m "test: harden responsive editorial experience"
```

Stage individual verified files rather than `git add .`; do not stage unrelated
or generated timestamp-only artifacts.

### Task 7: Visual acceptance, final review, and release

**Files:**
- Modify: any frontend file with a screenshot-proven defect
- Do not commit: screenshots, Playwright session output, temporary reports, or generated timestamp-only sitemap changes.

**Interfaces:**
- Consumes: release candidate from Tasks 1-6.
- Produces: six-width visual evidence, final automated evidence, clean Git diff, pushed main commit set, successful CI, and live deployment proof.

- [ ] **Step 1: Start the production-equivalent preview**

Run: `npm run build && npm run preview -- --host 127.0.0.1 --port 4179`

Expected: preview serves the production build at `http://127.0.0.1:4179`.

- [ ] **Step 2: Capture and inspect visual evidence**

Capture home and representative route screenshots at all six required widths;
capture every remaining route at desktop and mobile. Inspect first-viewport focus,
subject crop, section rhythm, information density, text fit, fixed controls, edge
states, and template-like repetition. Compare against the baseline findings: empty
brown heroes, tiny hero collages, truncated brand, competing fixed controls,
undersized touch targets, and disconnected editor/admin styling must all be gone.

- [ ] **Step 3: Perform the aesthetic refinement loop**

Fix every screenshot-proven generic, flat, over-empty, crowded, repetitive,
misaligned, low-contrast, clipped, or overlapping area. Rebuild and recapture the
affected widths after each group of fixes. Continue until all routes share the
approved design language and the visual leap is obvious.

- [ ] **Step 4: Run final complete verification**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Run: `npm run test:e2e`

Run: `npm audit --audit-level=moderate`

Expected: every command PASS, audit reports zero moderate-or-higher issues, and no
new console/network failures appear in the final browser sweep.

- [ ] **Step 5: Review and clean the final diff**

Run: `git status --short --branch`

Run: `git diff --check`

Run: `git diff --stat origin/main...HEAD`

Run: `git diff origin/main...HEAD -- . ':(exclude).agent/orchestrator-history/**'`

Confirm no debug code, secret, temporary output, screenshot, generated timestamp
noise, or unrelated file is included. Commit any final visual fixes with:

```bash
git add <only-the-verified-final-fix-files>
git commit -m "fix: complete editorial visual acceptance"
```

- [ ] **Step 6: Push and verify remote state**

Run: `git push origin main`

Watch the corresponding GitHub Actions run to completion, inspect failing logs if
needed, fix only real failures, and push again without force. Confirm the newest
Cloudflare Pages deployment corresponds to HEAD; verify custom domain and fixed
deployment URL health, then run desktop/mobile browser smoke with zero app-owned
console, request, page, overflow, or overlap defects.
