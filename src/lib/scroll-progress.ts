/**
 * One shared passive scroll / resize listener that notifies subscribers at most once per animation
 * frame. Scroll values are read here once; scenes damp them internally (the only smoothing layer).
 */

const subs = new Set<() => void>();
let frame = 0;
let attached = false;

function flush() {
  frame = 0;
  for (const s of subs) s();
}

function onEvent() {
  if (!frame) frame = requestAnimationFrame(flush);
}

export function subscribeScrollFrame(callback: () => void): () => void {
  subs.add(callback);
  if (!attached) {
    attached = true;
    window.addEventListener("scroll", onEvent, { passive: true });
    window.addEventListener("resize", onEvent, { passive: true });
  }
  return () => {
    subs.delete(callback);
    if (subs.size === 0 && attached) {
      attached = false;
      window.removeEventListener("scroll", onEvent);
      window.removeEventListener("resize", onEvent);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/** How far an element has scrolled out through the top: 0 (in place) … 1 (gone). */
export function exitProgress(el: Element): number {
  const r = el.getBoundingClientRect();
  if (r.height <= 0) return 0;
  const p = -r.top / r.height;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}
