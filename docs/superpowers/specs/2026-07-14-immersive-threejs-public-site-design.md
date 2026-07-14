# Immersive Three.js Public Site Design

## Goal

Turn every public-facing route into a coherent, production-grade 3D portrait
experience that feels technically exceptional without making booking, browsing,
or editing slower or less reliable. The experience must remain unmistakably a
Nanjing portrait studio: real photography is always the subject, while 3D depth,
camera mechanics, and motion provide the presentation system.

The working visual name is **Optical Darkroom Universe**.

## Approved Direction

The approved direction is the most ambitious option: one shared Three.js world
that morphs between route-specific scenes across the complete public site.

It extends the existing **Nanjing Portrait Field Notes** design rather than
replacing it:

- Editorial grids, issue numbers, real locations, and field-note metadata remain
  the readable DOM layer.
- A spatial darkroom adds floating contact sheets, lens markings, shutter blades,
  focus guides, and photographic depth.
- Camera-instrument details add technical precision without turning the site into
  a generic sci-fi interface.
- Real gallery photographs stay crisp and inspectable. Effects never hide faces,
  crop away the product, or reduce the site to atmosphere.

There are no decorative glow orbs, generic particle clouds, glass-card stacks,
CSS gradient heroes, autoplay audio, scroll hijacking, or 3D-only commands.

## Scope

The immersive system covers anonymous and customer-facing routes:

- Home, gallery, and photo detail.
- Courses and course detail.
- Presets/products and preset detail.
- Workshops and workshop detail.
- Shop and shop detail.
- Booking, map, comparison, login, photo editor, and public boundary states.

The authenticated dashboard and admin remain quiet operational tools. They share
the route transition and design tokens, but do not keep a live WebGL scene behind
tables, forms, or management workflows.

The map and photo editor receive an immersive route entrance, then suspend the 3D
renderer while Leaflet, image processing, or face detection is active. This keeps
the public experience coherent without making two GPU-heavy systems compete.

## Visual System

### Spatial Materials

- Portrait planes behave like mounted prints or negatives, with physical depth
  and restrained edge lighting.
- Thin line geometry reproduces contact-sheet frames, crop marks, focal scales,
  map coordinates, and exposure readouts.
- Shutter-blade geometry supplies route transitions and focused reveals.
- Matte ink, newsprint, moss, coral, and sun-note materials reuse the established
  color tokens. The 3D scene does not introduce a neon palette.
- Film grain remains a lightweight 2D overlay. It is not duplicated as expensive
  full-screen post-processing noise.

### Depth Rules

- Important photographs stay near the focal plane and remain readable.
- Supporting frames may move in depth, but never cross over DOM text or controls.
- Perspective is strongest in the hero and route transitions, then settles as the
  user reaches task-focused content.
- Pointer movement changes the camera by a small bounded amount. Scroll advances
  the camera without changing native document scroll distance.
- Coarse pointers use scroll and timed settling only; device orientation is not
  requested.

## Route Scene Matrix

### Home

The first viewport becomes a full-bleed portrait tunnel. Three real photographs
sit at different focal distances, a mechanical aperture frames the initial view,
and scroll moves the camera through the contact sheet into the existing editorial
story. The brand, booking action, and gallery action remain semantic DOM content.

### Gallery

The hero is a spatial contact-sheet archive. Photo planes reorganize by category
when the DOM filter changes. The searchable gallery remains the primary workflow;
the 3D layer previews the current collection and never replaces filtering,
pagination, or accessible links.

### Photo Detail

The selected image occupies a large focal plane with subtle depth separation.
Metadata aligns to optical measurement lines. Related images appear behind the
main plane and settle into the existing contact sheet as the user scrolls.

### Catalogue Indexes

Courses, presets, workshops, and shop share one optical-machine family with a
different route preset:

- Courses use focus rails and lesson frames.
- Presets use RGB separation plates and before/after planes.
- Workshops use route lines, date markers, and location frames.
- Shop uses a restrained rotating product rail built from real product media.

The catalogue grid remains a normal DOM list with stable geometry and direct
links. The scene responds to the highlighted item but is not required to operate
the catalogue.

### Catalogue Details

Detail routes use one dominant media plane and a route-specific instrument layer.
Price, capacity, schedule, purchase, and registration controls stay in the DOM.
The renderer drops to an idle frame rate after the hero leaves the viewport.

### Booking

A shutter opens through the booking stages. The active step changes aperture
depth and focus markings, while the form, calendar, time slots, errors, payment,
waitlist, and confirmation remain unchanged semantically. WebGL pauses whenever
a booking dialog needs uninterrupted keyboard or screen-reader interaction.

### Map

The route entrance uses spatial coordinate lines and place photographs. Once the
interactive Leaflet map enters the viewport, the Three.js loop suspends completely
until the map is no longer active.

### Compare

Two image planes align like a precision enlarger. The DOM comparison slider stays
authoritative and updates a restrained spatial split. Reduced-motion and fallback
tiers use the existing 2D comparison stage unchanged.

### Login

Login receives a single slow portrait plane and focus scale behind the unframed
form. The scene is non-interactive, low density, and pauses while a field is
focused on constrained devices.

### Photo Editor

The editor route begins with a short lens-calibration transition. The renderer is
then suspended and releases transient textures before the editing canvas or
face-api chunk loads. No 3D element overlays the editing workspace.

### Boundary States

The public 404 and recoverable route failures use an empty contact-sheet frame and
one optical coordinate marker. Recovery actions remain ordinary links or buttons.
A renderer failure falls back to the existing static editorial boundary rather
than presenting another error message.

## Runtime Architecture

### Dependency Decision

Add `three` as the only new production rendering dependency. Do not add
`@react-three/fiber`, `@react-three/drei`, a post-processing package, a physics
engine, or an external shader library. Raw Three.js keeps renderer lifetime,
resource disposal, route morphing, and bundle boundaries explicit.

The existing architecture test that prohibits Three.js must be replaced with a
contract that requires the dependency to stay inside the lazy immersive chunk.
Three.js must not enter the initial application bundle.

### Module Boundaries

The implementation uses focused modules under `src/experience/`:

- `capability-tier.ts` selects static, medium, or high quality from motion,
  connection, viewport, hardware, and WebGL signals.
- `scene-presets.ts` maps route families to camera, geometry, color, density, and
  transition parameters.
- `texture-pool.ts` loads, reuses, bounds, and disposes same-origin photo textures.
- `optical-geometry.ts` creates reusable frames, crop marks, focus rails, and
  shutter geometry.
- `immersive-renderer.ts` owns the single renderer, scene, camera, animation loop,
  context-loss handling, adaptive quality, and full disposal.
- `experience-store.ts` carries route, scroll, pointer, visibility, modal, map,
  and editor activity without forcing React renders on every animation frame.
- `ImmersiveExperience.tsx` is the lazy React boundary mounted once by
  `RootLayout` on eligible routes.
- `ImmersiveAnchor.tsx` lets page heroes publish their bounds, preset, images, and
  normalized scroll progress to the shared renderer.

No page imports Three.js directly. Pages provide declarative scene descriptors and
remain fully functional if the immersive chunk never loads.

### Renderer Lifecycle

The renderer has explicit states:

1. `static`: capability checks prohibit WebGL; no canvas is created.
2. `booting`: lazy chunk and up to three hero textures are prepared.
3. `active`: hero or route transition is visible and renders at the tier target.
4. `idle`: the scene is outside the hero and renders only on meaningful changes.
5. `suspended`: tab hidden, reduced motion changed, modal active, map active, or
   editor processing active; no animation frames are requested.
6. `disposed`: root layout unmounted or a permanent context failure occurred; all
   materials, geometries, textures, listeners, and the WebGL context are released.

Route changes morph the existing scene. They do not create another renderer or
temporarily stack canvases.

## Data Flow

1. `RootLayout` publishes the current location and global pause reasons.
2. The active page publishes an immersive anchor with a route preset and a small
   ordered list of existing public-photo URLs.
3. The capability tier clamps image count, geometry density, DPR, and animation
   frequency before resources load.
4. The texture pool resolves responsive, same-origin assets and reuses textures
   when routes share a photograph.
5. Native scroll, pointer movement, filter selection, and route changes update the
   store. The renderer reads the store inside its frame loop without React state
   churn.
6. DOM content remains the source of truth for navigation, selection, form state,
   accessibility, analytics, and SEO.

## Interaction Model

- Route transitions use a 320-480ms shutter movement and never become a blocking
  loading cover.
- Scroll drives bounded camera position and depth. It never pins the full page,
  changes wheel distance, or prevents touch scrolling.
- Pointer parallax is capped at 1.5 degrees and eases back to neutral.
- Hover and keyboard focus on DOM catalogue items publish the same highlighted ID
  to the scene.
- Selecting a filter morphs existing planes instead of rebuilding the renderer.
- Booking dialogs, navigation drawers, lightboxes, and chat panels publish pause
  reasons so the animation loop cannot compete with focused interactions.
- Every command remains available through visible DOM controls. The canvas is
  `aria-hidden` and never becomes the only interaction target.

## Adaptive Performance

### Capability Tiers

`static` is mandatory when any of these are true:

- `prefers-reduced-motion: reduce`.
- Data Saver is enabled.
- WebGL creation fails or the context is permanently lost.
- Automated browser policy explicitly disables GPU rendering.

`medium` is used for narrow viewports, coarse pointers, or constrained hardware.
It keeps the main depth composition but lowers texture count, geometry density,
DPR, and animation frequency.

`high` is reserved for capable desktop devices. Hardware signals are hints rather
than absolute truth; measured frame time can only downgrade a session, never
upgrade it unexpectedly.

### Budgets

- Initial application JavaScript may increase by no more than 5 KB gzip.
- The complete lazy immersive chunk must remain at or below 190 KB gzip.
- High tier uses at most 10 photo planes and 48 MB estimated texture memory.
- Medium tier uses at most 6 photo planes and 24 MB estimated texture memory.
- High-tier DPR is capped at `1.5`; medium at `1.25`.
- At most three route-critical textures load before interaction. Everything else
  is idle-loaded and cancellable.
- High-tier active animation targets 60 fps with p95 frame time at or below 20ms
  during the acceptance trace.
- Medium tier targets at least 45 fps with p95 frame time at or below 28ms.
- Sustained frame time above 34ms triggers an immediate density and DPR downgrade.
- When the immersive anchor is outside the viewport, rendering becomes event-led
  or pauses. Hidden tabs request zero animation frames.
- There is never more than one live WebGL context.

Image URLs use existing AVIF/WebP responsive assets. Textures are resized to the
maximum displayed size for the selected tier rather than uploading original-size
photographs to the GPU.

## Failure Handling

- WebGL initialization failure produces the current static photographic hero with
  no error toast and no blank canvas.
- A `webglcontextlost` event cancels the loop and prevents default browser churn.
  One controlled restoration attempt is allowed; repeated loss locks the session
  to the static tier.
- Failed textures become an ink contact-sheet frame while the DOM image continues
  to use `ImageWithFallback`.
- Route changes abort obsolete texture requests and ignore stale completions.
- Renderer errors are contained by the lazy experience boundary and must never
  unmount route content, navigation, booking, or account access.
- Disposal tests verify that geometries, materials, textures, observers, media
  queries, and event listeners are released.

## Accessibility

- Canvas output is supplementary and marked `aria-hidden="true"`.
- Headings, links, buttons, forms, filters, errors, and live regions stay in the
  DOM and retain their current semantics.
- Keyboard focus publishes visual highlights to the scene but never moves focus
  into WebGL.
- Reduced-motion mode creates no renderer and shows stable, high-quality imagery.
- Text contrast is evaluated against the actual frame behind it. Heroes use a
  controlled solid scrim when a photograph would reduce contrast.
- Route transitions never delay focus placement or screen-reader announcements.
- Canvas and fixed layers use `pointer-events: none` unless a mirrored DOM control
  owns the interaction.

## Responsive Behavior

- Desktop receives the complete spatial composition when the high tier is earned.
- Tablet uses the medium composition with fewer overlapping planes and shallower
  camera travel.
- Mobile preserves one dominant portrait, one supporting plane, shutter geometry,
  and scroll depth. It does not attempt the desktop scene at a smaller scale.
- Public heroes continue to reveal part of the next section in the first viewport.
- The persistent mobile navigation, booking actions, chat, and scroll control stay
  above the canvas without overlap.
- Orientation changes recalculate bounds without creating a new renderer.

## Testing Strategy

### Source and Unit Tests

- Route-to-preset mapping and public/private eligibility.
- Capability tier selection for motion, data saver, WebGL failure, viewport, and
  hardware combinations.
- Adaptive downgrade thresholds and one-way tier changes.
- Texture-pool reuse, eviction, abort, and disposal.
- Renderer state transitions, pause reasons, context loss, and final disposal.
- Architecture contract proving Three.js stays behind a lazy dynamic import.

### Browser Tests

- Normal-motion rendering at `375`, `430`, `768`, `1024`, `1440`, and `1920`.
- Reduced-motion and forced-WebGL-failure static fallbacks.
- Canvas pixel sampling proves each required scene is nonblank and not a single
  flat color.
- Screenshot review verifies framing, real-photo visibility, text contrast, route
  transitions, and no overlap with controls.
- Pointer, scroll, touch, keyboard focus, filters, lightbox, booking, map, compare,
  login, and editor flows remain functional.
- Route cycling verifies one canvas/context and stable memory-oriented resource
  counts.
- Console, page-error, failed-request, and WebGL warning capture stays empty.
- Frame-time traces verify the high and medium acceptance budgets.

### Release Gates

- Type checking and the full unit suite.
- Production build, bundle analysis, and updated performance budget.
- Complete Playwright suite plus new 3D acceptance tests.
- Six-width desktop/mobile screenshots and canvas-pixel evidence.
- Local normal-motion, reduced-motion, and low-capability checks.
- Exact commit scope, push to `main`, successful GitHub Actions, Cloudflare
  production deployment, custom-domain asset verification, and live browser QA.

## Delivery Boundaries

Implementation is staged so each slice remains releasable:

1. Shared runtime, adaptive tiers, route transition, home, gallery, and photo
   detail.
2. Catalogue indexes and detail routes.
3. Booking, map, compare, login, editor entrance, boundary states, final tuning,
   and production acceptance.

Each stage must preserve the static fallback and existing workflows. A stage is
not complete merely because a scene renders; it must meet frame, accessibility,
responsive, regression, and cleanup gates.

## Success Criteria

The work is complete only when:

- Every public route has a coherent route-specific immersive treatment or the
  intentionally suspended tool treatment described above.
- Real portrait or product imagery remains the first visual signal.
- High and medium tiers meet their measured frame-time budgets.
- Low-capability and reduced-motion users receive a complete static experience.
- No route requires WebGL for navigation, reading, booking, purchasing, or editing.
- One renderer survives route changes without duplicate contexts or leaked GPU
  resources.
- Existing tests and workflows remain green.
- GitHub CI, Cloudflare production, the custom domain, and the health endpoint are
  verified after push.
