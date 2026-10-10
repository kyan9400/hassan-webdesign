/**
 * "The Glasshouse" — the arrangement. One damped number `s` (the walk position, in pane slots)
 * drives everything: pane i sits at angle φ = (slot − s)·θ on a circle of radius R around the
 * world origin, facing the centre. The camera stands inside the circle looking at the wall.
 *
 * Slot space: the vine, rail and blossoms live in a group rotated by s·θ about y, so slot j is at
 * local angle j·θ: (R·sin jθ, y, −R·cos jθ).
 */

export const R = 11;
export const PANE_W = 3.2;
export const PANE_H = 2.0;
export const PANE_R = 0.08;
export const GAP = 0.45;
/** angular step between panes: (w + gap) / R ≈ 0.332 rad (19°) */
export const THETA = (PANE_W + GAP) / R;
export const MAX_PANES = 11;

/** panes further than this from `s` are not drawn */
export const VISIBLE_RANGE = 2.5;
/** phones are drawn for panes closer than this */
export const PHONE_RANGE = 1.5;

export const FOV = 30;
export const HALF_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
/** the active pane fills about this share of the stage width */
export const ACTIVE_SHARE = 0.52;
/** minimum visible world height at the wall (pane + rail + blossoms + a little roof) */
export const MIN_VIEW_H = 3.5;
export const CAMERA_Y = 0.15;

/** phone: rounded rect 0.62 × 1.34 (r 0.09) in a 0.03 bezel, at the pane's lower right */
export const PHONE = {
  screenW: 0.62,
  screenH: 1.34,
  screenR: 0.09,
  bezel: 0.03,
  x: 1.25,
  y: -0.45,
  z: 0.35,
  rotY: (-8 * Math.PI) / 180,
  /** slide-out on hover */
  hoverX: 0.12,
  /** presented: beside the pane, squared up */
  presentX: 1.72,
  presentY: -0.32,
  presentZ: 0.25,
} as const;
export const PHONE_W = PHONE.screenW + PHONE.bezel * 2;
export const PHONE_H = PHONE.screenH + PHONE.bezel * 2;

/** presented pane + phone, in pane-local units: extents [−1.6, 2.06] */
export const PRESENT_EXTENT = { left: -PANE_W / 2, right: PHONE.presentX + PHONE_W / 2 } as const;
/** distance from the camera of the presented pane */
export const PRESENT_DISTANCE = 4.2;

/** the rail (and the vine on it) at the panes' feet */
export const RAIL_Y = -1.32;
export const RAIL_R = R - 0.16;
/** slot range the rail spans beyond the first / last pane */
export const RAIL_OVERHANG = 0.6;

/** Camera distance from the wall so the active pane fills ~52 % of the stage cell width. */
export function cameraDistance(cellAspect: number): number {
  const byWidth = PANE_W / ACTIVE_SHARE / (2 * HALF_TAN * Math.max(cellAspect, 0.3));
  const byHeight = MIN_VIEW_H / (2 * HALF_TAN);
  return Math.min(Math.max(byWidth, byHeight), 10);
}

/** Map a scroll progress (0..1) to the walk target s* for n panes. */
export function walkTarget(progress: number, n: number): number {
  return n > 1 ? progress * (n - 1) : 0;
}
