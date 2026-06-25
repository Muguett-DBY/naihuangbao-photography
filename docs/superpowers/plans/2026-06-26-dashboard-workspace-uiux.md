# Dashboard Workspace UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive dashboard workspace with legible navigation, useful empty states, and a clear first-use path.

**Architecture:** Replace the third-party dashboard Tabs composition with a focused native `DashboardWorkspace` component. Extend the existing shared data-state wrapper instead of duplicating empty-state markup in every tab.

**Tech Stack:** React 19, TypeScript, React Router, Lucide, CSS, Vitest, Playwright.

---

### Task 1: Write Failing UI Contract Tests

**Files:**
- Modify: `src/lib/audit-regressions.test.ts`

- [ ] Require a `DashboardWorkspace` component with `role="tablist"`, `aria-selected`, and keyboard handling.
- [ ] Require action-oriented empty state props in `DashboardTabWrapper`.
- [ ] Require an overview first-use panel.
- [ ] Run the focused test and confirm failure.

### Task 2: Build The Responsive Workspace

**Files:**
- Create: `src/components/dashboard/DashboardWorkspace.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/styles/pages.css`

- [ ] Implement controlled active destination state.
- [ ] Add desktop rail and mobile horizontal layout.
- [ ] Add arrow, Home, and End keyboard navigation.
- [ ] Preserve all nine existing dashboard destinations.
- [ ] Verify only the active panel renders.

### Task 3: Upgrade Shared Empty And First-Use States

**Files:**
- Modify: `src/components/dashboard/DashboardTabWrapper.tsx`
- Modify: `src/components/dashboard/OverviewTab.tsx`
- Modify: `src/components/dashboard/BookingsTab.tsx`
- Modify: `src/components/dashboard/MyPhotosTab.tsx`
- Modify: `src/components/dashboard/FavoritesTab.tsx`
- Modify: `src/components/dashboard/RecentlyViewedTab.tsx`
- Modify: `src/components/dashboard/PurchasesTab.tsx`
- Modify: `src/components/dashboard/CoursesTab.tsx`
- Modify: `src/components/dashboard/WorkshopsTab.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/styles/pages.css`

- [ ] Add shared empty title, description, and CTA props.
- [ ] Provide a specific action for each empty tab.
- [ ] Add the zero-state start panel to the overview.
- [ ] Add loading skeletons and semantic focus/hover/selected states.

### Task 4: Verify And Release Stage 2

**Files:**
- Modify: `e2e/booking.spec.ts`
- Modify: `.agent/iteration-log.md`
- Modify: `.agent/orchestrator-log.md`

- [ ] Add dashboard workspace desktop/mobile and keyboard E2E checks.
- [ ] Run focused RED/GREEN tests.
- [ ] Run lint, full Vitest, `build:full`, and booking E2E with one worker.
- [ ] Inspect desktop and mobile screenshots with no overflow or console errors.
- [ ] Review all diffs and stage only Stage 2 files.
- [ ] Commit, push `main`, watch GitHub Actions, and record the result.
