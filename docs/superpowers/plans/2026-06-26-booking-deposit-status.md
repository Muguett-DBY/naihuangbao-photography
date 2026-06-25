# Booking Deposit Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make booking deposit state truthful, persistent, and visible from booking confirmation through the customer dashboard.

**Architecture:** Extend the existing payment intent response and authenticated booking projection instead of introducing a second payment store. Keep placeholder handling explicit in `PaymentForm`, then reuse the projected state in booking cards.

**Tech Stack:** React 19, TypeScript, Cloudflare Pages Functions, D1, Vitest, Playwright.

---

### Task 1: Lock The Payment Contract With Failing Tests

**Files:**
- Modify: `functions/api.test.ts`
- Modify: `src/lib/audit-regressions.test.ts`

- [ ] Add an API test asserting that placeholder intent creation returns `provider: "placeholder"` and `status: "pending"`.
- [ ] Add an authenticated booking API test asserting that latest deposit fields are returned with canonical status.
- [ ] Add source regressions requiring placeholder-aware UI, offline payment gating, and dashboard deposit rendering.
- [ ] Run the focused tests and confirm they fail for the missing contract.

### Task 2: Implement The Server Projection

**Files:**
- Modify: `functions/api/payment/create-intent.ts`
- Modify: `functions/api/user/bookings.ts`
- Modify: `src/types/payment.ts`
- Modify: `src/types/dashboard.ts`

- [ ] Return provider and current status when creating a payment intent.
- [ ] Join each authenticated booking to its latest `booking_deposit` intent.
- [ ] Normalize missing and historical payment states.
- [ ] Run focused API tests and confirm they pass.

### Task 3: Implement Truthful Booking Deposit UX

**Files:**
- Modify: `src/components/PaymentForm.tsx`
- Modify: `src/components/BookingModal.tsx`
- Modify: `src/components/dashboard/BookingsTab.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/ko.json`
- Modify: `src/styles/pages.css`

- [ ] Stop placeholder intents from entering confirmation polling.
- [ ] Remove fake disabled card fields from placeholder mode and present honest pending/deferred actions.
- [ ] Skip server payment for offline bookings.
- [ ] Add deposit state and amount to booking success and dashboard cards.
- [ ] Run focused tests and confirm all new regressions pass.

### Task 4: Verify And Release Stage 1

**Files:**
- Modify: `.agent/iteration-log.md`
- Modify: `.agent/orchestrator-log.md`

- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run build:full`.
- [ ] Run booking Playwright with one worker.
- [ ] Inspect desktop and mobile booking/dashboard states with no console errors or overflow.
- [ ] Review status, unstaged diff, staged diff, secrets, and temporary artifacts.
- [ ] Commit only Stage 1 files, push `main`, watch GitHub Actions, and record the result.
