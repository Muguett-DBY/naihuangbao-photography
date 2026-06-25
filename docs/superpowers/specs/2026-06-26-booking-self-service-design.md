# Booking Self-Service Reliability Design

## Context

The customer dashboard exposes cancel and reschedule controls, but failed mutations are silent and rescheduling ignores the site's availability calendar. The backend also writes `canceled` while availability and UI logic use `cancelled`, so cancelled bookings can continue consuming capacity and render with an unknown status.

## Design

- Use `cancelled` as the canonical status while accepting legacy `canceled` rows.
- Exclude both spellings from availability counts.
- Accept only real `YYYY-MM-DD` reschedule dates that are today or later in the Nanjing business timezone.
- Reject fully booked dates while excluding the booking being moved.
- Reuse `BookingCalendar` in the dashboard.
- Show mutation errors inline and show success through the existing toast system.
- Disable reschedule confirmation until a different available date is selected.

No payment provider, production secret, schema migration, or new dependency is required.

## Verification

Use unit tests for date/capacity rules, API regressions for cancellation/rescheduling, frontend source regressions for visible feedback, then the full test, typecheck, production build, performance, and booking E2E gates.
