/**
 * The toast store, kept apart from the UI: callers (copy buttons, toggles) import only this tiny
 * module. Toasts render in the <Toaster> outlet of the modal <dialog> open at the time, or the page.
 */

/** scope: the id of the modal <dialog> open when the toast fired ("page" when none) */
export type ToastState = { id: number; message: string; show: boolean; scope: string };

export const TOAST_SERVER: ToastState = { id: 0, message: "", show: false, scope: "page" };

let current: ToastState = TOAST_SERVER;
const listeners = new Set<() => void>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

export function getToast(): ToastState {
  return current;
}

export function subscribeToast(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
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
