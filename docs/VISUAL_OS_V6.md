# Visual OS V6

Visual OS V6 keeps the public visual playground, local creative tools, and legacy practice routes in one React/Vite application while giving each area a clear ownership boundary.

## Ownership Map

- `src/data/visual-worlds.ts`: homepage visual worlds and stable asset IDs.
- `content/archive/projects/*/project.json`: source of truth for concept projects.
- `content/stories/*/story.json`: source of truth for published stories.
- `src/data/visual-assets.generated.json`: generated cross-feature asset index. Do not edit by hand.
- `src/features/practice/PracticeLayout.tsx`: providers and UI used only by practice routes.
- `src/features/studio/*`: composition recipes, layer controls, and storage status.
- `src/lib/archive-discovery.ts`: deterministic local similarity ranking.
- `src/lib/composition-project-store.ts`: V3 portable project schema, IndexedDB index, and OPFS mirror.
- `src/routing/route-contract.ts`: route contract used to generate Cloudflare rules and release metadata.

## Content Workflow

1. Add original generated imagery to `source-assets/<collection>/raw/`.
2. Register the collection in `scripts/process-concept-assets.mjs` and run the processor.
3. Add or update an archive project JSON file. Concept imagery must never enter `src/data/gallery.ts`.
4. Run `npm run archive:build`, `npm run stories:build`, and `npm run content:build`.
5. Reference assets by their generated stable ID when linking Archive, Stories, and Create.

## Storage And Export

- Composition projects use schema V3. V1 and V2 projects migrate on read.
- IndexedDB remains the queryable project index. Browsers with OPFS also receive a portable `.nhb` mirror.
- Layer visibility, opacity, blend mode, and transforms are included in portable exports.
- Image encoding uses an OffscreenCanvas worker when supported and falls back to `canvas.toBlob`.
- PWA updates remain waiting while any creative surface reports unsaved work.

## Routing And SEO

- Edit `src/routing/route-contract.ts`, then run `npm run routes:build`.
- Archive and story detail routes are emitted as static HTML shells by `npm run seo:routes`.
- Dynamic detail routes with static shells are intentionally absent from `_redirects`; Cloudflare serves their directory `index.html` files directly.
- `npm run release:verify -- --origin <origin> --commit <sha-prefix>` verifies the deployed release.

## Release Gate

Run `npm run verify:release`. The gate covers types, architecture, dead code, unit tests, full build, initial and route budgets, bundle analysis, and Playwright E2E. Commit generated manifests together with the source content that produced them.
