# Remotion compositions for rainsday.com

Four cinematic compositions render the section atmospheres used in `index.html`.

## Compositions

| ID | Output | Used by |
| --- | --- | --- |
| `HeroSignal` | `../assets/hero-bg-new.mp4` (1920×1080, 12s) | optional hero swap |
| `MissionSignal` | `../assets/signal-mission.mp4` (1920×640, 10s) | `#mission` section |
| `ProductSignal` | `../assets/signal-product.mp4` (1920×640, 10s) | `#product` section |
| `CampaignSignal` | `../assets/signal-campaign.mp4` (1920×640, 10s) | `#campaign` section |

## Scripts

```bash
cd remotion
npm install              # one-time
npm run studio           # interactive preview
npm run render:mission   # render single composition
npm run render:all       # render all four
```

## Swap hero background

The current `assets/hero-bg.mp4` is the cyber-techwear model footage. To use the
abstract Remotion HeroSignal instead, change `index.html`:

```html
<source src="assets/hero-bg-new.mp4" type="video/mp4">
```

…and the still fallback `assets/hero-rainsday.png` remains the poster.

## Edit a composition

Compositions live under `src/compositions/`. Tweak colors, particle counts, or
durations, then re-render with the matching `render:` script.
