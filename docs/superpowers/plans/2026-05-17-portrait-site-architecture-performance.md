# Portrait Site Architecture And Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the seven architecture improvements identified in review and add a focused performance pass for the portrait booking site.

**Architecture:** Keep the current Vite React SPA plus Cloudflare Pages Functions shape. Add shared server helpers for typed bindings, API responses, logging, photo consistency, and SEO metadata; split the oversized admin and CSS surfaces without changing user-facing behavior.

**Tech Stack:** React 19, Vite, Vitest, Cloudflare Pages Functions, D1, R2, VitePWA.

---

### Task 1: Guardrails And Baseline

**Files:**
- Create: `src/lib/architecture-contracts.test.ts`
- Modify: `package.json`
- Modify: `wrangler.toml`
- Modify: `tsconfig.node.json`

- [ ] Write failing contract tests for generated `Env`, Cloudflare environments, observability, shared API helpers, admin/CSS split, SEO metadata sync, and bundle/performance budgets.
- [ ] Run `npm test -- src/lib/architecture-contracts.test.ts` and verify the new tests fail for the expected missing files or config.
- [ ] Implement the smallest config/script changes needed for the contract.
- [ ] Run the focused test until it passes.

### Task 2: Cloudflare API Reliability

**Files:**
- Create: `functions/_responses.ts`
- Create: `functions/_photos.ts`
- Create: `functions/api.test.ts`
- Modify: `functions/api/photos.ts`
- Modify: `functions/api/content.ts`
- Modify: `functions/api/admin/photos.ts`
- Modify: `functions/api/admin/photos/[id].ts`

- [ ] Add failing API behavior tests for public photo fallback, upload compensation when D1 insert fails, and delete consistency when R2 deletion fails.
- [ ] Implement shared JSON/error/log helpers.
- [ ] Implement R2 compensation and structured fallback behavior.
- [ ] Run focused API tests, then full tests.

### Task 3: Admin And CSS Decomposition

**Files:**
- Create: `src/components/admin/AdminShell.tsx`
- Create: `src/components/admin/PhotosTab.tsx`
- Create: `src/components/admin/ContentTabs.tsx`
- Create: `src/hooks/useAdminSession.ts`
- Create: `src/hooks/useAdminData.ts`
- Modify: `src/components/AdminDashboard.tsx`
- Create: `src/styles/base.css`
- Create: `src/styles/site.css`
- Create: `src/styles/chat.css`
- Modify: `src/styles/global.css`

- [ ] Add failing source contract tests that require admin tabs/hooks and CSS modules.
- [ ] Extract admin hooks and tab components while preserving UI copy and API calls.
- [ ] Split CSS with `@import` entrypoint to keep the existing import path stable.
- [ ] Run typecheck/build after each extraction.

### Task 4: SEO Sync And Performance

**Files:**
- Create: `src/lib/seo.ts`
- Create: `scripts/sync-seo-shell.mjs`
- Modify: `index.html`
- Modify: `package.json`
- Modify: `src/main.tsx`
- Modify: `vite.config.ts`

- [ ] Add failing tests for static shell metadata being generated from the same default content source as the app.
- [ ] Implement SEO metadata generation and a sync script.
- [ ] Wire the script into build so static metadata stays in sync.
- [ ] Add resource hint and CSS budget checks.
- [ ] Run `npm test`, `npm run build`, and browser verification.
