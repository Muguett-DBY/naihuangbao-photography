# Route-Aware Gallery Prefetch Design

## Objective

Prevent non-gallery routes from downloading homepage portfolio images during initial navigation while preserving the static SEO fallback and the existing homepage image-prefetch intent.

## Root Cause

The shared SPA document currently starts two independent sets of gallery requests on every route:

1. Three `<img>` elements in the static SEO fallback are discovered before React replaces the fallback.
2. `src/main.tsx` schedules three 640-pixel gallery prefetches without checking the current route.

A fresh production visit to `/booking` therefore requested all six images, transferring about 747 KiB of unrelated image data. The same behavior competes with route code and API requests on `/editor`, where a previous live smoke run intermittently reached the navigation timeout.

## Chosen Approach

Keep the crawlable fallback text and structured image metadata unchanged. Place only the fallback image list inside `<noscript>` so users with JavaScript disabled still see the examples, while normal SPA visits do not start those image requests. Keep idle prefetching for the homepage, but guard it with `window.location.pathname === "/"` so direct visits to booking, editor, login, and other routes remain image-free until their own UI requests an image.

This is preferred over changing Playwright to wait only for `domcontentloaded`, which would hide the bandwidth problem, and over guarding only the prefetch block, which would leave the larger fallback-image transfer intact.

## Boundaries

- Do not change gallery rendering, responsive image selection, service-worker image caching, or API data loading.
- Do not remove the homepage fallback text, JSON-LD `ImageGallery`, or no-JavaScript image examples.
- Do not introduce a new dependency or route abstraction for a two-condition boot-time guard.
- Preserve direct homepage behavior for `/` with or without query parameters.

## Verification

- Add a production-first Playwright regression that records requests before navigating to `/booking` and requires zero `/images/gallery/` requests.
- Add static unit contracts proving fallback `<img>` elements exist only inside `<noscript>` and the prefetch block is homepage-scoped.
- Run targeted tests through RED and GREEN, then lint, all Vitest tests, production build, performance budget, audit, and the full local Playwright suite.
- After pushing `main`, require successful GitHub Actions, a matching Cloudflare Pages production deployment, and the same network regression plus full smoke coverage on the deployment URL and custom domain.
