"use client";

import { useSyncExternalStore } from "react";

/**
 * Day / Night theme. Follows the OS by default; the nav switch overrides it by setting
 * `data-theme` on <html> and storing the choice in localStorage["hw:theme"].
 * The inline script in <head> (see head-script.ts) applies the stored choice before paint.
 */

export type Theme = "light" | "dark";

export const THEME_KEY = "hw:theme";

const listeners = new Set<() => void>();

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return systemDark() ? "dark" : "light";
}

function emit() {
  for (const l of listeners) l();
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // the browser chrome follows the chosen theme, not only the OS one
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", theme === "dark" ? "#0D1712" : "#F4F7F1"));
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage may be blocked — the attribute still applies for this visit */
  }
  emit();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => callback();
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", onChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light");
}
