# Dashboard Workspace UI/UX Design

## Goal

Turn the customer dashboard from a compressed tab strip into a readable, action-oriented workspace on desktop and mobile.

## Navigation

- Desktop uses a compact left navigation rail with icon and label rows.
- Mobile uses a horizontally scrollable tab rail with stable 44px touch targets.
- The active destination has strong shape, color, and `aria-selected` state.
- Arrow keys move between destinations; Home and End jump to the first and last destination.
- Only the active panel is mounted so inactive data requests and layouts do not compete.

## Empty States

Each empty data view contains:

- A semantic icon container.
- A short title explaining the state.
- One sentence describing what will appear there.
- A direct CTA to the workflow that can populate the view.

The shared wrapper owns this structure so all dashboard tabs remain consistent.

## First-Use Overview

When bookings, courses, workshops, and recent bookings are all empty, the overview shows a "start here" panel with three useful paths:

1. Book a portrait session.
2. Browse the gallery and save references.
3. Open the local portrait editor.

## Responsive Rules

- The desktop rail is 184px and the content panel takes the remaining width.
- Below 760px, navigation moves above content and scrolls horizontally.
- Mobile labels remain horizontal, never vertical.
- Scroll padding and edge fades signal that more destinations are available.
- Dashboard content continues to clear the fixed bottom navigation.

## Visual System

Reuse the existing warm paper palette, 16px-or-lower panel radii, Lucide icons, semantic status colors, and existing typography. No new dependency or decorative asset is required.

## Verification

- Source regression for the workspace, keyboard behavior, empty CTA contract, and zero-state panel.
- Desktop 1366x900 and mobile 390x844 screenshot inspection.
- E2E checks for tab selection, keyboard switching, horizontal label layout, empty CTA, and no overflow.
- Full lint, tests, build, CI, and deployment checks.
