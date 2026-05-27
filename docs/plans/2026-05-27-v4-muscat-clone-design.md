# V4 — muscat-style layout clone — design

**Date:** 2026-05-27
**Path:** `v4/` (live at `rainsday.com/v4/`)
**Reference:** muscatgroup.co.jp (layout + motion only — no copy/asset lift)

## Scope

A 1:1 **layout + motion** re-creation of muscatgroup.co.jp's homepage under
`rainsday.com/v4/`, populated with RaIN-themed placeholder copy and slotted
image paths that the user replaces post-build. Original Japanese copy and
images are NOT copied — only the layout, grid, typography style, color
language and motion patterns are emulated.

## Cross-version wiring

V1 header already cross-links V2 / V3. Add `V4 ↗` button to the same
`.header-end` cluster in `index.html`.

## File structure

```
v4/
├── index.html        — 8 sections, all motion hooks (data-*)
├── styles.css        — lime + ink + paper palette, bold sans display
├── script.js         — bento field, scroll reveal, magnetic, tilt
└── assets/           — user-provided images (slot paths inventoried below)
```

## Section breakdown (mirrors muscat 1:1)

| § | Section | Content slots | Motion |
|---|---|---|---|
| 1 | Hero | RaIN slogan + portrait + Pick Up card | Live JS bento pixel field + line-reveal headline + card slide-in |
| 2 | We are | 6-tile product photo bento + display wordmark + tagline | Scroll-reveal tiles staggered |
| 3 | Project | Horizontal card carousel of RaIN's iOS apps (expenseCal, Love Contract, …) | Card hover tilt + reveal |
| 4 | People / Approach | Left title + right green grid + 4 floating bento tags (DESIGN / iOS / VIBE CODE / AUTOMATION) | Bento tag stagger pop |
| 5 | Brand Produce + Partner | Split — left thumbnails, right partner logo wall | Card hover |
| 6 | News | Minimal date + headline list with arrow | Hover translateX |
| 7 | IR + Recruit | Two big lime green cards over repeating wordmark bg | Section enter pulse |
| 8 | Footer | rainsday.com logo, HK address, nav repeat, social, Contact CTA | — |

## Asset slot inventory (user provides post-build)

| Path | Size | Use |
|---|---|---|
| `assets/hero-portrait.{jpg,webp}` | 1200×1500 | Hero subject |
| `assets/about-tile-{1-6}.jpg` | 800×800 | We are bento grid |
| `assets/project-{1-4}.jpg` | 1600×900 | Project carousel cards |
| `assets/people-bento-{1-4}.jpg` | 600×600 | People floating tags |
| `assets/produce-{1-3}.jpg` | 800×1000 | Brand Produce thumbnails |
| `assets/partner-logos.svg` | sprite | Brand Partner wall |
| `assets/footer-wordmark.svg` | optional | Footer bg wordmark |

## Color tokens

```css
--lime:  #34ff00;   /* accent + bento + section cards */
--ink:   #0a0a0a;   /* primary text, square bullets */
--paper: #ffffff;
--mute:  #f4f4f4;
--line:  rgba(10,10,10,0.08);
```

## Typography

- Display: Inter / Helvetica Neue 700/900, big bold sans
- Body: Inter 400/500
- Mono accent (caption labels): JetBrains Mono 500

## Motion tech

**Hero bento pixel field — Live JS (DOM-based):**
- ~100 absolutely-positioned `<span>` squares inside `.hero-field`
- Randomized x/y/size (8-32px) / hue variant (lime + white + ink)
- Stagger pop-in on load: scale 0 → 1, opacity 0 → 1, random 0-1500ms delay, easeOutBack
- ~10% idle-pulse (opacity oscillate over 4s loop)
- Mouse parallax ±10px on field container

**Section reveal:**
- IntersectionObserver flips `.is-revealed` on `[data-reveal]` and `[data-reveal-stagger]` elements
- Line-mask reveal for headings (translateY 105% → 0 within `overflow: hidden`)

**Interactive bits:**
- `[data-magnetic]` — buttons / CTAs translate toward cursor (strength 0.3)
- `[data-tilt]` — cards / portrait perspective rotate ±6°
- News list rows — pure CSS hover translateX + arrow reveal

**Remotion (deferred, not in this delivery):**
- Out of scope for the initial v4 ship. May add later as ambient section
  signal videos for We are / Project / People sections, similar to how
  V1 uses `signal-mission.mp4` etc.

## Accessibility

- `<html lang="en">`, sections wrapped in `<section aria-labelledby>`
- Skip-link to `#main`
- `prefers-reduced-motion: reduce` → disable bento field motion, headline
  reveal becomes instant
- All decorative elements `aria-hidden="true"`

## Deliverables

1. `v4/index.html` — full 8-section structure with motion data-attributes
2. `v4/styles.css` — full styling, palette + typography + responsive
3. `v4/script.js` — bento field generator + reveal + magnetic + tilt
4. `v4/assets/` — placeholder directory
5. `index.html` (V1 root) — add `V4 ↗` cross-link in header
6. Commit + push → Pages rebuild → live at `rainsday.com/v4/`

## Validation

- Local preview at `:8765/v4/`
- Puppeteer screenshots at 1440×900 + mobile 375×812
- Lighthouse a11y ≥ 95
- Manual: cursor magnetic feel, bento field load animation, reveal cadence
