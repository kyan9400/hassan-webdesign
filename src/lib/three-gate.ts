/**
 * Load order for the 3D chunks (PERF-RULES): nothing heavy before window `load`, then an idle
 * moment (timeout 2.5 s). The hero goes first; the gallery waits until the hero has settled
 * (ready, lost or poster), so the two chunks never download and compile in parallel.
 */

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Run `cb` after window `load` + requestIdleCallback({ timeout }). Returns a cancel function. */
export function afterLoadIdle(cb: () => void, timeout = 2500): () => void {
  const w = window as IdleWindow;
  let idleId = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;
  const run = () => {
    if (!done) {
      done = true;
      cb();
    }
  };
  const schedule = () => {
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(run, { timeout });
    else timer = setTimeout(run, 300);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    done = true;
    window.removeEventListener("load", schedule);
    if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
    if (timer) clearTimeout(timer);
  };
}

// hero 3D state: "idle" (not decided yet), "loading" (chunk + warm-up), "settled"
let heroState: "idle" | "loading" | "settled" = "idle";
const waiters = new Set<() => void>();

export function setHeroLoading() {
  heroState = "loading";
}

export function setHeroSettled() {
  heroState = "settled";
  for (const w of waiters) w();
  waiters.clear();
}

/**
 * Run `cb` once the hero is not loading. If the hero has not decided yet (the gallery is near on
 * a deep link), wait for its decision too, with a 6 s safety net. Returns a cancel function.
 */
export function afterHeroSettled(cb: () => void): () => void {
  if (heroState === "settled" || !document.querySelector(".hero")) {
    cb();
    return () => {};
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    waiters.delete(run);
    cb();
  };
  const timer = setTimeout(run, 6000);
  waiters.add(run);
  return () => {
    done = true;
    clearTimeout(timer);
    waiters.delete(run);
  };
}
