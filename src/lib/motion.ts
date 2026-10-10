"use client";

import { useSyncExternalStore } from "react";

/**
 * Motion preference. Reduced motion is respected BY DEFAULT (prefers-reduced-motion), but a visible
 * "Turn on full motion" toggle overrides it and is remembered in localStorage["hw:motion"].
 * `?motion=full` in the URL overrides everything. The resolved value lives on <html data-motion>,
 * set before paint by the inline head script, so CSS can read it without waiting for React.
 */

export type Motion = "full" | "reduced";

export const MOTION_KEY = "hw:motion";

const listeners = new Set<() => void>();

function computeMotion(): Motion {
  try {
    const q = new URLSearchParams(window.location.search).get("motion");
    if (q === "full") return "full";
    if (q === "reduced") return "reduced";
  } catch {
    /* ignore */
  }
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(MOTION_KEY);
  } catch {
    stored = null;
  }
  if (stored === "full" || stored === "reduced") return stored;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function getMotion(): Motion {
  if (typeof document === "undefined") return "reduced";
  const attr = document.documentElement.getAttribute("data-motion");
  if (attr === "full" || attr === "reduced") return attr;
  return computeMotion();
}

function emit() {
  for (const l of listeners) l();
}

export function setMotion(motion: Motion) {
  document.documentElement.setAttribute("data-motion", motion);
  try {
    localStorage.setItem(MOTION_KEY, motion);
  } catch {
    /* storage may be blocked */
  }
  emit();
}

export function toggleMotion(): Motion {
  const next: Motion = getMotion() === "full" ? "reduced" : "full";
  setMotion(next);
  return next;
}

export function subscribeMotion(callback: () => void): () => void {
  listeners.add(callback);
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onChange = () => {
    // Follows the OS only while the visitor has not chosen explicitly (computeMotion checks that).
    document.documentElement.setAttribute("data-motion", computeMotion());
    callback();
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", onChange);
  };
}

export function useMotion(): Motion {
  return useSyncExternalStore(subscribeMotion, getMotion, () => "reduced");
}
