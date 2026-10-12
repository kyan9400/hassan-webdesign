# hassan-webdesign

The studio site of **Alhassan Alfarran** — web design, real-time 3D websites and AI tools.
*"Websites that feel alive."*

Live: https://hassan-webdesign.vercel.app

## What it is

A one-page studio site that proves its claims with eleven live 3D sites you can open, not mockups:
hero → proof strip → work ("The Glasshouse") → services with prices → process → about → contact.
Every project also has its own case page at `/work/{slug}`, which opens as a side panel over the home page
when you click it in the gallery (Next.js intercepting + parallel routes).

## Signature techniques

1. **The living skyline (hero).** The page paints a server-rendered SVG drawing of a glass-and-greenery skyline
   instantly; a moment later the same drawing turns into real-time 3D in exactly the same framing (one shared fit
   function and a camera with no pitch, so the cross-fade lines up). Rooftop flowers turn toward the cursor as if
   it were the sun — one uniform drives every flower on the GPU. A procedural hummingbird with an iridescent
   throat darts to the flower nearest the cursor and drinks from it; its wings are drawn as an arcsine-density
   blur fan plus a 9 Hz "ghost" wing, so they read as fast without strobing. Leave the page alone for 12 seconds
   and the bird perches: the canvas then renders **0 frames**.
2. **The Glasshouse (work gallery).** The live sites are panes of glass in a curved conservatory wall (radius 11, one
   pane every 19°) that you walk past as you scroll. A pinned section maps scroll progress to one number — the walk
   position `s` — which is damped once inside the scene (`s += (s* − s)(1 − e^(−8dt))`, the only smoothing layer)
   and drives everything: pane angles, the vine, the camera-facing phones and the visiting hummingbird.
   - Each pane is an opaque shader: inactive panes are "frosted" for free by sampling the screenshot's mip chain with
     an LOD bias (no blur passes), a glare band follows the pointer, and screenshots wipe in from the bottom when they
     arrive. Mullions, roof ribs and drop shadows are one instanced draw call each.
   - Screenshots reach the GPU through the Next image optimizer at 1080 / 828 px (never the 1600 px source),
     decoded off the main thread (`ImageBitmapLoader`), loaded as you approach them; phone shots only for the
     neighbours. Missing screenshots show code-drawn placeholders in the project's colour.
   - Click the active pane and it flies to the left, squares up and the project panel opens beside it (an intercepted
     route, so the URL is `/work/{slug}` and a refresh shows the full case page). Every project you open makes a
     flower bloom on the glasshouse vine in that site's colour, and the hummingbird flies over to sip it.
   - Drag, ←/→, Home/End, the buttons and the index all just scroll the page; the walk snaps to the nearest pane when
     you stop. Filters re-flow the arc and are shareable (`/?for=real-estate`).
   - The `<ol>` of projects is always the real content: the index column in 3D, swipe cards on phones and touch
     screens (CSS scroll-snap, with a scroll-driven curve where supported), a grid in list mode (low tier, no
     WebGL, or "View as list"). The canvas is `aria-hidden`; everything works with a keyboard and a screen reader.

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.6 (App Router, TypeScript strict, `src/`) |
| UI | React 19.3, Tailwind CSS 4.3 (`@theme` tokens, light "Morning garden" / dark "Night garden") |
| 3D | three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7 (Stats only), night glow from additive sprites (no post-processing) |
| Fonts | Fraunces, Instrument Sans, IBM Plex Mono via `next/font` (self-hosted) |
| Tooling | Playwright 1.63 (dev only — the screenshot capture script) |

All versions are pinned exactly (`npm install --save-exact`); `package-lock.json` is committed.

**Why there is no Lenis and no GSAP:** native scroll, `position: sticky` and one damping step inside each 3D scene
give exactly one smoothing layer — no scroll-jacking, no double smoothing — and save about 55 KB of JavaScript.
Reveals are IntersectionObserver + CSS `transform`/`opacity`.

**Performance rules in the code:** `frameloop="demand"` with a render governor (60 / 30 / 0 fps),
quality tiers decided before the canvas exists (`src/lib/quality.ts`, `?quality=low|medium|high`), DPR caps
per tier with a pacing monitor that lowers DPR on decline, `compileAsync` warm-up behind the poster, no
allocations per frame, instancing, no shadow maps, no blurred backdrops, loops paused off-screen and in hidden
tabs, reduced motion respected by default with a "Turn on full motion" toggle (`?motion=full`), and a designed
poster when WebGL is unavailable. `?fps` shows a frame counter.

The 3D environment for the high tier is baked in code from three light-former panels (`environment.ts`) — the
same result as drei `<Environment>` + `<Lightformer>`, without bundling drei's HDR loaders.

## Adding or updating a project

Everything lives in `src/data/projects.ts`:

- When a site goes live, set its `liveUrl` (until then the panel shows "Live link coming soon").
- Screenshots go in `public/work/`:
  - `{slug}-desktop.webp` — 1600 × 1000
  - `{slug}-mobile.webp` — 780 × 1688 (2× of a 390 × 844 phone)
  - `{slug}-og.jpg` — 1200 × 750 JPEG (q82, top crop of the desktop view) for the social images
- Screenshot presence is detected at build time (`src/data/screenshots.server.ts`); a missing file shows a
  designed placeholder (and the social image an accent card) and never breaks the build.

### Capturing the screenshots

`scripts/capture-screenshots.mjs` opens every project that has a `liveUrl` and saves all three files:

```bash
npx playwright install chromium   # once
npm run capture                   # every project with a liveUrl
npm run capture -- --only nova-ai-3d,aurum-watch-3d --wait 6000 --headed
```

Options: `--only <slugs>`, `--skip-existing`, `--wait <ms>` (settle time for intros, default 4500), `--headed`
(use a visible browser if a site falls back to its low-quality poster in headless mode) and `--no-params` (by
default `?quality=high&motion=full` is added to the URL). Then run `npm run build` again.

All other copy lives in `src/data/site.ts`.

## Run

```bash
npm install
npm run build     # production build
npm run lint      # ESLint (flat config)
npm run capture   # screenshots of the live sites (see above)
```

Debug switches: `?quality=low|medium|high` (force a tier), `?motion=full` (full motion even when the OS asks for
reduced motion), `?fps` (frame counter on both canvases), `?for=<sector>` (pre-filtered gallery).

## Credits

Fonts are SIL OFL 1.1; libraries are MIT / Apache-2.0. All 3D and illustrations are made in code.
See [CREDITS.md](./CREDITS.md).

---

© 2026 Alhassan Alfarran. All rights reserved — see [LICENSE](./LICENSE).
