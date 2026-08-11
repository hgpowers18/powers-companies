# Powers Companies — Website

Pixel-faithful static build of the Powers Companies marketing redesign.

## Drop into git

Unzip at the repo root (or copy these files in). Structure:

```
index.html
styles.css
main.js
uploads/
```

## Preview locally

```bash
npx serve .
# or: python3 -m http.server 8080
```

Open the URL and check desktop + ≤860px mobile (burger nav, stacked hero, single-column grids).

## What matches the design

- Exact colors, type (DM Sans / Hanken Grotesk / JetBrains Mono), spacing, breakpoints
- Sticky nav + mobile menu
- Hero carousel (6s autoplay, 1400ms crossfade)
- “Hear our story” audio with localStorage position
- Contact form success state (client-side only — wire a backend before launch)

## Still needs client content (from handoff)

- Developments placeholder copy
- “Four divisions. One standard.” → should become two divisions
- Real LinkedIn / Facebook URLs
- Form backend + Equal Housing Opportunity mark
