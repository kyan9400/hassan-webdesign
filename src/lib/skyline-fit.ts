/**
 * Shared framing for the hero poster (SVG) and the 3D scene.
 * The skyline is drawn in viewBox "-240 0 1920 500"; 1 world unit = 100 viewBox px,
 * world x = (vx − 720) / 100, world y = (470 − vy) / 100 (y = 0 is the hill line, hill base y = −0.3).
 *
 * Poster CSS mirrors `skylineHeight`:
 *   height: min(42cqh, 100cqw * 500 / 1920); portrait: 32cqh; aspect-ratio 1920/500; bottom-aligned, centred.
 */

export const VIEWBOX = { x: -240, y: 0, w: 1920, h: 500 } as const;
export const FOV = 30;
const HALF_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** Skyline pixel height inside a W×H hero. */
export function skylineHeight(W: number, H: number): number {
  const landscape = W >= H;
  return landscape ? Math.min(0.42 * H, (W * 500) / 1920) : 0.32 * H;
}

export type HeroFraming = {
  /** visible world height at z = 0 */
  Vh: number;
  /** camera distance from the z = 0 plane */
  d: number;
  /** camera and look-target height */
  y: number;
};

/** Camera looking straight ahead (no pitch), so the z = 0 plane maps exactly like the poster. */
export function heroFraming(W: number, H: number): HeroFraming {
  const skyH = Math.max(1, skylineHeight(W, H));
  const Vh = (5 * H) / skyH;
  const d = Vh / (2 * HALF_TAN);
  return { Vh, d, y: -0.3 + Vh / 2 };
}

/** Reference framing used to pre-project the poster drawing (a typical 16:10 landscape screen). */
export const REFERENCE_FRAMING: HeroFraming = heroFraming(1440, 900);

/** World point at depth z → viewBox coordinates, as the reference camera sees it. */
export function projectToViewBox(x: number, y: number, z: number, f: HeroFraming = REFERENCE_FRAMING) {
  const s = f.d / (f.d - z);
  const px = x * s;
  const py = f.y + (y - f.y) * s;
  return { vx: px * 100 + 720, vy: 470 - py * 100, s };
}
