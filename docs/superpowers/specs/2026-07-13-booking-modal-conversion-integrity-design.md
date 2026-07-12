# Booking Modal Conversion Integrity Design

## Objective

Restore the public booking CTA as a true viewport modal and remove the notification-permission prompt that blocks conversion without providing a working notification channel.

## Production Evidence

A fresh production visit to `https://shoot.custard.top/` shows two related conversion defects:

1. Opening the hero booking CTA moves the document from the first viewport to the footer. The element with `role="dialog"` is rendered at the end of the document with `position: static`, and its parent mask is also static. The booking form is clipped instead of centered in a fixed overlay on desktop and mobile.
2. A fixed English `Enable Notifications` strip covers the bottom of the Chinese desktop and mobile experience, including the area used by mobile navigation. The notification hook is consumed only by this prompt; no product code calls `showNotification`, so granting permission cannot deliver the promised booking, photo, or update alerts.

The browser console and request-failure lists were otherwise empty during the captured flow.

## Root Cause

`BookingModal` uses the `Modal` component from `animal-island-ui`, but the package declares `sideEffects: false`. Its generated component module imports the structural CSS through a JavaScript sidecar, and the production bundle omits that CSS. The DOM therefore receives the expected hashed Modal classes without the mask, centering, sizing, overflow, animation, or close-button rules.

The repository previously imported the full `animal-island-ui/style` sheet and still contains a Vite plugin dedicated to removing that sheet's bundled font faces. Restoring the full sheet would fix the modal, but it would add roughly 75 KB of raw CSS to a main stylesheet already near the 200 KiB budget and would re-style unrelated component surfaces.

## Chosen Design

Import only the package-exported Modal CSS sidecar from `BookingModal.tsx`. The sidecar is about 2 KB and travels with the same package version and generated class names as the component implementation. Existing photography-theme overrides and booking-specific responsive rules remain responsible for visual adaptation.

Remove `PushNotificationBanner` from `RootLayout`, delete its unused component and hook, and remove its dedicated fixed-strip CSS. Keep the PWA install and update prompts: those have real browser-backed outcomes, delayed eligibility, localized copy, and separate tests.

## Boundaries

- Do not change booking form fields, validation, capacity rules, payment behavior, or API requests.
- Do not restore the full `animal-island-ui` stylesheet or increase the CSS performance budget.
- Do not add a replacement permission prompt until a real push subscription and delivery path exists.
- Preserve modal focus trapping, Escape handling, scroll locking, ARIA labelling, mobile bottom-navigation suppression, and existing theme overrides.
- Preserve the unrelated `.agent/orchestrator-history` files outside the release commit.

## Verification

- Add a source contract requiring the Modal CSS sidecar and forbidding the dead push prompt in the public root layout.
- Extend the homepage booking Playwright flow to prove that opening the CTA keeps the page near its original scroll position, gives the mask fixed positioning, keeps the dialog within the viewport, and leaves the notification prompt absent.
- Run the focused source and browser tests through RED and GREEN.
- Run lint, all Vitest tests, `build:full`, dependency audit, performance budget, and the full local Playwright suite.
- Capture post-fix desktop and mobile booking screenshots at the same states and inspect them against the production evidence.
- Push `main`, require successful GitHub Actions and a matching Cloudflare Production deployment, then repeat fixed-deployment and custom-domain booking geometry checks.

## Rollback

If the sidecar import becomes unavailable in a future `animal-island-ui` release, pin the last working package version while deciding between an upstream package fix and a local modal shell. Do not silently fall back to the broken inline form.
