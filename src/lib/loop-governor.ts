/**
 * Render governor for `<Canvas frameloop="demand">`.
 * A rAF loop calls `invalidate()` at 60 fps (input in the last few seconds, or an intro / dart /
 * theme transition running), 30 fps (hovering idle) or not at all (perched and settled → 0 frames).
 * It pauses while the target element is off-screen (IntersectionObserver) or the tab is hidden.
 *
 * It also watches real frame pacing while running at 60 fps and reports a decline (sustained
 * < 45 fps) so the scene can lower its DPR / drop effects. drei's <PerformanceMonitor> is not used
 * because it would read the deliberate 30 fps / 0 fps idle phases as a performance problem.
 */

export type LoopRate = 0 | 30 | 60;

export class LoopGovernor {
  private rate: LoopRate = 0;
  private raf = 0;
  private last = 0;
  private hidden = false;
  private offscreen = false;
  private io: IntersectionObserver | null = null;
  private readonly invalidate: () => void;

  // pacing monitor
  private winStart = 0;
  private winFrames = 0;
  private slowWindows = 0;
  private prevTick = 0;
  onDecline: (() => void) | null = null;

  constructor(invalidate: () => void, target: Element | null) {
    this.invalidate = invalidate;
    this.hidden = typeof document !== "undefined" && document.hidden;
    document.addEventListener("visibilitychange", this.onVisibility);
    if (target && "IntersectionObserver" in window) {
      this.io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1];
          this.offscreen = !e.isIntersecting;
          if (!this.offscreen) {
            this.invalidate();
            this.kick();
          }
        },
        { threshold: 0 },
      );
      this.io.observe(target);
    }
  }

  get current(): LoopRate {
    return this.rate;
  }

  get paused(): boolean {
    return this.hidden || this.offscreen;
  }

  setRate(rate: LoopRate) {
    if (rate === this.rate) return;
    this.rate = rate;
    this.resetWindow();
    this.kick();
  }

  /** Render one frame now, without changing the rate. */
  poke() {
    if (!this.paused) this.invalidate();
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.io?.disconnect();
    this.io = null;
    this.onDecline = null;
  }

  private onVisibility = () => {
    this.hidden = document.hidden;
    if (!this.hidden) {
      this.resetWindow();
      this.invalidate();
      this.kick();
    }
  };

  private kick() {
    if (!this.raf && this.rate > 0 && !this.paused) this.raf = requestAnimationFrame(this.tick);
  }

  private resetWindow() {
    this.winStart = 0;
    this.winFrames = 0;
    this.prevTick = 0;
  }

  private tick = (t: number) => {
    this.raf = 0;
    if (this.rate === 0 || this.paused) return;
    const minInterval = this.rate === 60 ? 0 : 1000 / 30 - 4;
    if (t - this.last >= minInterval) {
      this.last = t;
      this.invalidate();
    }
    if (this.rate === 60) this.sample(t);
    this.raf = requestAnimationFrame(this.tick);
  };

  private sample(t: number) {
    // Ignore long gaps (tab switches, GC pauses right after a pause) — they are not steady pacing.
    if (this.prevTick && t - this.prevTick > 250) {
      this.resetWindow();
    }
    this.prevTick = t;
    if (!this.winStart) {
      this.winStart = t;
      this.winFrames = 0;
      return;
    }
    this.winFrames++;
    const elapsed = t - this.winStart;
    if (elapsed >= 1000) {
      const fps = (this.winFrames * 1000) / elapsed;
      this.slowWindows = fps < 45 ? this.slowWindows + 1 : 0;
      if (this.slowWindows >= 2) {
        this.slowWindows = 0;
        this.onDecline?.();
      }
      this.winStart = t;
      this.winFrames = 0;
    }
  }
}
