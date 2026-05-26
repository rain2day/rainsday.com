# rainsday.com

Personal portfolio for interface design, iOS app development, and experimental
creative tools. Live at **https://rainsday.com**.

## Stack

- Pure HTML / CSS / vanilla JS (no build step) — deployed via GitHub Pages
- [Remotion](https://www.remotion.dev/) for the cinematic section signal videos

## Structure

```
.
├── index.html              # Single-page site
├── styles.css              # Theme + layout + interaction styles
├── script.js               # Cursor, magnetic, tilt, reveal, gallery, sound, particles
├── assets/                 # Images and section signal videos
├── remotion/               # Remotion compositions (see remotion/README.md)
└── CNAME                   # Custom domain for GitHub Pages
```

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
