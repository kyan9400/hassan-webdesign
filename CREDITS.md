# Credits

## Fonts (SIL Open Font License 1.1)

Self-hosted at build time with `next/font/google` — no runtime requests to a font CDN.

| Font | Use | License |
|---|---|---|
| [Fraunces](https://fonts.google.com/specimen/Fraunces) | Display type and numerals | SIL OFL 1.1 |
| [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) | Text and interface | SIL OFL 1.1 |
| [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | Specimen labels, prices, tech chips | SIL OFL 1.1 |

Open Graph images use static instances of the same families, placed in `src/app/_og/` together with
each family's `OFL.txt` (from the `static/` folders of the Google Fonts family downloads, SIL OFL 1.1).
They are optional: without them the cards fall back to the built-in sans.

- `Fraunces_72pt-SemiBold.ttf`, `Fraunces_72pt-SemiBoldItalic.ttf` — https://fonts.google.com/specimen/Fraunces
- `InstrumentSans-Medium.ttf` — https://fonts.google.com/specimen/Instrument+Sans

## npm libraries

| Package | License |
|---|---|
| next | MIT |
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing | MIT |
| tailwindcss, @tailwindcss/postcss | MIT |
| typescript | Apache-2.0 |
| eslint, eslint-config-next | MIT |
| playwright, playwright-core (dev only, screenshot capture) | Apache-2.0 |

See `package.json` and `package-lock.json` for the full dependency tree; each package keeps its own license.

## 3D, graphics and images

- All 3D on this site is made in code: the skyline, canopies, blossoms, hill, pollen and the hummingbird are
  procedural geometry and shaders. The lighting environment is generated in code (no HDRI download).
- Every illustration and icon (the hero drawing, the herbarium flower, the contact hummingbird, the 404 pot,
  the botanical icons, the favicon) is inline SVG written for this project.
- Project screenshots in `public/work/` show the author's own sites, captured from them with
  `scripts/capture-screenshots.mjs`. The gallery's glasshouse (panes, ironwork, vine, blossoms), its placeholder
  images and the drop-shadow texture are drawn in code.
- Apex Motors (one of the featured projects) uses a third-party car model, credited on that site itself.
