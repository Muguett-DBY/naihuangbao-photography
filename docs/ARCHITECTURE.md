# Architecture

This document describes the boundaries that keep the public site, booking flows,
editor, immersive runtime, and Cloudflare backend independently maintainable.
The rules below are executable through `npm run architecture:check`.

## System map

| Area | Responsibility | May depend on |
| --- | --- | --- |
| `src/main.tsx`, `src/router.tsx` | Browser composition root and route tree | Any browser layer |
| `src/routing/` | Lazy route registry and route-preload infrastructure | Pages, components, shared libraries |
| `src/features/` | Domain orchestration, providers, feature state | Components, hooks, libraries, data, types |
| `src/pages/` | Route-level composition and SEO ownership | Features, components, hooks, experience, libraries |
| `src/layouts/` | Cross-route application shells | Features, components, hooks, experience |
| `src/components/` | Reusable rendered UI | Features, hooks, experience, libraries, data, types |
| `src/hooks/` | Reusable state and browser behavior without rendered UI | Libraries, data, types, other hooks |
| `src/experience/` | Isolated Three.js lifecycle and resource management | Experience modules, data, types, low-level libraries |
| `src/lib/`, `src/utils/` | UI-independent algorithms and infrastructure | Data, types, other low-level modules |
| `src/data/`, `src/types/` | Static models, defaults, and shared contracts | Types and data only |
| `content/` | Directory-owned Archive and Story source documents | No runtime imports |
| `source-assets/` | Versioned master images outside the public delivery tree | Asset build scripts |
| `functions/` | Cloudflare Pages Functions and server security boundaries | Server helpers and UI-independent shared domain modules |

The intended browser dependency direction is:

```text
main/router -> routing -> pages/layouts -> features/components -> hooks -> lib/utils -> data/types
                                      \-> experience -> data/types
```

Cloudflare handlers are a separate runtime. They must not import browser UI,
hooks, routing, or the immersive runtime. Shared content and type modules must
remain free of DOM and React dependencies.

## Composition rules

- Route modules are registered only in `src/routing/route-loaders.ts`.
- `src/lib/route-preload.ts` is a pure cache and normalization utility. It never
  imports pages.
- `RoutePreloadProvider` injects the application preloader into `PrefetchLink`.
  This prevents pages from becoming cyclic dependencies of their own links.
- Providers that render feature UI belong in `src/features/<feature>/`, not in
  `src/hooks/`. Hooks must not import rendered components.
- Generic components must not import pages or layouts.
- The Three.js runtime owns one canvas and stays behind the experience boundary.

## State and I/O ownership

- Component-local interaction state stays in the component.
- Cross-route domain state belongs in a feature Context and Provider. Keep the
  Context contract separate from the Provider when the Provider renders UI.
- Server state enters through API hooks or feature services. Presentational
  components should receive typed data and callbacks.
- Browser persistence should use `src/lib/browser-storage.ts` so blocked or full
  storage does not crash the application.
- Creative projects share `nhb-local-studio` but use separate object stores for
  editor projects, compositions, composition versions, and visual stories.
- Canvas composition image loads pass through `image-decode-queue.ts`; do not
  reintroduce unbounded `Promise.all(new Image())` decoding.
- API error bodies should use `readJsonResponse` and `getApiError` from
  `src/lib/http.ts` instead of assuming every response is valid JSON.
- Cloudflare mutations must retain the authentication, CSRF, validation, rate
  limiting, and response helpers already centralized under `functions/_*.ts`.

## Architecture gate

`npm run architecture:check` parses TypeScript and TSX imports and fails on:

- circular production dependencies;
- unresolved relative source imports;
- reverse dependencies across the layer rules above;
- reintroduction of removed compatibility packages such as
  `react-router-dom`;
- new production files over 500 lines;
- growth in a registered legacy hotspot.

The hotspot map is a debt register, not an endorsement. Its line budgets are
stored in `scripts/check-architecture.mjs`. A hotspot can be split and its entry
lowered or removed; increasing a budget requires an explicit architectural
reason and should not be used to bypass decomposition.

Current priority order for future decomposition:

1. `src/pages/PhotoEditorWorkspace.tsx`: separate editor controller, canvas
   interactions, workflow panels, and export UI.
2. `src/components/Gallery.tsx`: separate discovery state, filters, media cards,
   and lightbox coordination.
3. `src/components/BookingModal.tsx`: move API commands and each booking stage
   into the booking feature boundary.
4. `src/components/admin/AdminPhotosTab.tsx`: separate upload orchestration,
   metadata editing, and media-list presentation.

Completed decompositions:

- `src/experience/three-scene-driver.ts` is now a 404-line lifecycle module;
  texture transactions, flow materials, image decoding, and support contracts
  live in focused modules below the 500-line default budget.
- `src/components/CinematicPremiere.tsx` is below the default budget and no
  longer requires a legacy allowance.
- Editor effects now keep a stable barrel API while background, face geometry,
  and pixel/post-processing algorithms live in three sub-500-line modules.
- Public chat persistence is isolated from rendering, and editor workflow/icon
  configuration is owned by `src/data/editor-workflow.ts`.

## Content pipeline

1. Store master concept images under `source-assets/<collection>/raw/`.
2. Run `npm run assets:concept` to emit 640w, 960w, and source-size AVIF/WebP.
3. Add one `content/archive/projects/<id>/project.json` per concept project.
4. Add one `content/stories/<id>/story.json` per visual story, referencing
   archive project IDs and media indexes rather than duplicating image data.
5. `archive:build` and `stories:build` validate relationships and emit generated
   app/public manifests. Generated JSON is never hand-edited.

## Change recipes

### Add a route

1. Add the route page under `src/pages/`.
2. Add its lazy loader to `src/routing/route-loaders.ts`.
3. Add the route element to `src/router.tsx`.
4. Use `PrefetchLink` for high-intent navigation.
5. Add route, keyboard, responsive, and fallback coverage appropriate to risk.

### Add a domain workflow

1. Create `src/features/<feature>/` for orchestration and providers.
2. Keep reusable visual controls under `src/components/` until a feature owns
   them exclusively.
3. Put pure contracts in `src/types/` and algorithms in `src/lib/` or
   `src/utils/`.
4. Keep page modules focused on route composition, metadata, and layout.

### Add or change an API

1. Keep the endpoint under `functions/api/`.
2. Reuse response, auth, security, validation, and domain helpers.
3. Add lower-level function tests before wiring the UI.
4. Verify the corresponding browser workflow and failure path.

## Build and release boundaries

- `npm run verify` runs type checks, architecture checks, unit tests, full build,
  SEO generation, and performance budgets.
- `npm run verify:release` adds the complete Playwright suite.
- `build:full` updates sitemap timestamps. Revert timestamp-only output before
  staging when routes did not change.
- Playwright screenshots, traces, and `test-results` are verification artifacts,
  not release source.
- The home route must not import the legacy `pages.css` chunk. Archive, stories,
  studio, and immersive code remain route or capability lazy-loaded.
- `sw.js` and `registerSW.js` must remain `no-store/no-cache`; hashed JS, CSS,
  and image assets may be cached long-term.

## Dependency policy

- Runtime and tooling patch/minor updates are grouped weekly by Dependabot.
- `three`, `@types/three`, and `wrangler` are pinned because renderer and
  deployment changes require explicit regression testing.
- Run `npm run deps:audit` after dependency changes to check vulnerabilities and
  review every install script.
- `npm run lint` includes Knip checks for unused files and dependencies; Cloudflare
  filesystem routes and the Vite `fs` shim are declared as explicit entries.
- `@vitejs/plugin-react` remains on `6.0.3` until the npm 12 optional Babel
  peer-resolution regression in `6.0.4`/`6.0.5` is fixed upstream.
