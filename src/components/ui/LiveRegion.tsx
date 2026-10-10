"use client";

import { useSyncExternalStore } from "react";

/**
 * Visually hidden polite live region for announcements that should not show a toast
 * (e.g. gallery keyboard / button navigation: "Showing 4 of 11: Nova, AI assistant SaaS.").
 * `announce()` is debounced (400 ms) so rapid key presses only announce the final item.
 */

let message = "";
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function announce(text: string, debounceMs = 400) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    // Re-announce identical text by clearing first.
    message = message === text ? `${text} ` : text;
    for (const l of listeners) l();
  }, debounceMs);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function LiveRegion() {
  const text = useSyncExternalStore(subscribe, () => message, () => "");
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
