// Static GitHub Pages build: runs `next build` with GH_PAGES=1 and writes out/ (+ .nojekyll, vercel.json,
// and the pre-sized gallery textures that the image optimizer serves on Vercel).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const res = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, GH_PAGES: "1" },
});
if (res.status !== 0) process.exit(res.status ?? 1);

const out = join(process.cwd(), "out");
if (!existsSync(out)) {
  console.error("build:pages: out/ was not created");
  process.exit(1);
}
// keep Jekyll from hiding the _next/ folder
writeFileSync(join(out, ".nojekyll"), "");
// the gh-pages branch is a built static copy: tell Vercel's Git integration not to deploy it
const vercelJson = JSON.stringify({ git: { deploymentEnabled: false } }) + "\n";
writeFileSync(join(out, "vercel.json"), vercelJson);
JSON.parse(readFileSync(join(out, "vercel.json"), "utf8"));

// The generated images (OG, Twitter, apple-touch icon) are exported without an extension, which
// Pages serves as application/octet-stream: give each a .png copy and point the <head> tags and the
// manifest at it. Next also leaves the base path off the apple-touch-icon link; add it on the way.
// Only the <meta>/<link> tags change: the RSC payload has length-prefixed rows and must stay as built.
const BASE = "/hassan-webdesign";
const IMAGES = new Set(["opengraph-image", "twitter-image", "apple-icon"]);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const files = walk(out);
for (const f of files) if (IMAGES.has(basename(f))) copyFileSync(f, `${f}.png`);
const toPng = (s) =>
  s.replace(/(["'])\/apple-icon(?=[?"'])/g, `$1${BASE}/apple-icon`).replace(/\/(opengraph-image|twitter-image|apple-icon)(?=[?"'])/g, "/$1.png");
for (const f of files.filter((f) => /\.(html|webmanifest)$/.test(f))) {
  const src = readFileSync(f, "utf8");
  const next = f.endsWith(".html") ? src.replace(/<(?:meta|link)\b[^>]*>/g, toPng) : toPng(src);
  if (next !== src) writeFileSync(f, next);
}

// The export writes nested route segments as folders (work/x/__next.work/$d$slug/__PAGE__.txt) while
// the client router asks for one dotted name (work/x/__next.work.$d$slug.__PAGE__.txt): without a
// flat copy every prefetch and soft navigation 404s and falls back to a full page load.
for (const f of files) {
  const parts = relative(out, f).split(sep);
  const i = parts.findIndex((p, n) => p.startsWith("__next.") && n < parts.length - 1);
  if (i >= 0) copyFileSync(f, join(out, ...parts.slice(0, i), parts.slice(i).join(".")));
}

// gallery textures at the widths the 3D asks the optimizer for (src/components/three/gallery/textures.ts)
const sharp = require("sharp");
const shots = join(process.cwd(), "public", "work");
const sized = join(out, "work", "w");
mkdirSync(sized, { recursive: true });
const jobs = [];
for (const file of readdirSync(shots)) {
  const widths = file.endsWith("-desktop.webp") ? [828, 1080] : file.endsWith("-mobile.webp") ? [384] : [];
  for (const w of widths) {
    const target = join(sized, file.replace(/\.webp$/, `-${w}.webp`));
    jobs.push(sharp(join(shots, file)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 75 }).toFile(target));
  }
}
await Promise.all(jobs);
console.log(`build:pages: out/ ready for GitHub Pages (${jobs.length} gallery textures)`);
