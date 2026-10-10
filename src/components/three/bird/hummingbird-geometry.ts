import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural hummingbird, modelled in code. Model units: ~0.85 long (the mesh group is scaled
 * to ≈ 0.5 world units). Forward is +x, up is +y. Body centre at the origin.
 * Body / head / bill / tail / eyes / legs are merged into one geometry with vertex colours:
 * back leaf → flank #3FB59A → belly #E8F1E6. Legs carry `aLeg = 1` so the material can fold them
 * away while flying.
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

function paint(geo: BufferGeometry, fn: (ny: number, x: number, y: number) => Color, leg = 0): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const colors = new Float32Array(pos.count * 3);
  const legs = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(nor.getY(i), pos.getX(i), pos.getY(i));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    legs[i] = leg;
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.setAttribute("aLeg", new BufferAttribute(legs, 1));
  return g;
}

const tmp = new Color();
function plumage(ny: number): Color {
  if (ny > 0.25) return tmp.copy(FLANK).lerp(BACK, Math.min(1, (ny - 0.25) / 0.55));
  if (ny < -0.15) return tmp.copy(FLANK).lerp(BELLY, Math.min(1, (-ny - 0.15) / 0.5));
  return tmp.copy(FLANK);
}

export function createBirdBodyGeometry(): BufferGeometry {
  // body: lathe of the teardrop profile, laid horizontally (blunt end forward)
  const profile = [
    [0, 0], [0.06, 0.02], [0.11, 0.08], [0.13, 0.16], [0.12, 0.26], [0.09, 0.33], [0.05, 0.37], [0, 0.38],
  ].map(([r, y]) => new Vector2(r, y));
  const body = new LatheGeometry(profile, 20);
  body.rotateZ(Math.PI / 2); // +y → −x
  body.translate(0.16, 0, 0);
  body.scale(1, 1, 0.92);

  const head = new SphereGeometry(0.09, 18, 12);
  head.translate(0.19, 0.06, 0);

  const eyeL = new SphereGeometry(0.017, 8, 6);
  eyeL.translate(0.235, 0.085, 0.07);
  const eyeR = new SphereGeometry(0.017, 8, 6);
  eyeR.translate(0.235, 0.085, -0.07);

  // bill: a thin cone, bent slightly down (y −= 0.15·u²)
  const bill = new ConeGeometry(0.014, 0.32, 6, 6);
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
    paint(body, (ny) => plumage(ny)),
    paint(head, (ny) => plumage(ny + 0.15)),
    paint(eyeL, () => DARK),
    paint(eyeR, () => DARK),
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

/** The iridescent throat patch, a partial sphere under the head. */
export function createGorgetGeometry(): BufferGeometry {
  const g = new SphereGeometry(0.094, 16, 8, Math.PI - 1.25, 2.5, 1.7, 1.05);
  g.translate(0.19, 0.055, 0);
  return g;
}
