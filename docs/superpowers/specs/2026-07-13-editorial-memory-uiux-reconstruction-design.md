# Editorial Memory UI/UX Reconstruction Design

## Goal

Reconstruct the complete portrait-booking product as a portfolio-grade digital
experience that feels specific to a young Nanjing portrait studio. Preserve every
existing business workflow while making the public site, account workspace,
editor, and admin surfaces feel like one deliberately art-directed product.

## Approved Direction

The approved direction combines two concepts:

- **A: Nanjing youth portrait journal** provides the structure: real portraits,
  editorial grids, contact-sheet numbering, place and season metadata, and a
  disciplined publication rhythm.
- **C: intimate field notes** provides restrained emotional detail: handwritten
  captions, paper texture, taped-note geometry, and small personal annotations.

A remains dominant. C is never allowed to turn the product into a cute scrapbook,
an illustrated diary, or a pile of decorative cards.

## Brand Impression

The first impression is "a photographer's current Nanjing field journal that can
also be booked." It should feel observant, warm, contemporary, and trustworthy.
The user should remember the contact-sheet composition, numbered editorial labels,
and the contrast between documentary photography and handwritten notes.

The visual name for the system is **Nanjing Portrait Field Notes**.

## Visual Memory Point

Every surface uses a small editorial coordinate system:

- `NHB / 01` style issue numbers.
- Location and date metadata aligned to thin rules.
- Contact-sheet frame corners around important images.
- A handwritten annotation used once per viewport, not on every component.
- A two-color accent relationship: moss green for trust and navigation, coral for
  action and human warmth.

These elements are tied to portrait sessions and place-based storytelling. There
are no glow orbs, generic particles, glass panels, or decorative gradients.

## Color System

The default light theme uses:

- Ink: `#17201b`
- Newsprint: `#f4f0e7`
- Paper: `#fffdf8`
- Moss: `#355c4b`
- Moss dark: `#234336`
- Coral: `#d95f4b`
- Coral dark: `#ad3f31`
- Sky note: `#b9d7dc`
- Sun note: `#e6c867`
- Muted text: `#667069`
- Hairline: `rgba(23, 32, 27, 0.18)`

Dark mode becomes an ink-room interpretation rather than a brown inversion:
charcoal green-black surfaces, warm paper text, desaturated moss, and controlled
coral. Semantic success, warning, error, and info colors retain WCAG contrast and
are never conveyed by color alone.

## Typography

- Display and page titles use a Song-style Chinese serif stack with Georgia for
  Latin text. They are editorial, compact, and never scaled with viewport width.
- Body and controls use the existing system sans-serif stack for clarity.
- The local `Naihuangbao WenKai` font is restricted to short handwritten notes.
- Numeric prices, issue numbers, times, and metrics use tabular numerals.
- Headings use explicit responsive breakpoints rather than `vw` font sizing.
- Letter spacing remains `0`; uppercase English is used only for tiny issue labels.

## Layout System

- Content width: `min(100% - 48px, 1360px)` on desktop and `100% - 32px` on
  mobile.
- Editorial grid: 12 columns on large desktop, 8 on tablet, 4 on mobile.
- Public page heroes occupy 55-72 percent of the first viewport and always reveal
  the next section.
- The home hero uses a full-bleed real portrait/contact sheet. Text sits directly
  over a controlled solid scrim, not inside a card.
- Repeated items may be cards. Page sections remain unframed full-width bands.
- Cards use 0, 4, or 8px radii. Pill shapes are limited to status indicators and
  segmented controls.

## Image Direction

Only the authorized local gallery assets are used as primary imagery. Their
four-frame collage construction becomes an intentional contact-sheet motif rather
than being hidden behind small thumbnails. Images use declared aspect ratios,
meaningful alt text, AVIF/WebP sources where supported, lazy loading below the
fold, and stable fallback states.

The home hero prioritizes `gallery-jiangnan-01` and `gallery-urban-01`. Supporting
routes rotate through all six collections so the product does not repeat one hero
everywhere.

## Navigation

Desktop navigation is a quiet publication masthead:

- Brand seal and full brand name on the left.
- Six primary routes in the center.
- Account and booking actions on the right.
- Language, theme, and mood controls move into one accessible utility menu.

Mobile navigation uses a compact top masthead plus a five-destination bottom rail.
The chat launcher is positioned above the rail without covering it. The full menu
is a true drawer with focus trapping, current-route state, account actions, and
utility controls.

## Motion Language

- Entrance: a short 420-620ms editorial reveal with a clipped image edge and text
  settling by 12-18px.
- Navigation: an ink-line indicator moves between routes.
- Press: controls compress by at most 1px or 0.985 scale.
- Dialogs and drawers: spatial slide plus opacity with clear origin.
- Lists: only added, removed, or filtered items animate.
- Images never float continuously and there is no universal fade-in treatment.
- `prefers-reduced-motion` disables all non-essential movement and smooth scroll.

The mandatory multi-second loading cover is removed. Route loading uses a stable,
inline editorial skeleton so content is never artificially blocked.

## Public Pages

### Home

The first viewport is a full-bleed contact-sheet hero with the brand name as H1,
one concise positioning statement, booking CTA, gallery CTA, and issue metadata.
The next gallery strip remains visible. Subsequent sections alternate paper and
ink bands, use asymmetric editorial grids, and reduce repeated card treatments.

### Gallery and Photo Detail

Gallery filters become a clear toolbar with selected state, result count, and
44px touch targets. The masonry/list rhythm uses varied but stable aspect ratios.
Photo detail treats the image as the primary canvas, keeps actions adjacent to the
work, and presents related stories as a contact sheet rather than nested cards.

### Courses, Presets, Workshops, and Shop

Each index uses a route-specific image, issue label, concise task-focused hero,
and a scan-friendly catalogue grid. Loading, empty, and API failure states share
the same editorial state component with explanation and recovery action. Detail
routes use a consistent media/detail split that becomes a single-column purchase
flow on mobile.

### Booking

Booking is the conversion-focused route. Package choice, date, time, contact,
payment, confirmation, waitlist, and offline recovery are visually sequenced as a
numbered appointment sheet. The primary action remains visible without obscuring
fields. Errors explain the next action and focus the affected field.

### Map and Compare

Map search and results form one operational surface with a compact list/map
relationship. Compare uses a stable image stage, labeled handles, and readable
controls at every viewport.

## Account and Operational Surfaces

### Login and Registration

Authentication uses a full-height portrait background with an unframed paper
form plane. Mode switching is a segmented control, fields retain labels, password
recovery remains visible, and server errors are announced.

### Dashboard

The existing workspace navigation and data contracts remain unchanged. Styling
becomes denser and editorial: a clear left rail, tabular metrics, action-first
empty states, consistent badges, and mobile horizontal navigation with 44px
targets.

### Editor

The editor remains a focused tool. It uses neutral working surfaces, compact icon
controls with tooltips, stable canvas dimensions, and a clear export hierarchy.
Decorative public-site texture is removed from the canvas area.

### Admin

Admin becomes a quiet operational publication desk: strong table hierarchy,
tabular numbers, consistent toolbar controls, semantic statuses, accessible
dialogs, and responsive table fallbacks. It shares tokens with the public site but
uses higher information density.

## Boundary States

Loading, empty, no-result, partial error, offline, unauthorized, failed image,
toast, dialog, 404, and PWA states all use the same hierarchy:

1. Semantic icon or numbered marker.
2. Direct title.
3. Specific explanation.
4. Primary recovery action when one exists.
5. Secondary route or dismiss action when useful.

No state is represented by a blank viewport, generic "system error," or a dead
button.

## Accessibility

- Heading order and landmark semantics are preserved or corrected.
- Every icon-only control has an accessible name and at least a 44px target where
  touch input is expected.
- Focus rings use a high-contrast moss/coral double ring and are never removed.
- Drawers, dropdowns, and dialogs trap focus, close with Escape, and return focus.
- Form errors are associated with fields and announced through live regions.
- Contrast is checked in both themes.
- Reduced-motion behavior is verified in the browser.

## Performance

- Remove the blocking `LoadingScreen` and its page-load GSAP import.
- Preserve route-level code splitting and route-specific CSS loading.
- Keep image dimensions stable and prioritize only the first hero image.
- Avoid new runtime dependencies and external image/font requests.
- Prefer CSS transform and opacity for motion.
- Keep the existing bundle and performance budgets green.

## Responsive Acceptance

The final browser review covers `375`, `430`, `768`, `1024`, `1440`, and `1920`
pixel widths. At every width:

- No horizontal overflow or text clipping.
- No fixed control obscures another fixed control or primary action.
- Primary content appears in the first viewport.
- Touch targets are at least 44px where applicable.
- Hero imagery remains legible and does not hide the subject.
- The next section is visible below public page heroes.

## Success Evidence

Completion requires source tests, type checking, the full unit suite, production
build and performance gates, Playwright end-to-end flows, six-width screenshots,
keyboard and reduced-motion checks, console/network inspection, final diff review,
push to `main`, successful GitHub Actions, and live Cloudflare verification.

