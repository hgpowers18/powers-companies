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

Open the URL and check desktop + ≤860px mobile (burger nav, full-height video hero, single-column grids).

## Hero background video

The hero plays a muted, looping video full-bleed behind the headline. The page
expects the file at:

```
uploads/powers-hero-background-v3.mp4
```

That file is **not** in the repo — drop your copy in and the hero picks it up.
Until then (or if it 404s, or playback is skipped) the hero shows
`uploads/hero-poster.jpg` instead, so the page never renders empty.

### Encoding a web-ready loop

Silent, 1080p, `faststart` so playback can begin before the whole file lands.
Aim for under ~6 MB — a 8–12 second loop at CRF 26 usually gets there:

```bash
ffmpeg -i powers-hero-background-v3.mp4 \
  -vf "scale=1920:-2" -r 25 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 \
  -movflags +faststart -an \
  uploads/powers-hero-background-v3.mp4
```

Regenerate the poster from a frame of the video so the handoff to playback is
invisible (pick a timestamp near the start):

```bash
ffmpeg -ss 0.5 -i uploads/powers-hero-background-v3.mp4 -frames:v 1 -q:v 5 uploads/hero-poster.jpg
```

### Optional smaller file for phones

Encode a 720p version and point the hero at it — `main.js` uses it below 760px
and falls back to the main file everywhere else:

```bash
ffmpeg -i powers-hero-background-v3.mp4 -vf "scale=1280:-2" -r 25 \
  -c:v libx264 -pix_fmt yuv420p -crf 28 -movflags +faststart -an \
  uploads/powers-hero-background-v3-mobile.mp4
```

Then add the attribute to the `<video id="hero-video">` tag in `index.html`:

```html
data-src-mobile="uploads/powers-hero-background-v3-mobile.mp4"
```

### How playback behaves

- Autoplays `muted` + `playsinline`, which is what iOS and Android require; if a
  browser gates autoplay behind a gesture, it retries on first touch.
- Pauses when the hero scrolls off screen or the tab is backgrounded.
- Never downloaded at all when the visitor has Reduce Motion on, has Save-Data
  enabled, or is on a 2G connection — those visitors just get the poster.

## What matches the design

- Exact colors, type (DM Sans / Hanken Grotesk / JetBrains Mono), spacing, breakpoints
- Sticky nav + mobile menu — transparent over the hero video, solid past the fold
- Full-height hero video with the stats bar across the bottom
- “On site” photo carousel (6s autoplay, 1400ms crossfade)
- “Hear our story” audio with localStorage position
- Contact form success state (client-side only — wire a backend before launch)

## Still needs client content (from handoff)

- Developments placeholder copy
- “Four divisions. One standard.” → should become two divisions
- Real LinkedIn / Facebook URLs
- Form backend + Equal Housing Opportunity mark
