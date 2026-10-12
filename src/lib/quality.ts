"use client";

import { useSyncExternalStore } from "react";

/**
 * Quality tiers, decided BEFORE any Canvas exists (PERF-RULES rule 3).
 *  - high:   discrete GPU on a desktop
 *  - medium: Intel / AMD integrated, Mali / Adreno / PowerVR / Apple, or any touch device
 *  - low:    software renderer, a "major performance caveat" context, Save-Data, no WebGL2, or ?quality=low
 * deviceMemory ≤ 2 GB caps the tier at medium.
 * `?quality=low|medium|high` overrides the detection (but never enables 3D without WebGL2).
 */

export type Tier = "low" | "medium" | "high";

export type Quality = {
  tier: Tier;
  webgl2: boolean;
  renderer: string;
  touch: boolean;
  /** device-pixel-ratio cap for the Canvas */
  dprCap: number;
  /** why this tier was chosen (for ?fps debugging) */
  reason: string;
};

export const DPR_CAP: Record<Tier, number> = { high: 2, medium: 1.5, low: 1 };

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen|virtualbox|vmware/i;
const MOBILE_GPU = /mali|adreno|powervr|apple gpu|apple m\d|videocore|tegra/i;
const INTEL_DISCRETE = /intel.*\barc\b/i;
const AMD_DISCRETE = /\brx\s?\d|radeon pro|radeon r9|radeon r7|\bvii\b|firepro|\bw\d{4}\b/i;

function readRenderer(gl: WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof r === "string" && r) return r;
    }
  } catch {
    /* fall through */
  }
  try {
    const r = gl.getParameter(gl.RENDERER);
    return typeof r === "string" ? r : "";
  } catch {
    return "";
  }
}

function classify(renderer: string): { tier: Tier; reason: string } {
  if (!renderer) return { tier: "medium", reason: "unknown GPU" };
  if (SOFTWARE.test(renderer)) return { tier: "low", reason: "software renderer" };
  if (MOBILE_GPU.test(renderer)) return { tier: "medium", reason: "mobile / unified-memory GPU" };
  if (/intel/i.test(renderer)) {
    return INTEL_DISCRETE.test(renderer)
      ? { tier: "high", reason: "discrete GPU" }
      : { tier: "medium", reason: "integrated GPU" };
  }
  if (/amd|radeon|ati /i.test(renderer)) {
    return AMD_DISCRETE.test(renderer)
      ? { tier: "high", reason: "discrete GPU" }
      : { tier: "medium", reason: "integrated GPU" };
  }
  return { tier: "high", reason: "discrete GPU" };
}

function override(): Tier | null {
  try {
    const q = new URLSearchParams(window.location.search).get("quality");
    return q === "low" || q === "medium" || q === "high" ? q : null;
  } catch {
    return null;
  }
}

let cached: Quality | null = null;

/** True when the browser refuses a context that would be slow (a software fallback hiding its name). */
function hasPerformanceCaveat(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true, antialias: false });
    if (!gl) return true;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return false;
  } catch {
    return true;
  }
}

type NavExtras = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

export function detectQuality(): Quality {
  if (cached) return cached;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  let webgl2 = false;
  let renderer = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false, antialias: false });
    if (gl) {
      webgl2 = true;
      renderer = readRenderer(gl);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl2 = false;
  }

  let { tier, reason } = webgl2 ? classify(renderer) : { tier: "low" as Tier, reason: "no WebGL2" };
  if (webgl2 && touch && tier === "high") {
    tier = "medium";
    reason = "touch device";
  }
  const nav = navigator as NavExtras;
  if (webgl2 && tier !== "low" && hasPerformanceCaveat()) {
    tier = "low";
    reason = "major performance caveat";
  }
  if (tier !== "low" && nav.connection?.saveData === true) {
    tier = "low";
    reason = "save-data";
  }
  if (tier === "high" && typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) {
    tier = "medium";
    reason = "low device memory";
  }
  const forced = override();
  if (forced) {
    tier = webgl2 ? forced : "low";
    reason = webgl2 ? `?quality=${forced}` : "no WebGL2";
  }
  cached = { tier, webgl2, renderer, touch, dprCap: DPR_CAP[tier], reason };
  return cached;
}

const noopSubscribe = () => () => {};

/** Client-only quality info; `null` during SSR and hydration. */
export function useQuality(): Quality | null {
  return useSyncExternalStore(noopSubscribe, detectQuality, () => null);
}
