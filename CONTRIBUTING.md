# Contributing

## Prerequisites

- Node.js 22.22 or newer
- npm 11 or newer
- Cloudflare credentials only for remote D1, R2, or Pages operations

## Local workflow

```bash
npm install
npm run dev
```

Before committing a normal change:

```bash
npm run lint
npm run test
npm run build
```

Before a production release:

```bash
npm run verify:release
npm audit --omit=dev --audit-level=high
```

## Where code belongs

| Change | Location |
| --- | --- |
| Route composition and SEO | `src/pages/` |
| Cross-component domain workflow | `src/features/<feature>/` |
| Reusable visual component | `src/components/` |
| Reusable state without rendered UI | `src/hooks/` |
| Pure browser-independent logic | `src/lib/` or `src/utils/` |
| Shared model or static default | `src/types/` or `src/data/` |
| Archive or story source content | `content/archive/` or `content/stories/` |
| Versioned concept source image | `source-assets/<collection>/raw/` |
| Three.js resources and lifecycle | `src/experience/` |
| Cloudflare endpoint | `functions/api/` |
| Shared server security or domain logic | `functions/_*.ts` |

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before introducing a new
top-level folder or cross-layer import.

## Change discipline

- Keep route pages as composition modules, not service containers.
- Do not add a rendered component to `src/hooks/`.
- Do not import pages from components, hooks, libraries, data, or server code.
- Do not increase a legacy file budget to make a check pass. Split ownership.
- Do not bypass `publicMutationHeaders`, server validation, or auth helpers.
- Keep unrelated working-tree files out of commits.
- Do not hand-edit `package-lock.json`; update it through npm.
- Add a regression test for every fixed bug before or with the fix.

## Verification by risk

| Change | Minimum verification |
| --- | --- |
| Pure utility or data model | Targeted unit tests, `npm run lint` |
| Shared hook or component | Unit tests, relevant E2E, production build |
| Routing, providers, auth, booking, or storage | Full unit suite and full E2E |
| Three.js, editor, or media pipeline | Full E2E plus performance budget |
| Dependency or build configuration | Audit, type check, full build, smoke test |
| PWA or deployment headers | Built worker inspection and live response check |

## Generated output

The following commonly change during verification and should only be committed
when intentional:

- `public/sitemap.xml` and `public/sitemap-index.xml`
- `src/data/*.generated.json`, `public/archive-manifest.json`, and `public/story-manifest.json`
- `dist/`
- `test-results/`
- `.playwright-cli/`
- `output/`
- release screenshots

## Definition of done

- The change has a clear owner and respects dependency direction.
- Failure, loading, offline, reduced-motion, and narrow viewport behavior remain
  usable where relevant.
- Tests and architecture checks pass locally.
- The production build and performance budget pass.
- The commit contains no unrelated generated artifacts or local secrets.
- After pushing, GitHub Actions and the live deployment are checked before the
  release is reported complete.
