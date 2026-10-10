import { mulberry32 } from "@/lib/damp";

/**
 * "The living skyline" layout, shared by the server-rendered poster (HeroPoster) and the 3D scene,
 * so the cross-fade from drawing to 3D lines up. Pure data, no three.js.
 * World units: 1 unit = 100 poster viewBox px; y = 0 is the hill line, the hill base is y = −0.3.
 * Tower `z` is the FRONT face; each tower is extruded backwards by 0.6 × width.
 */

export type TowerDef = { id: string; x: number; w: number; h: number; r: number; z: number };

export const TOWERS: TowerDef[] = [
  { id: "E1", x: -8.65, w: 1.1, h: 1.6, r: 0.55, z: -1.8 },
  { id: "E2", x: -7.05, w: 1.3, h: 2.0, r: 0.14, z: -1.2 },
  { id: "1", x: -5.45, w: 1.1, h: 2.8, r: 0.18, z: -0.6 },
  { id: "2", x: -3.9, w: 1.4, h: 3.8, r: 0.7, z: 0.0 },
  { id: "3", x: -2.3, w: 1.0, h: 2.4, r: 0.12, z: -1.4 },
  { id: "4", x: -0.6, w: 1.6, h: 4.3, r: 0.24, z: 0.2 },
  { id: "5", x: 1.2, w: 1.2, h: 3.2, r: 0.6, z: -0.8 },
  { id: "6", x: 2.95, w: 1.5, h: 2.2, r: 0.16, z: -1.6 },
  { id: "7", x: 4.75, w: 1.3, h: 3.5, r: 0.2, z: 0.0 },
  { id: "8", x: 6.25, w: 1.1, h: 2.1, r: 0.55, z: -1.0 },
  { id: "E3", x: 7.7, w: 1.2, h: 1.8, r: 0.16, z: -1.4 },
  { id: "E4", x: 9.05, w: 0.9, h: 1.4, r: 0.45, z: -2.0 },
];

/** Faint back row (3D only), mixed 70% toward the sky colour. Extends below the hill so it never floats. */
export const BACK_TOWERS: TowerDef[] = [
  { id: "B1", x: -7.6, w: 1.4, h: 2.2, r: 0.2, z: -4.5 },
  { id: "B2", x: -4.7, w: 1.2, h: 3.0, r: 0.6, z: -4.5 },
  { id: "B3", x: -1.6, w: 1.6, h: 2.5, r: 0.18, z: -4.5 },
  { id: "B4", x: 2.1, w: 1.3, h: 2.9, r: 0.22, z: -4.5 },
  { id: "B5", x: 5.4, w: 1.5, h: 1.9, r: 0.75, z: -4.5 },
  { id: "B6", x: 8.4, w: 1.2, h: 1.5, r: 0.16, z: -4.5 },
];
export const BACK_BASE_Y = -1.6;

export const TOWER_BASE_Y = -0.3;
export const HILL = { xMin: -30, xMax: 30, zBack: -3.5, zFront: 1.5, baseY: -0.3 } as const;

/** Hill top line (world y at world x). Gentle, like the draft's hill. */
export function hillTop(x: number): number {
  return 0.09 * Math.sin(0.55 * x + 0.8) + 0.05 * Math.sin(1.3 * x + 2.1) - 0.02;
}

export const towerDepth = (t: TowerDef) => 0.6 * t.w;
export const towerCentreZ = (t: TowerDef) => t.z - 0.3 * t.w;

/** Roof height of a tower at world x (follows the rounded / pill top). */
export function roofY(t: TowerDef, x: number): number {
  const half = t.w / 2;
  const dx = Math.abs(x - t.x);
  const inner = half - t.r;
  if (dx <= inner) return t.h;
  const k = Math.min(t.r, dx - inner);
  return t.h - t.r + Math.sqrt(Math.max(0, t.r * t.r - k * k));
}

export type CanopyDef = {
  x: number;
  y: number;
  z: number;
  r: number;
  /** 0 = fern, 1 = leaf */
  tone: 0 | 1;
  tower: number;
  kind: "crown" | "roof" | "terrace";
  keepMedium: boolean;
  phase: number;
};

export type BlossomDef = {
  x: number;
  y: number;
  z: number;
  /** ripple delay for the opening intro (0 … 1.2) */
  delay: number;
  /** how strongly it turns toward the light (0.55 … 1) */
  stiff: number;
  canopy: number;
  keepMedium: boolean;
};

const MAIN = new Set(["1", "2", "3", "4", "5", "6", "7", "8"]);
const TERRACED = new Set(["2", "4", "5", "7"]);
export const PERCH_TOWER = 5; // index of tower "4" in TOWERS

function buildCanopies(): CanopyDef[] {
  const rnd = mulberry32(20260417);
  const out: CanopyDef[] = [];
  TOWERS.forEach((t, ti) => {
    const main = MAIN.has(t.id);
    const big = t.id === "2";
    const zc = towerCentreZ(t);
    const depth = towerDepth(t);
    // crown: one rounded mound in the middle of the roof
    const crownR = big ? 0.42 : 0.2 + t.w * 0.06;
    out.push({
      x: t.x + (rnd() - 0.5) * 0.08,
      y: roofY(t, t.x) + crownR * 0.55,
      z: zc + (rnd() - 0.2) * depth * 0.2,
      r: crownR,
      tone: 1,
      tower: ti,
      kind: "crown",
      keepMedium: true,
      phase: rnd() * Math.PI * 2,
    });
    // roof line
    const n = main ? (big ? 6 : Math.min(5, Math.max(3, Math.round(t.w * 3)))) : Math.max(2, Math.round(t.w * 2.4));
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const x = t.x + (u - 0.5) * t.w * 0.86 + (rnd() - 0.5) * 0.06;
      const r = big ? 0.22 + rnd() * 0.16 : 0.13 + rnd() * 0.11;
      out.push({
        x,
        y: roofY(t, x) + r * 0.25,
        z: zc + (rnd() - 0.35) * depth * 0.55,
        r,
        tone: rnd() > 0.45 ? 0 : 1,
        tower: ti,
        kind: "roof",
        keepMedium: main,
        phase: rnd() * Math.PI * 2,
      });
    }
    // two terrace levels on towers 2, 4, 5 and 7
    if (TERRACED.has(t.id)) {
      for (const level of [0.42, 0.7]) {
        for (let j = 0; j < 2; j++) {
          const r = 0.12 + rnd() * 0.07;
          const side = j === 0 ? -1 : 1;
          out.push({
            x: t.x + side * t.w * (0.18 + rnd() * 0.16),
            y: t.h * level + r * 0.2,
            z: t.z + r * 0.35,
            r,
            tone: rnd() > 0.5 ? 0 : 1,
            tower: ti,
            kind: "terrace",
            keepMedium: j === 0,
            phase: rnd() * Math.PI * 2,
          });
        }
      }
    }
  });
  return out;
}

export const CANOPIES: CanopyDef[] = buildCanopies();

function buildBlossoms(): BlossomDef[] {
  const rnd = mulberry32(777);
  const perch = CANOPIES.find((c) => c.tower === PERCH_TOWER && c.kind === "crown")!;
  type Cand = BlossomDef & { prio: number };
  const cands: Cand[] = [];
  CANOPIES.forEach((c, ci) => {
    const t = TOWERS[c.tower];
    if (!MAIN.has(t.id) && c.kind !== "crown") return;
    const count = c.r > 0.26 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const a = (rnd() - 0.5) * (c.kind === "terrace" ? 1.2 : 1.6);
      const dy = c.kind === "terrace" ? 0.45 : 0.7 + rnd() * 0.25;
      const dz = c.kind === "terrace" ? 0.85 : 0.5 + rnd() * 0.35;
      const len = Math.hypot(a, dy, dz);
      const R = c.r * 0.98;
      cands.push({
        x: c.x + (a / len) * R,
        y: c.y + (dy / len) * R,
        z: c.z + (dz / len) * R,
        delay: 0,
        stiff: 0.55 + rnd() * 0.45,
        canopy: ci,
        keepMedium: false,
        prio: (c.tower === PERCH_TOWER ? 0 : 1) + (c.kind === "terrace" ? 0.6 : 0) + rnd() * 0.9,
      });
    }
  });
  cands.sort((p, q) => p.prio - q.prio);
  const chosen = cands.slice(0, 44);
  let maxD = 0;
  for (const b of chosen) maxD = Math.max(maxD, Math.hypot(b.x - perch.x, b.y - perch.y));
  chosen.forEach((b, i) => {
    b.delay = (Math.hypot(b.x - perch.x, b.y - perch.y) / (maxD || 1)) * 1.2;
    b.keepMedium = i < 30;
  });
  // stable left-to-right order for drawing
  return chosen
    .sort((p, q) => p.x - q.x)
    .map(({ x, y, z, delay, stiff, canopy, keepMedium }) => ({ x, y, z, delay, stiff, canopy, keepMedium }));
}

export const BLOSSOMS: BlossomDef[] = buildBlossoms();

const perchCrown = CANOPIES.find((c) => c.tower === PERCH_TOWER && c.kind === "crown")!;

/** Where the bird perches: on tower 4's canopy. */
export const PERCH = { x: perchCrown.x + 0.05, y: perchCrown.y + perchCrown.r * 0.92, z: perchCrown.z + 0.08 };

/** The blossom the bird is drawn sipping in the poster (tower 4, right side, facing the camera). */
export const START_BLOSSOM = (() => {
  let best = 0;
  let bestX = -Infinity;
  BLOSSOMS.forEach((b, i) => {
    if (CANOPIES[b.canopy].tower === PERCH_TOWER && b.keepMedium && b.x > bestX) {
      bestX = b.x;
      best = i;
    }
  });
  return best;
})();

/** Bird body-centre offset from the flower it sips (bird to the right, facing left). */
export const SIP_OFFSET = { x: 0.27, y: -0.2, z: 0.1 };

export const BIRD_START = {
  x: BLOSSOMS[START_BLOSSOM].x + SIP_OFFSET.x,
  y: BLOSSOMS[START_BLOSSOM].y + SIP_OFFSET.y,
  z: BLOSSOMS[START_BLOSSOM].z + SIP_OFFSET.z,
};
