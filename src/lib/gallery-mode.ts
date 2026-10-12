"use client";

import { useSyncExternalStore } from "react";
import { detectQuality, type Quality } from "./quality";
import { getGallery, subscribeGallery } from "./gallery-store";
import { afterLoadIdle } from "./three-gate";

/**
 * Which way the work gallery renders (SPEC §6.1):
 *  - "3d"    width ≥ 1024 px AND a fine pointer AND tier ≥ medium AND WebGL2 AND view ≠ list
 *  - "cards" width < 1024 px or touch — horizontal swipe cards
 *  - "list"  the visitor picked "View as list", low tier, or no WebGL2 — a responsive grid
 * The inline <head> script sets a provisional `data-gallery` on <html> before the first paint (media
 * query + stored view + ?quality=low), so the layout is right without waiting for React. The GPU
 * tier is detected later, after load + idle (it needs a WebGL context), and can only move "3d" to "list".
 * Without JavaScript there is no attribute and the CSS default is the list.
 */

export type GalleryMode = "3d" | "cards" | "list";

const WIDE = "(min-width: 1024px) and (pointer: fine)";

let quality: Quality | null = null;
let mode: GalleryMode | null = null;
let started = false;
const listeners = new Set<() => void>();

function forcedLow(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("quality") === "low";
  } catch {
    return false;
  }
}

function wide(): boolean {
  return window.matchMedia(WIDE).matches;
}

/** Can this device show the 3D gallery at all (ignoring the visitor's view choice)? */
function capable(): boolean {
  if (!wide() || forcedLow()) return false;
  return !quality || (quality.tier !== "low" && quality.webgl2);
}

function compute(): GalleryMode {
  if (!wide()) return "cards";
  if (getGallery().view === "list") return "list";
  return capable() ? "3d" : "list";
}

function emit() {
  for (const l of listeners) l();
}

function update() {
  const next = compute();
  document.documentElement.setAttribute("data-gallery", next);
  if (next !== mode) {
    mode = next;
    emit();
  }
}

function start() {
  if (started) return;
  started = true;
  window.matchMedia(WIDE).addEventListener("change", update);
  subscribeGallery(update);
  // the GPU probe needs a WebGL context: keep it off the critical path (after load + idle)
  afterLoadIdle(() => {
    quality = detectQuality();
    update();
    emit();
  });
  update();
}

export function subscribeGalleryMode(callback: () => void): () => void {
  start();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getGalleryMode(): GalleryMode | null {
  if (typeof window === "undefined") return null;
  if (mode === null) mode = compute();
  return mode;
}

export function getGalleryQuality(): Quality | null {
  return quality;
}

/** "3d" | "cards" | "list" on the client; null during SSR and hydration. */
export function useGalleryMode(): GalleryMode | null {
  return useSyncExternalStore(subscribeGalleryMode, getGalleryMode, () => null);
}

/** The detected quality tier once known (after idle); null before. */
export function useGalleryQuality(): Quality | null {
  return useSyncExternalStore(subscribeGalleryMode, getGalleryQuality, () => null);
}

/** Whether the "View in 3D" option makes sense here. */
export function useGallery3dCapable(): boolean {
  return useSyncExternalStore(subscribeGalleryMode, () => (typeof window === "undefined" ? false : capable()), () => false);
}
