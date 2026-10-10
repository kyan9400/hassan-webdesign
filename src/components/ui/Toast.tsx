"use client";

import { useSyncExternalStore } from "react";

/**
 * Small global toast ("Link copied", "Full motion is on."). The element is a polite status
 * region, so every toast is also announced to screen readers.
 */

/** scope: the id of the modal <dialog> open when the toast fired ("page" when none) */
type ToastState = { id: number; message: string; show: boolean; scope: string };

let current: ToastState = { id: 0, message: "", show: false, scope: "page" };
const listeners = new Set<() => void>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string) {
  if (hideTimer) clearTimeout(hideTimer);
  // a modal dialog makes the page inert: show the toast in that dialog's own outlet instead
  let scope = "page";
  try {
    scope = document.querySelector("dialog:modal")?.id || "page";
  } catch {
    // no :modal support (Safari 15.4-15.5): an open dialog is the modal one on this site
    scope = document.querySelector<HTMLElement>("dialog[open]")?.id || "page";
  }
  current = { id: current.id + 1, message, show: true, scope };
  emit();
  hideTimer = setTimeout(() => {
    current = { ...current, show: false };
    emit();
    // clear the text once the fade ends, so browse mode never finds a stale message
    hideTimer = setTimeout(() => {
      current = { ...current, message: "" };
      emit();
    }, 260);
  }, 2400);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SERVER: ToastState = { id: 0, message: "", show: false, scope: "page" };

export function Toaster({ scope = "page" }: { scope?: string }) {
  const state = useSyncExternalStore(subscribe, () => current, () => SERVER);
  const mine = state.scope === scope;
  return (
    <div className="toast" role="status" aria-live="polite" data-show={mine && state.show ? "true" : "false"}>
      {/* keyed: a repeated message still replaces the node, so it is announced again */}
      {mine ? <span key={state.id}>{state.message}</span> : null}
    </div>
  );
}
