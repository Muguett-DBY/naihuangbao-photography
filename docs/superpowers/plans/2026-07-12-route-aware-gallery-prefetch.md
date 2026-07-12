# Route-Aware Gallery Prefetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop direct visits to non-gallery routes from downloading homepage portfolio images while retaining no-JavaScript SEO images and homepage-only idle prefetching.

**Architecture:** Keep the universal SEO shell, but move its image list into `<noscript>` so normal SPA parsing cannot start image fetches. Scope the existing idle prefetch block to pathname `/`, then protect both boundaries with source contracts and a browser-level request regression.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 4, Playwright 1.61.

## Global Constraints

- Work directly on `main`; do not create a branch or force-push.
- Preserve unrelated `.agent/orchestrator-history` files and stage only files named by this plan.
- Preserve static fallback text, JSON-LD image metadata, and no-JavaScript image examples.
- Complete local tests, push, GitHub Actions, Cloudflare deployment, and live custom-domain verification.

---

### Task 1: Lock the production network regression

**Files:**
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: Playwright `page` request events and existing `BASE_URL` configuration.
- Produces: a browser regression requiring direct `/booking` visits to issue no `/images/gallery/` requests.

- [x] **Step 1: Write the failing browser test**

```ts
test("非画廊页面不会下载作品图片", async ({ page }) => {
  const galleryRequests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/images/gallery/")) galleryRequests.push(pathname);
  });

  await page.goto("/booking");
  await expect(page.locator(".booking-quick-cta")).toBeVisible();

  expect(galleryRequests).toEqual([]);
});
```

- [x] **Step 2: Run against current production to verify RED**

Run: `$env:BASE_URL='https://shoot.custard.top'; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1 -g '非画廊页面不会下载作品图片'`

Expected: FAIL and report the current fallback and prefetch gallery paths.

### Task 2: Lock the static boot boundaries

**Files:**
- Modify: `src/lib/seo-html.test.ts`
- Modify: `src/lib/performance.test.ts`

**Interfaces:**
- Consumes: raw `index.html` and `src/main.tsx` source strings.
- Produces: contracts that keep active fallback markup image-free and constrain idle prefetch to `/`.

- [x] **Step 1: Add failing source contracts**

```ts
it("keeps fallback portfolio images inert while JavaScript is enabled", () => {
  const fallback = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)?.[1] ?? "";
  const noscript = fallback.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
  const activeFallback = fallback.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");

  expect(noscript.match(/<img\b/g)).toHaveLength(3);
  expect(activeFallback).not.toContain("<img");
});

it("prefetches featured portfolio images only on the homepage", () => {
  expect(mainSource).toContain('window.location.pathname === "/"');
  expect(mainSource).toContain('link.rel = "prefetch"');
  expect(mainSource).toContain('link.as = "image"');
});
```

- [x] **Step 2: Run focused Vitest to verify RED**

Run: `npx vitest run src/lib/seo-html.test.ts src/lib/performance.test.ts`

Expected: FAIL because fallback images are active and the prefetch block has no pathname guard.

### Task 3: Isolate gallery requests at boot

**Files:**
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/lib/seo-html.test.ts`
- Modify: `src/lib/performance.test.ts`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: browser scripting mode and `window.location.pathname`.
- Produces: no-JavaScript-only fallback images plus homepage-only idle prefetch.

- [x] **Step 1: Make fallback images no-JavaScript-only**

```html
<noscript>
  <ul>
    <li><img src="/images/gallery/gallery-garden-01.webp" alt="南京公园女生写真作品，奶黄包摄影" width="320" height="400" /></li>
    <li><img src="/images/gallery/gallery-jiangnan-01.webp" alt="南京江南感女生写真作品，奶黄包摄影" width="320" height="400" /></li>
    <li><img src="/images/gallery/gallery-urban-01.webp" alt="南京街拍女生写真作品，奶黄包摄影" width="320" height="400" /></li>
  </ul>
</noscript>
```

- [x] **Step 2: Scope idle prefetch to direct homepage visits**

```ts
if (window.location.pathname === "/" && "requestIdleCallback" in window) {
  // existing prefetch callback remains unchanged
}
```

- [x] **Step 3: Run focused tests to verify GREEN**

Run: `npx vitest run src/lib/seo-html.test.ts src/lib/performance.test.ts`

Run: `npm run build`

Run: `npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1 -g '非画廊页面不会下载作品图片'`

Expected: all focused checks PASS and the local browser records no gallery requests on `/booking`.

### Task 4: Complete local release gates

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-route-aware-gallery-prefetch.md`

**Interfaces:**
- Consumes: the focused GREEN implementation.
- Produces: broad evidence that the change preserves the rest of the product.

- [x] **Step 1: Run all local gates**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build:full`

Run: `npm audit --audit-level=moderate`

Run: `npx playwright test -c e2e/playwright.config.ts --workers=6`

Run: `git diff --check`

Expected: every command exits 0 with no unintended tracked generated changes.

- [x] **Step 2: Remove diagnostic browser output and restore generated sitemap timestamp noise if present**

Run: `$outputPath = (Resolve-Path output/playwright/editor-load).Path; if ($outputPath -ne (Join-Path (Get-Location) 'output\playwright\editor-load')) { throw "Unexpected cleanup path: $outputPath" }; Remove-Item -LiteralPath $outputPath -Recurse -Force`

Run: `git status --short --untracked-files=all`

Expected: only planned files plus the known unrelated `.agent/orchestrator-history` files remain.

### Task 5: Release and verify production

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-route-aware-gallery-prefetch.md`

**Interfaces:**
- Consumes: verified Task 1 through Task 4 changes.
- Produces: a scoped main commit, successful CI, matching Cloudflare deployment, and live network proof.

- [ ] **Step 1: Stage only planned implementation files**

Run: `git add -- docs/superpowers/plans/2026-07-12-route-aware-gallery-prefetch.md e2e/smoke.spec.ts index.html src/main.tsx src/lib/seo-html.test.ts src/lib/performance.test.ts`

- [ ] **Step 2: Commit and push**

Run: `git commit -m "perf: avoid gallery downloads on unrelated routes"`

Run: `git push origin main`

- [ ] **Step 3: Verify CI and Cloudflare**

Run: `$runId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'; gh run watch $runId --exit-status`

Run: `$deployments = npx wrangler pages deployment list --project-name naihuangbao-photography --json | ConvertFrom-Json; $deployment = $deployments | Where-Object { $_.environment -eq 'Production' } | Select-Object -First 1; $deploymentUrl = $deployment.url; $deployment`

Expected: CI succeeds and the newest production deployment source matches `main` HEAD.

- [ ] **Step 4: Run live acceptance on fixed and custom domains**

Run: `$env:BASE_URL=$deploymentUrl; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1 -g '非画廊页面不会下载作品图片'`

Run: `$env:BASE_URL='https://shoot.custard.top'; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: the fixed deployment passes the targeted network regression and the custom domain passes the full smoke suite without gallery requests on `/booking`.
