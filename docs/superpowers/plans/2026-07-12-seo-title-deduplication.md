# SEO Title Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every client-rendered page title contains the localized photography brand at most once while dynamic detail titles still receive a brand suffix.

**Architecture:** Keep the existing localized title strings as the source of truth. Add a small pure formatter beside the SEO hook that returns already-qualified titles unchanged and appends the site name only when it is absent; use the formatted value only for `document.title`, preserving the existing social metadata contract.

**Tech Stack:** React 19, TypeScript 7, i18next, Vitest, Playwright.

## Global Constraints

- Work directly on `main`; do not create a branch or force-push.
- Preserve unrelated `.agent/orchestrator-history` files and stage only files changed by this plan.
- Complete local tests, push, GitHub Actions, Cloudflare deployment, and live custom-domain verification.

---

### Task 1: Lock the production title regression

**Files:**
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: existing Playwright `page` fixture and production `BASE_URL` support.
- Produces: a browser regression proving public route title segments are unique.

- [x] **Step 1: Write the failing browser test**

```ts
test("公开页面标题不会重复品牌名", async ({ page }) => {
  for (const path of ["/", "/gallery", "/booking", "/products", "/workshops", "/shop", "/courses", "/map"]) {
    await page.goto(path);
    await expect.poll(() => page.title()).toContain(" | ");
    const segments = (await page.title()).split("|").map((segment) => segment.trim());
    expect(new Set(segments).size, `${path}: ${segments.join(" | ")}`).toBe(segments.length);
  }
});
```

- [x] **Step 2: Run against the current production deployment to verify RED**

Run: `$env:BASE_URL='https://shoot.custard.top'; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1 -g '公开页面标题不会重复品牌名'`

Expected: FAIL on `/` because `Naihuangbao Photography` appears twice.

### Task 2: Format the browser title once

**Files:**
- Modify: `src/hooks/useSEO.ts`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `resolvedTitle: string` and localized `t("seo.siteName")`.
- Produces: `formatSeoTitle(title: string, siteName: string): string` and a deduplicated `document.title`.

- [x] **Step 1: Add the minimal pure formatter and wire it into the hook**

```ts
export function formatSeoTitle(title: string, siteName: string) {
  const normalizedTitle = title.trim();
  const normalizedSiteName = siteName.trim();
  if (!normalizedTitle) return normalizedSiteName;
  if (!normalizedSiteName || normalizedTitle.includes(normalizedSiteName)) return normalizedTitle;
  return `${normalizedTitle} | ${normalizedSiteName}`;
}

document.title = formatSeoTitle(resolvedTitle, t("seo.siteName"));
```

- [x] **Step 2: Run the targeted test against a fresh local production build to verify GREEN**

Run: `npm run build; Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1 -g '公开页面标题不会重复品牌名'`

Expected: PASS.

- [x] **Step 3: Run focused and full local gates**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Run: `npm run perf:budget`

Run: `npx playwright test -c e2e/playwright.config.ts --workers=6`

Expected: all commands pass without tracked generated-artifact changes.

### Task 3: Release and verify production

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-seo-title-deduplication.md`

**Interfaces:**
- Consumes: verified Task 1 and Task 2 changes.
- Produces: one scoped commit on `main`, successful CI, a matching Cloudflare production deployment, and live title proof.

- [ ] **Step 1: Stage only the plan, hook, and regression test**

Run: `git add -- docs/superpowers/plans/2026-07-12-seo-title-deduplication.md e2e/smoke.spec.ts src/hooks/useSEO.ts`

- [ ] **Step 2: Commit and push**

Run: `git commit -m "fix: avoid duplicate brand in page titles"`

Run: `git push origin main`

- [ ] **Step 3: Verify CI and Cloudflare**

Run: `$runId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'; gh run watch $runId --exit-status`

Run: `npx wrangler pages deployment list --project-name naihuangbao-photography --json`

Expected: CI succeeds and the newest production deployment source matches the new commit.

- [ ] **Step 4: Run live acceptance**

Run: `$env:BASE_URL='https://shoot.custard.top'; npx playwright test e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: all smoke tests pass, including unique title segments on every public route.
