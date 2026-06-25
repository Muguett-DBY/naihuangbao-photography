# Booking Self-Service Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make customer booking cancellation and rescheduling capacity-safe, visible, and recoverable.

**Architecture:** Put date/capacity rules in a shared Worker module, enforce them in booking APIs, and reuse the existing availability-aware calendar in the dashboard.

**Tech Stack:** React 19, TypeScript, Cloudflare Pages Functions/D1, Vitest, Playwright, i18next.

---

### Task 1: Booking domain rules

**Files:** Create `functions/_booking.ts` and `functions/booking-rules.test.ts`.

- [ ] Write failing tests for malformed, impossible, past, cancelled, and full-capacity cases.
- [ ] Run the targeted test and confirm failure.
- [ ] Implement the minimal shared rules.
- [ ] Run the targeted test and confirm success.

### Task 2: API enforcement

**Files:** Modify availability, user booking, cancellation, reschedule, and API test files.

- [ ] Add failing API regressions.
- [ ] Canonicalize cancellation and retain legacy compatibility.
- [ ] Enforce strict reschedule validation and capacity.
- [ ] Normalize legacy status on reads.
- [ ] Run targeted API tests.

### Task 3: Dashboard experience

**Files:** Modify `BookingsTab`, dashboard CSS, four locale files, and audit regressions.

- [ ] Add failing source regression assertions.
- [ ] Replace the blind date input with `BookingCalendar`.
- [ ] Surface API/network errors and success feedback.
- [ ] Add responsive and accessible styles.
- [ ] Run targeted tests.

### Task 4: Stage closure

- [ ] Run tests, lint, `build:full`, and booking Playwright.
- [ ] Inspect status and diffs; stage only Stage 1 files.
- [ ] Commit, push `main`, watch CI, and update both logs.
