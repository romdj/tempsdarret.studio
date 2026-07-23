# DESIGN.md — Temps d'Arrêt Studio

The design system for the public site and client portal. This is the single source of
truth for tokens, type, motion, and component structure. It **supersedes** the older
orange/terracotta + Futura/Playfair theme currently in `tailwind.config.js` (to be replaced).

Reference mockup (validated direction): concept **"L'instant retenu"** — the pause / time-freeze.

---

## 1. Concept & principles

Brand idea: **temps d'arrêt** — a pause, an instant arrested from the flow of time
(the hourglass-infinity mark). The design performs this idea rather than decorating it.

- **One idea, executed with restraint.** The signature is a single orchestrated "capture"
  moment on the hero; everything else is quiet. No scattered effects.
- **Editorial, not templated.** Asymmetric, type-forward, confident. Avoid the full-bleed-
  hero-with-centred-caption default.
- **The photograph is the subject.** Chrome is minimal; imagery carries the page.
- **Monochrome with warmth.** Black & white identity, warmed by a cream second surface.
- **Bilingual (FR primary, EN), light + dark, accessible (WCAG 2.1 AA).**

---

## 2. Color tokens

Warm-neutral palette, never pure black/white.

| Token | Hex | Role |
|-------|-----|------|
| `--espresso` | `#17130d` | warm near-black ground |
| `--cream` | `#efe7d7` | warm cream ground / second surface |
| `--paper` | `#efe9df` | text/marks on dark |
| `--ink` | `#1d180f` | text/marks on cream |
| `--muted-dark` | `#9a9184` | secondary text on dark |
| `--muted-cream` | `#7c7364` | secondary text on cream |
| `--line-dark` | `rgba(239,233,223,.15)` | hairlines on dark |
| `--line-cream` | `rgba(29,24,15,.16)` | hairlines on cream |

### Tonal roles (the theming mechanism)

Two abstract roles — **T1 (primary ground)** and **T2 (secondary ground)** — each a bundle
of `{bg, fg, muted, line, brand}`. Theme decides which tone fills which role:

- **Dark theme:** T1 = espresso, T2 = cream.
- **Light theme:** T1 = cream, T2 = espresso.

Components never reference espresso/cream directly. They use **surface classes**
(`.surf-1` → T1, `.surf-2` → T2) which expose `--bg/--fg/--muted/--line/--brand`.
A section is a surface; the page alternates them for the dark↔cream **editorial rhythm**.

Theme resolution order: `prefers-color-scheme` → `:root[data-theme]` override (user toggle wins).

Semantic colors (portal states: success/warning/error) are separate from this palette and
are not an accent — TBD when the portal UI is designed.

---

## 3. Typography

**Montserrat** (self-hosted, weights 300/400/500/600; `@fontsource/montserrat` or subset woff2).
One family; hierarchy comes from weight, size, and tracking — not a second face.

| Style | Size (clamp) | Weight | Tracking | Case |
|-------|--------------|--------|----------|------|
| Hero display | `clamp(3rem, 10vw, 8.5rem)` | 300 | `.005em` | sentence |
| Section H2 | `clamp(1.5rem, 3vw, 2.3rem)` | 300 | — | sentence |
| Index / H3 title | `clamp(1.7rem, 4.2vw, 2.9rem)` | 300 | — | sentence |
| Lead / tagline | `clamp(1.1rem, 2.4vw, 1.7rem)` | 300 | — | sentence |
| Body | `1rem` / line-height 1.7–1.8 | 400 | — | sentence |
| Eyebrow / label | `.68rem` | 500 | `.30em` | UPPER |
| Nav | `.72rem` | 500 | `.18em` | UPPER |
| Caption / timestamp | `.62–.66rem` | 500 | `.20em` | UPPER |
| "STUDIO" descriptor | `.55rem` | 500 | `.36em` | UPPER |

- Numerals in captions/timestamps/index use `font-variant-numeric: tabular-nums`.
- Headings get `text-wrap: balance`; body wraps ~60–65ch.

---

## 4. Layout & spacing

- Content max width **1280px**; gutter `clamp(1.25rem, 4vw, 3rem)`.
- Section padding vertical `clamp(3rem, 6–9vw, 8rem)`.
- Mosaic: 6-col grid, gap `clamp(.55rem, 1.3vw, 1rem)`; spans + aspect-ratio utilities
  (`3/4`, `16/10`, `1/1`) for mixed portrait/landscape.
- **Breakpoint: 900px** — nav collapses, multi-col grids → 2-col, splits stack.
- Mobile-first; the page body never scrolls horizontally (wide content scrolls in its own container).

---

## 5. Logo usage rules

- **Mark:** the vector hourglass-infinity (Logo 2). Ship as **SVG**; recolor via `currentColor`
  / CSS `mask` so it adapts to surface & theme (cream on dark, ink on cream). Hero-over-photo
  variant is always `--paper`.
- **Discreet by default.** Never a large centred stamp over imagery. Homes: header (mark +
  wordmark), hero kicker (small), footer, favicon.
- **Wordmark** is typeset in Montserrat (mark + "Temps d'Arrêt" / "STUDIO"), not an image —
  scalable, recolorable, bilingual-safe.
- Min mark size ≈ 24px; keep clear-space ≈ mark height on all sides.

---

## 6. Motion system

Purposeful, one orchestrated moment, everything else restrained. **All gated on
`prefers-reduced-motion`** — reduced users see final state instantly, no animation.

- **Hero "capture" (signature, on load):** image settles blur→sharp + slight scale-down
  (`1.7s`), headline rises line-by-line (masked, staggered ~`1s`), a hairline "time" bar
  fills left→right (`1.9s`), kicker/subtitle fade in. Fires once.
- **Scroll reveals:** sections fade up with a soft focus-pull (opacity + `translateY(28px)`
  + `blur(7px)` → 0), `~.9s`, via IntersectionObserver, once each.
- **Hover:** gallery images lift slightly and go grayscale→full color (a held moment "coming
  alive"). Captions fade in with title + timestamp.
- **Header:** transparent over hero; condenses to a solid T1 bar past ~82vh.
- Easing: `cubic-bezier(.2,.7,.2,1)`.

---

## 7. Imagery

- Mixed portrait/landscape; curated, not dumped. Default slight desaturation
  (`grayscale ~.1`) → full color on hover/focus.
- Pipeline (file-service + frontend): responsive `srcset`, **AVIF/WebP** with JPEG fallback,
  lazy-loading, low-quality blur-up placeholder (LQIP). Hero uses tuned `object-position`.
- **Timestamp motif:** captions/index carry times (`18:42`) — moments in an archive of held
  instants. A concept thread, kept small.
- **Watermark:** none on the public portfolio (keeps the editorial look); a subtle mark on
  **client-facing proofs/downloads only**, applied server-side in the **file-service** — not
  the frontend.

---

## 8. Internationalization

- **Bilingual FR (primary) / EN** from the start.
- All copy through an i18n layer — recommend **Paraglide (inlang)** for SvelteKit (type-safe,
  tree-shaken, SSR-friendly).
- **Locale lives in the URL** (`/fr/…`, `/en/…`) — decided. SEO-indexable, shareable, no
  cookie/header guessing. Root `/` redirects based on `Accept-Language` (default `fr`), then
  the URL is the source of truth.
- Header **FR/EN switch** swaps the locale segment and preserves the rest of the route.
  `lang` attribute set per locale.

---

## 9. Component inventory

Built in `src/lib/components/` (existing `ui/`, `gallery/`, plus `layout/`, `brand/`).

| Component | Purpose |
|-----------|---------|
| `Header` | fixed bar; brand lockup, nav, LangSwitch, ThemeToggle; condense-on-scroll |
| `Hero` | capture animation, kicker, display headline, time-bar, subtitle, scroll cue |
| `SommaireIndex` | numbered category list, hover thumbnail, timestamps |
| `MosaicGallery` | spanned/aspect grid, hover reveal captions |
| `AtelierBand` | cream second-surface about section |
| `SiteFooter` | brand, nav, meta |
| `Mark` / `Wordmark` | recolorable SVG mark + typeset lockup |
| `LangSwitch`, `ThemeToggle`, `Reveal` | i18n toggle, theme toggle, scroll-reveal wrapper |

Public routes already scaffolded in `src/routes/(public)/` per the sitemap; categories are
content-driven (`src/content/`).

---

## 10. Implementation notes (SvelteKit + Tailwind)

- Replace the current `tailwind.config.js` theme. Define palette + tonal roles as **CSS custom
  properties** in `app.css`; map Tailwind theme + the daisyUI `light`/`dark` themes onto those
  variables so utilities and tokens stay in sync.
- Surfaces (`.surf-1/.surf-2`) as small utilities or a `<Surface tone>` wrapper.
- Fonts self-hosted (no CDN); preload the 300/400/500 weights.
- Motion in a `Reveal` action/component; respect reduced-motion globally.

---

## 11. Decided vs. refine-later

**Decided (foundational):** monochrome+cream palette & tonal-role theming · Montserrat scale ·
light+dark · cream as second surface · bilingual FR/EN, URL-based locale routing ·
watermark-on-proofs (file-service) · discreet vector logo · the pause/capture concept ·
timestamp motif.

**Refine later (cosmetic):** exact hero photo & crop · headline wording · motion timings ·
mosaic ratios & section order · precise cream shade / grayscale amount · per-page copy.
