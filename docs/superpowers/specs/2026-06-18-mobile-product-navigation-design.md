# Mobile Product Navigation Design

## Context

The previous iteration explicitly recommended a mobile bottom navigation as the next flagship UI/UX change. The site already has a broad mobile menu, but core actions still require opening the header menu or discovering isolated links. The photo editor is especially difficult to discover despite being a substantial product feature.

## Chosen direction

Add a mobile-only bottom navigation with five primary actions:

1. Home
2. Gallery
3. Booking
4. Photo editor
5. Account

Booking is the visual primary action and opens the existing booking modal without a route transition. Account routes authenticated users to `/dashboard` and guests to `/login`. Active state follows the current route, including photo detail pages under Gallery.

The bar is hidden on desktop, admin routes, and the editor workspace. It uses the existing warm paper, caramel, and peach visual language, supports device safe areas, provides 44px touch targets, and exposes semantic labels/current-page state.

## Dashboard increment

Add a photo-editor discovery card beneath the signed-in profile summary. The card explains that editing happens locally in the browser and links directly to `/editor`. This is a new user-visible increment beyond the bottom navigation and completes the previous iteration's second-ranked direction.

## Collision and performance rules

- Reserve mobile page space so the fixed bar never covers footer content.
- Move the public chat launcher and scroll-to-top control above the bar.
- Keep the editor route free of the bottom bar and chat overlay.
- Reuse existing icons and providers; add no dependency.
- Keep the component static except for route/auth state, avoiding new listeners or network work.

## Verification

- Contract tests for composition, route behavior, labels, safe-area CSS, dashboard entry, and overlay offsets.
- Mobile Playwright flow for active states, booking modal opening, editor navigation, and no horizontal overflow.
- TypeScript, unit tests, production build, performance budget, and mobile browser screenshot review.
