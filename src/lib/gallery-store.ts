"use client";

import { useSyncExternalStore } from "react";
import type { Sector } from "@/data/sectors";

/**
 * Tiny external store for the work gallery ("The Glasshouse"): filter, active, hover, visited, view.
 * Read with `useGallery(selector)`; the 3D scenes subscribe with `subscribeGallery` and read
 * `getGallery()` into refs, so nothing re-renders per frame.
 *
 * Persistence: visited → sessionStorage["hw:visited"] (slug array, session only),
 *              view    → localStorage["hw:workView"] ("list" when the visitor picked the list).
 */

export type WorkView = "auto" | "list";

export type GalleryState = {
  filter: Sector | "all";
  /** index into the filtered project list */
  active: number;
  /** hovered pane index, or -1 */
  hover: number;
  visited: readonly string[];
  view: WorkView;
};

const VISITED_KEY = "hw:visited";
const VIEW_KEY = "hw:workView";

const SERVER_STATE: GalleryState = { filter: "all", active: 0, hover: -1, visited: [], view: "auto" };

let state: GalleryState | null = null;
const listeners = new Set<() => void>();

function load(): GalleryState {
  let visited: string[] = [];
  let view: WorkView = "auto";
  let filter: GalleryState["filter"] = "all";
  try {
    const raw = sessionStorage.getItem(VISITED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) visited = parsed.filter((s): s is string => typeof s === "string");
  } catch {
    visited = [];
  }
  try {
    view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "auto";
  } catch {
    view = "auto";
  }
  try {
    const f = new URLSearchParams(window.location.search).get("for");
    const sectors = ["food", "beauty-health", "real-estate", "products", "travel-events", "tech"];
    if (f && sectors.includes(f)) filter = f as Sector;
  } catch {
    filter = "all";
  }
  return { filter, active: 0, hover: -1, visited, view };
}

export function getGallery(): GalleryState {
  if (typeof window === "undefined") return SERVER_STATE;
  if (!state) state = load();
  return state;
}

function set(patch: Partial<GalleryState>) {
  state = { ...getGallery(), ...patch };
  for (const l of listeners) l();
}

export function subscribeGallery(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useGallery<T>(selector: (s: GalleryState) => T): T {
  return useSyncExternalStore(
    subscribeGallery,
    () => selector(getGallery()),
    () => selector(SERVER_STATE),
  );
}

export function markVisited(slug: string) {
  const cur = getGallery().visited;
  if (cur.includes(slug)) return;
  const visited = [...cur, slug];
  try {
    sessionStorage.setItem(VISITED_KEY, JSON.stringify(visited));
  } catch {
    /* storage may be blocked — the counter still works for this page view */
  }
  set({ visited });
}

export function setGalleryView(view: WorkView) {
  try {
    if (view === "list") localStorage.setItem(VIEW_KEY, "list");
    else localStorage.removeItem(VIEW_KEY);
  } catch {
    /* ignore */
  }
  set({ view });
}

export function setGalleryFilter(filter: GalleryState["filter"]) {
  set({ filter, active: 0 });
}

export function setGalleryActive(active: number) {
  if (active !== getGallery().active) set({ active });
}

export function setGalleryHover(hover: number) {
  if (hover !== getGallery().hover) set({ hover });
}
