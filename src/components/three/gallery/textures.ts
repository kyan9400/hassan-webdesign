import {
  CanvasTexture,
  ImageBitmapLoader,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Texture,
} from "three";
import type { Project } from "@/data/projects";
import { pad2 } from "@/data/projects";

/**
 * Texture pipeline for the glasshouse panes.
 *  - GPU copies come from the Next image optimizer, so the 3D never uploads a 1600 px texture:
 *    /_next/image?url=…&w=1080|828|384&q=75 (default deviceSizes / imageSizes / quality in Next 16).
 *    If that request fails, the raw file is used.
 *  - Decoded off the main thread with ImageBitmapLoader (flipY at decode, texture.flipY = false),
 *    sRGB, mipmaps (the panes' "frost" samples the mip chain), anisotropy per tier.
 *  - Placeholders (accent gradient + name in Fraunces) are CanvasTextures drawn in code — shown until
 *    a screenshot arrives, or for good when it is not in public/work yet.
 */

export function textureUrl(src: string, w: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

let loader: ImageBitmapLoader | null = null;

function getLoader(): ImageBitmapLoader {
  if (!loader) {
    loader = new ImageBitmapLoader();
    loader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" });
  }
  return loader;
}

function toTexture(bitmap: ImageBitmap, anisotropy: number): Texture {
  const tex = new Texture(bitmap);
  tex.flipY = false;
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Load a screenshot as a texture: optimizer first, raw file as the fallback, null if both fail. */
export async function loadShot(src: string, width: number, anisotropy: number): Promise<Texture | null> {
  const l = getLoader();
  for (const url of [textureUrl(src, width), src]) {
    try {
      const bitmap = (await l.loadAsync(url)) as ImageBitmap;
      return toTexture(bitmap, anisotropy);
    } catch {
      /* try the next source */
    }
  }
  return null;
}

/** Free a texture and its decoded bitmap. */
export function disposeShot(tex: Texture | null) {
  if (!tex) return;
  const data = tex.source.data as { close?: () => void } | null;
  tex.dispose();
  data?.close?.();
}

// ───────────────────────── placeholders ─────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(ar, br)} ${m(ag, bg)} ${m(ab, bb)})`;
}

function cssFont(variable: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function paintGradient(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, mixHex("#ffffff", accent, 0.42));
  g.addColorStop(1, mixHex("#f4f7f1", accent, 0.2));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, Math.max(w, h) * 0.75);
  r.addColorStop(0, "rgba(255,255,255,0.5)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
}

export type Placeholder = { texture: CanvasTexture; redraw: () => void; setStatus: (status: string) => void };

/**
 * A 512 × 320 (desktop) or 192 × 416 (phone) placeholder: the project's accent gradient,
 * `{order} / {name}` in Fraunces and a status line. Redraw after the web fonts are ready.
 */
export function createPlaceholder(project: Project, kind: "desktop" | "mobile", initialStatus: string): Placeholder {
  let status = initialStatus;
  const desktop = kind === "desktop";
  const w = desktop ? 512 : 192;
  const h = desktop ? 320 : 416;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const redraw = () => {
    if (!ctx) return;
    const display = cssFont("--font-fraunces", "Georgia, serif");
    const sans = cssFont("--font-instrument", "system-ui, sans-serif");
    paintGradient(ctx, w, h, project.accent.swatch);
    ctx.fillStyle = "#13221a";
    ctx.textBaseline = "alphabetic";
    if (desktop) {
      const title = `${pad2(project.order)} / ${project.name}`;
      let size = 50;
      ctx.font = `600 ${size}px ${display}`;
      while (size > 26 && ctx.measureText(title).width > w - 64) {
        size -= 2;
        ctx.font = `600 ${size}px ${display}`;
      }
      ctx.fillText(title, 32, h - 64);
      ctx.font = `500 20px ${sans}`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(status, 32, h - 32);
      ctx.globalAlpha = 1;
    } else {
      ctx.font = `600 40px ${display}`;
      ctx.fillText(pad2(project.order), 24, h - 32);
    }
    texture.needsUpdate = true;
  };
  redraw();
  const setStatus = (next: string) => {
    if (next === status) return;
    status = next;
    redraw();
  };
  return { texture, redraw, setStatus };
}

/** Wait for the display + text faces, then call back (placeholders are redrawn with them). */
export function whenFontsReady(callback: () => void) {
  try {
    const display = cssFont("--font-fraunces", "Georgia, serif");
    const sans = cssFont("--font-instrument", "system-ui, sans-serif");
    Promise.all([document.fonts.load(`600 54px ${display}`), document.fonts.load(`600 22px ${sans}`), document.fonts.ready])
      .then(callback)
      .catch(() => undefined);
  } catch {
    /* Font Loading API unavailable — the fallback faces stay */
  }
}

/** One shared blurred rounded-rect texture for the panes' drop shadows. */
export function createShadowTexture(): CanvasTexture {
  const w = 256;
  const h = 176;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // draw the shape off-canvas and keep only its blurred shadow (works without ctx.filter)
    const rw = 200;
    const rh = 120;
    const off = 1000;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = off;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect((w - rw) / 2 - off, (h - rh) / 2, rw, rh, 10);
    ctx.fill();
  }
  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  return tex;
}
