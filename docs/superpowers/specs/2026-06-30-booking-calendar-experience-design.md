# Booking Calendar Experience Design

## Objective

Turn the booking calendar from a collection of weak helper labels into one coherent availability surface that explains policy, shows accurate month status, and confirms the user's selection.

## Chosen Approach

Keep `BookingCalendar` as the shared booking and rescheduling component, but reorganize its internal information architecture. This preserves the existing API and dashboard integration while producing a visible improvement in both entry points.

The alternatives were a style-only refresh, which would not resolve misleading counts or weak feedback, and a full booking-modal redesign, which would expand the blast radius beyond this UIUX stage.

## Experience Structure

1. A compact month toolbar uses Lucide icon buttons and keeps the current month as the visual anchor.
2. A policy strip groups the earliest bookable date with the studio time zone and daily capacity.
3. The calendar grid renders either real days or an in-place loading skeleton, never both.
4. A three-part status strip reports open, limited, and full dates across the actually bookable part of the visible month.
5. Selecting a date creates a live confirmation row with a localized long date and remaining-capacity detail.

## Responsive And Accessible Behavior

- Remove the mobile-only 300px calendar cap so day targets can use the modal's available width.
- Let policy metadata stack at narrow widths while status counts remain scannable.
- Preserve 44px navigation controls, visible focus, disabled states, and keyboard date navigation.
- Mark the selected day with `aria-pressed` and announce the confirmation through `role="status"`.
- Use text plus color for availability states.

## Data And Error Handling

No new endpoint or dependency is required. Missing date entries continue to mean fully open. Month totals are derived from rendered, bookable dates so absent open dates are counted correctly. Existing fetch fallback behavior remains unchanged.

## Verification

- Vitest source contracts for structure, localization, responsive CSS, and accessibility state.
- Booking Playwright coverage for policy metadata, month counts, date selection, remaining capacity, and mobile layout.
- Full lint, Vitest, production build, performance budget, desktop/mobile rendered checks, and console review.
