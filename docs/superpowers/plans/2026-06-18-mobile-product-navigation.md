# Mobile Product Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the previous iteration's mobile navigation direction and add a clear dashboard entry to the photo editor.

**Architecture:** Add a focused `MobileBottomNav` component inside the existing authenticated/booking provider tree. It derives route and account destinations from existing hooks, invokes the existing booking modal, and relies on responsive CSS for presentation and collision management.

**Tech Stack:** React 19, React Router 7, react-i18next, lucide-react, CSS, Vitest, Playwright.

---

### Task 1: Define regression contracts

**Files:**
- Modify: `src/lib/editor-regressions.test.ts`
- Modify: `e2e/smoke.spec.ts`

- [ ] Add a unit contract requiring `MobileBottomNav`, route-aware states, booking modal integration, dashboard editor discovery, safe-area spacing, and overlay offsets.
- [ ] Run `npm test -- src/lib/editor-regressions.test.ts` and confirm the new contract fails because the feature does not exist.
- [ ] Add a mobile Playwright scenario that checks navigation visibility, active route state, booking modal opening, and editor navigation.

### Task 2: Build the mobile navigation

**Files:**
- Create: `src/components/shared/MobileBottomNav.tsx`
- Modify: `src/layouts/RootLayout.tsx`
- Modify: `src/styles/sections.css`
- Modify: `src/styles/chat.css`
- Modify: `src/styles/pages.css`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/i18n/locales/ja.json`

- [ ] Implement five semantic actions with Home/Gallery active states, modal-based Booking, Editor route, and auth-aware Account route.
- [ ] Render it only outside `/editor` and use CSS to show it only at mobile widths.
- [ ] Add warm paper styling, a raised booking action, safe-area padding, focus states, and reduced-motion behavior.
- [ ] Reserve bottom space and move chat/scroll controls above the bar.
- [ ] Run the focused unit test and confirm it passes.

### Task 3: Add dashboard editor discovery

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/i18n/locales/ja.json`

- [ ] Add a direct editor card below the profile summary with a concise privacy/local-processing explanation.
- [ ] Ensure the card has a clear mobile layout and accessible link label.
- [ ] Re-run the focused unit test.

### Task 4: Verify the complete experience

**Files:**
- Modify: `.agent/iteration-log.md`

- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run build:full`.
- [ ] Run the relevant Playwright mobile smoke tests against the production preview.
- [ ] Inspect desktop and 390x844 mobile renders for overlap, overflow, active states, and dashboard/editor flow.
- [ ] Update the iteration log while preserving the previous uncommitted security iteration record.
- [ ] Review `git diff`, stage only this iteration, commit, push `main`, and check GitHub Actions until green or externally blocked.
