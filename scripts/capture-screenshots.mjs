/**
 * Capture the gallery screenshots of every project that has a live URL in src/data/projects.ts.
 *
 *   public/work/{slug}-desktop.webp   1600 × 1000  (WebP)
 *   public/work/{slug}-mobile.webp     390 × 844   (WebP, rendered at 2× and scaled down)
 *   public/work/{slug}-og.jpg         1200 × 750   (JPEG q82, the desktop view scaled — used by the OG images)
 *
 * Usage
 *   npx playwright install chromium          (once, downloads the browser)
 *   npm run capture                          (every project with a liveUrl)
 *   npm run capture -- --only nova-ai-3d,aurum-watch-3d --wait 6000 --headed
 *
 * Options
 *   --only <slug,slug>   capture just these projects
 *   --skip-existing      leave projects alone when all three files already exist
 *   --wait <ms>          settle time after the page loads, so intros finish (default 4500)
 *   --headed             run a visible browser (use it if a site falls back to its low-quality poster)
 *   --no-params          do not append ?quality=high&motion=full to the URL
 *
 * Projects whose liveUrl is null are skipped. WebP / JPEG are encoded by the browser's own canvas
 * encoder, so no image library is needed. Screenshot presence is detected at build time, so the site
 * picks the new files up on the next `npm run build`.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, devices } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "work");
const PROJECTS_TS = join(ROOT, "src", "data", "projects.ts");

const DESKTOP = { width: 1600, height: 1000 };
const MOBILE = { width: 390, height: 844 };
const OG = { width: 1200, height: 750 };

function parseArgs(argv) {
  const opts = { only: null, skipExisting: false, wait: 4500, headed: false, params: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") opts.only = new Set((argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (a === "--skip-existing") opts.skipExisting = true;
    else if (a === "--wait") opts.wait = Math.max(0, Number(argv[++i]) || 0);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--no-params") opts.params = false;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: npm run capture -- [--only slug,slug] [--skip-existing] [--wait ms] [--headed] [--no-params]");
      process.exit(0);
    } else {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
  }
  return opts;
}

/** slug / name / liveUrl for every project, read from src/data/projects.ts. */
async function loadProjects() {
  // Node versions with TypeScript type stripping can import the data file directly…
  try {
    const mod = await import(pathToFileURL(PROJECTS_TS).href);
    if (Array.isArray(mod.projects)) {
      return mod.projects.map((p) => ({ slug: p.slug, name: p.name, liveUrl: p.liveUrl ?? null }));
    }
  } catch {
    /* …otherwise read the fields straight from the source */
  }
  const src = await readFile(PROJECTS_TS, "utf8");
  const list = [];
  const re = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?liveUrl:\s*(?:null|"([^"]*)")/g;
  let m;
  while ((m = re.exec(src))) list.push({ slug: m[1], name: m[2], liveUrl: m[3] ?? null });
  return list;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function withParams(url, enabled) {
  if (!enabled) return url;
  const u = new URL(url);
  u.searchParams.set("quality", "high");
  u.searchParams.set("motion", "full");
  return u.toString();
}

/** Scale / top-crop a PNG to w × h and encode it with the browser's canvas encoder. */
async function encode(page, png, w, h, type, quality) {
  const dataUrl = await page.evaluate(
    async ({ b64, w, h, type, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale;
      const sh = h / scale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, 0, sw, sh, 0, 0, w, h);
      return canvas.toDataURL(type, quality);
    },
    { b64: png.toString("base64"), w, h, type, quality },
  );
  if (!dataUrl.startsWith(`data:${type}`)) throw new Error(`The browser could not encode ${type}.`);
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

async function settle(page, wait) {
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(wait);
}

async function shoot(browser, url, contextOptions, wait) {
  const context = await browser.newContext({ colorScheme: "light", reducedMotion: "no-preference", ...contextOptions });
  try {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    } catch {
      // some 3D sites keep a connection open; fall back to the load event
      await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    }
    await settle(page, wait);
    return await page.screenshot({ type: "png" });
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const all = await loadProjects();
  if (!all.length) throw new Error(`No projects found in ${PROJECTS_TS}`);
  const picked = opts.only ? all.filter((p) => opts.only.has(p.slug)) : all;
  const live = picked.filter((p) => p.liveUrl);
  const noUrl = picked.filter((p) => !p.liveUrl);
  if (opts.only) {
    for (const slug of opts.only) if (!all.some((p) => p.slug === slug)) console.warn(`! Unknown slug: ${slug}`);
  }
  if (!live.length) {
    console.log("Nothing to capture: no selected project has a liveUrl yet (set it in src/data/projects.ts).");
    return;
  }
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: !opts.headed,
    args: [
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=default",
      "--enable-unsafe-swiftshader",
    ],
  });
  const util = await (await browser.newContext()).newPage();
  const mobileUa = devices["iPhone 13"]?.userAgent;

  let done = 0;
  const failed = [];
  try {
    for (const p of live) {
      const files = {
        desktop: join(OUT, `${p.slug}-desktop.webp`),
        mobile: join(OUT, `${p.slug}-mobile.webp`),
        og: join(OUT, `${p.slug}-og.jpg`),
      };
      if (opts.skipExisting && (await exists(files.desktop)) && (await exists(files.mobile)) && (await exists(files.og))) {
        console.log(`- ${p.slug}: already captured, skipped`);
        continue;
      }
      const url = withParams(p.liveUrl, opts.params);
      process.stdout.write(`> ${p.name} (${url})\n`);
      try {
        const desktopPng = await shoot(browser, url, { viewport: DESKTOP, deviceScaleFactor: 1 }, opts.wait);
        await writeFile(files.desktop, await encode(util, desktopPng, DESKTOP.width, DESKTOP.height, "image/webp", 0.82));
        await writeFile(files.og, await encode(util, desktopPng, OG.width, OG.height, "image/jpeg", 0.82));

        const mobilePng = await shoot(
          browser,
          url,
          { viewport: MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...(mobileUa ? { userAgent: mobileUa } : {}) },
          opts.wait,
        );
        await writeFile(files.mobile, await encode(util, mobilePng, MOBILE.width, MOBILE.height, "image/webp", 0.82));
        done++;
        console.log(`  saved ${p.slug}-desktop.webp, ${p.slug}-mobile.webp, ${p.slug}-og.jpg`);
      } catch (err) {
        failed.push(p.slug);
        console.error(`  failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nCaptured ${done} of ${live.length} project(s) into public/work/.`);
  if (noUrl.length) console.log(`Skipped (no liveUrl yet): ${noUrl.map((p) => p.slug).join(", ")}`);
  if (failed.length) {
    console.log(`Failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
