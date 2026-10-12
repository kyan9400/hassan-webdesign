import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural hummingbird, modelled in code. Model units: ~0.85 long (the mesh group is scaled
 * to ≈ 0.5 world units). Forward is +x, up is +y. Body centre at the origin.
 *
 * Body and head are ONE lofted surface (no seam): 40 stations along x from the tail root to the
 * forehead, each a superellipse cross-section (n = 2.4) whose half-height, half-width and centre
 * height come from Catmull-Rom profiles (a teardrop body flowing through a neck dip into a smaller
 * head). 28 segments around, closed by pole vertices, smooth vertex normals.
 * Bill / tail / eyes / legs are merged in with vertex colours: back leaf → flank #3FB59A → belly
 * #E8F1E6. Legs carry `aLeg = 1` (folded away while flying); eyes carry `aGloss = 1` (glossy).
 */

const BACK = new Color("#2F7D4F");
const FLANK = new Color("#3FB59A");
const BELLY = new Color("#E8F1E6");
const DARK = new Color("#1B241F");
const TAIL = new Color("#24663F");

export const BIRD_SCALE = 0.6;
/** Bill tip in model units (used to place the bird at a flower). */
export const BILL_TIP = { x: 0.6, y: 0.0 };
/** Shoulder (wing pivot) in model units. */
export const SHOULDER = { x: 0.03, y: 0.085, z: 0.075 };

// ───────────────────────── loft profiles ─────────────────────────

/** Knots: x, half-height, half-width, centre y. Ends are poles (zero radius). */
const KNOTS: [number, number, number, number][] = [
  [-0.22, 0.0, 0.0, 0.0],
  [-0.17, 0.05, 0.045, 0.0],
  [-0.1, 0.095, 0.085, 0.0],
  [-0.02, 0.125, 0.115, 0.0],
  [0.05, 0.118, 0.108, 0.012],
  [0.105, 0.084, 0.077, 0.034], // the neck dip
  [0.145, 0.083, 0.076, 0.05],
  [0.19, 0.09, 0.083, 0.06], // the head
  [0.245, 0.062, 0.057, 0.062],
  [0.275, 0.026, 0.023, 0.058],
  [0.288, 0.0, 0.0, 0.056],
];

const STATIONS = 40;
const AROUND = 28;
const SE_N = 2.4;

/** Uniform Catmull-Rom through the knots, u ∈ [0, KNOTS.length − 1]. */
function profile(u: number, k: 0 | 1 | 2 | 3): number {
  const n = KNOTS.length;
  const i = Math.min(n - 2, Math.max(0, Math.floor(u)));
  const t = u - i;
  const p0 = KNOTS[Math.max(0, i - 1)][k];
  const p1 = KNOTS[i][k];
  const p2 = KNOTS[i + 1][k];
  const p3 = KNOTS[Math.min(n - 1, i + 2)][k];
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export type LoftSample = { x: number; hh: number; hw: number; cy: number };

/** The loft at station s (0 … STATIONS − 1). */
export function loftAt(s: number): LoftSample {
  const u = (s / (STATIONS - 1)) * (KNOTS.length - 1);
  return { x: profile(u, 0), hh: Math.max(0, profile(u, 1)), hw: Math.max(0, profile(u, 2)) * 0.96, cy: profile(u, 3) };
}

const se = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / SE_N);

/**
 * The indexed loft: rings for stations 1 … STATIONS − 2 (AROUND vertices each, angle θ = 2πj/AROUND,
 * y = cy + hh·se(sin θ), z = hw·se(cos θ)), plus a pole at each end. Vertex index of ring r
 * (station r + 1), segment j: r·AROUND + j; poles at the end.
 */
function buildLoft(): BufferGeometry {
  const rings = STATIONS - 2;
  const pos = new Float32Array((rings * AROUND + 2) * 3);
  let v = 0;
  for (let r = 0; r < rings; r++) {
    const { x, hh, hw, cy } = loftAt(r + 1);
    for (let j = 0; j < AROUND; j++) {
      const th = (j / AROUND) * Math.PI * 2;
      pos[v * 3] = x;
      pos[v * 3 + 1] = cy + hh * se(Math.sin(th));
      pos[v * 3 + 2] = hw * se(Math.cos(th));
      v++;
    }
  }
  const tail = loftAt(0);
  const nose = loftAt(STATIONS - 1);
  const tailPole = v;
  pos.set([tail.x, tail.cy, 0], v++ * 3);
  const nosePole = v;
  pos.set([nose.x, nose.cy, 0], v++ * 3);

  const idx: number[] = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let j = 0; j < AROUND; j++) {
      const a = r * AROUND + j;
      const b = r * AROUND + ((j + 1) % AROUND);
      const c = a + AROUND;
      const d = b + AROUND;
      // outward-facing (x grows along the rings, θ turns from +z up to +y)
      idx.push(a, c, b, b, c, d);
    }
  }
  for (let j = 0; j < AROUND; j++) {
    const a = j;
    const b = (j + 1) % AROUND;
    idx.push(tailPole, a, b);
    const last = (rings - 1) * AROUND;
    idx.push(nosePole, last + b, last + a);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const tmp = new Color();
function plumage(ny: number): Color {
  if (ny > 0.25) return tmp.copy(FLANK).lerp(BACK, Math.min(1, (ny - 0.25) / 0.55));
  if (ny < -0.15) return tmp.copy(FLANK).lerp(BELLY, Math.min(1, (-ny - 0.15) / 0.5));
  return tmp.copy(FLANK);
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Colours, leg and gloss flags on any geometry, as a non-indexed copy. */
function paint(geo: BufferGeometry, fn: (ny: number, x: number, y: number) => Color, leg = 0, gloss = 0): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute("uv")) g.deleteAttribute("uv");
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const colors = new Float32Array(pos.count * 3);
  const legs = new Float32Array(pos.count).fill(leg);
  const glosses = new Float32Array(pos.count).fill(gloss);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(nor.getY(i), pos.getX(i), pos.getY(i));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.setAttribute("aLeg", new BufferAttribute(legs, 1));
  g.setAttribute("aGloss", new BufferAttribute(glosses, 1));
  return g;
}

let loftCache: BufferGeometry | null = null;
function loft(): BufferGeometry {
  if (!loftCache) loftCache = buildLoft();
  return loftCache;
}

export function createBirdBodyGeometry(): BufferGeometry {
  const body = loft();

  // eyes: on the head, sunk 40 % into the surface
  const eyeX = 0.232;
  let at = loftAt(0);
  for (let k = 1; k < STATIONS; k++) {
    const c = loftAt(k);
    if (Math.abs(c.x - eyeX) < Math.abs(at.x - eyeX)) at = c;
  }
  const eyeY = at.cy + at.hh * 0.42;
  const eyeZ = at.hw * 0.9 + 0.017 * 0.2;
  const eyeL = new SphereGeometry(0.017, 10, 8);
  eyeL.translate(eyeX, eyeY, eyeZ);
  const eyeR = new SphereGeometry(0.017, 10, 8);
  eyeR.translate(eyeX, eyeY, -eyeZ);

  // bill: a thin cone, bent slightly down (y −= 0.15·u²), rooted inside the forehead
  const bill = new ConeGeometry(0.014, 0.32, 8, 6);
  bill.rotateZ(-Math.PI / 2); // tip → +x
  bill.translate(0.26 + 0.16, 0.055, 0);
  {
    const p = bill.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const u = Math.max(0, p.getX(i) - 0.26);
      p.setY(i, p.getY(i) - 0.15 * u * u);
    }
    bill.computeVertexNormals();
  }

  // tail: a five-feather forked fan
  const tailShape = new Shape();
  tailShape.moveTo(0, 0.024);
  tailShape.lineTo(-0.175, 0.078);
  tailShape.lineTo(-0.13, 0.04);
  tailShape.lineTo(-0.155, 0.02);
  tailShape.lineTo(-0.118, 0.004);
  tailShape.lineTo(-0.152, -0.016);
  tailShape.lineTo(-0.13, -0.036);
  tailShape.lineTo(-0.172, -0.07);
  tailShape.lineTo(0, -0.018);
  tailShape.closePath();
  const tail = new ExtrudeGeometry(tailShape, { depth: 0.01, bevelEnabled: false });
  tail.translate(-0.17, -0.01, -0.005);
  tail.rotateZ(-0.12);

  // legs (only shown when perched)
  const legL = new CylinderGeometry(0.006, 0.006, 0.07, 5);
  legL.translate(0.02, -0.13, 0.03);
  const legR = new CylinderGeometry(0.006, 0.006, 0.07, 5);
  legR.translate(0.02, -0.13, -0.03);

  const parts = [
    // the head's back is a little darker than the body's: blend the plumage over the neck
    paint(body, (ny, x) => plumage(ny + 0.15 * smooth(0.08, 0.16, x))),
    paint(eyeL, () => DARK, 0, 1),
    paint(eyeR, () => DARK, 0, 1),
    paint(bill, () => DARK),
    paint(tail, () => TAIL),
    paint(legL, () => DARK, 1),
    paint(legR, () => DARK, 1),
  ];
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("bird geometry merge failed");
  merged.computeBoundingSphere();
  return merged;
}

/**
 * The iridescent throat patch: the throat stations of the same loft (24–31, x ≈ 0.14 … 0.24), the
 * lower ~120°, pushed 0.004
 * out along the loft's own normals, so it lies on the surface with real clearance.
 */
export function createGorgetGeometry(): BufferGeometry {
  const src = loft();
  const sp = src.getAttribute("position");
  const sn = src.getAttribute("normal");
  const r0 = 24 - 1; // ring index = station − 1
  const r1 = 31 - 1;
  // lower arc: θ around 270° (straight down), 11 of 28 segments ≈ 141° of vertices, 10 spans ≈ 129°
  const j0 = Math.round(AROUND * 0.75) - 5;
  const cols = 11;
  const rows = r1 - r0 + 1;
  const pos = new Float32Array(rows * cols * 3);
  const nor = new Float32Array(rows * cols * 3);
  let v = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = 0; c < cols; c++) {
      const j = (j0 + c + AROUND) % AROUND;
      const i = r * AROUND + j;
      const nx = sn.getX(i);
      const ny = sn.getY(i);
      const nz = sn.getZ(i);
      pos[v * 3] = sp.getX(i) + nx * 0.004;
      pos[v * 3 + 1] = sp.getY(i) + ny * 0.004;
      pos[v * 3 + 2] = sp.getZ(i) + nz * 0.004;
      nor[v * 3] = nx;
      nor[v * 3 + 1] = ny;
      nor[v * 3 + 2] = nz;
      v++;
    }
  }
  const idx: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("normal", new BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

