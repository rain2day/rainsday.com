# rainsday.com

Personal portfolio for interface design, iOS app development, and experimental
creative tools. Live at **https://rainsday.com**.

## Stack

- Pure HTML / CSS / vanilla JS (no build step) — deployed via GitHub Pages
- [Remotion](https://www.remotion.dev/) for the cinematic section signal videos

## Structure

```
.
├── index.html              # V1 — cyber/orange portfolio
├── styles.css
├── script.js               # V1 — Cursor, magnetic, tilt, reveal, gallery, sound, particles
├── assets/                 # V1 images and section signal videos
├── v2/                     # V2 — editorial Japanese resume (rainsday.com/v2/)
│   ├── index.html
│   ├── styles.css          # washi · sumi · shu palette · Mincho display
│   ├── script.js           # sumi cursor, magnetic, tilt, reveal
│   └── assets/             # 4 Remotion-rendered ink videos
├── v3/                     # V3 — cinematic field index (rainsday.com/v3/)
│   ├── index.html
│   ├── styles.css          # wide-card landscape cover, menu/social/resource index
│   └── script.js           # cursor, pointer light, magnetic CTA
├── jlpt/                   # JLPT Grammar Lab (rainsday.com/jlpt/)
│   ├── index.html
│   └── jlpt-data.js
├── remotion/               # Remotion compositions (see remotion/README.md)
└── CNAME                   # Custom domain for GitHub Pages
```

Versions cross-link in their headers (`V1 ↗` / `V2 ↗` / `V3 ↗`). The JLPT
lab is a standalone study tool and can be opened directly at `/jlpt/`.

## Local preview

```bash
python3 -m http.server 8765
# open http://127.0.0.1:8765
```

## Re-render signal videos

```bash
cd remotion
npm install     # one-time
npm run render:all
```

See [remotion/README.md](remotion/README.md) for per-composition details.
