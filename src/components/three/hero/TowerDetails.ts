import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Points,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  Vector2,
  type IUniform,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Tier } from "@/lib/quality";
import { CANOPIES, TOWERS, hillTop, towerDepth, type TowerDef } from "./layout";

/**
 * Details that read from 10 m, merged into one metal mesh plus one point sprite:
 *  - roof parapets on the flat-roof towers (r < 0.3): a thin ring (0.035 high, 0.02 thick) round
 *    the flat part of the roof, all four sides, so the backs look finished too;
 *  - vertical fins on the front faces of towers 4 and 7, standing 0.012 off the glass;
 *  - a tapered lathe spire with a ball tip on tower 4, placed in the roof's clearest corner.
 * Brushed aluminium: MeshStandardMaterial (metalness 0.85, roughness 0.32), MeshPhysicalMaterial
 * with anisotropy 0.6 on high; it reflects the code-made environment.
 * The aircraft light on the spire tip is a red point sprite, night only; it blinks with uTime,
 * which only advances while the scene is awake, so it never forces frames.
 */

const BEVEL = 0.04;
const PARAPET_H = 0.035;
const PARAPET_T = 0.02;
const FIN_GAP = 0.012;
const SPIRE_H = 0.9;

function parapet(t: TowerDef): BufferGeometry {
  const hx = t.w / 2 - t.r - 0.01; // the flat part of the roof, inset 0.01
  const z1 = t.z - 0.01;
  const z0 = t.z - towerDepth(t) + 0.01;
  // shape in (x, −z): rotateX(−90°) turns the extrusion upward and shape y into −z
  const outer = new Shape();
  outer.moveTo(t.x - hx, -z1);
  outer.lineTo(t.x + hx, -z1);
  outer.lineTo(t.x + hx, -z0);
  outer.lineTo(t.x - hx, -z0);
  outer.closePath();
  const hole = new Path();
  hole.moveTo(t.x - hx + PARAPET_T, -z1 + PARAPET_T);
  hole.lineTo(t.x - hx + PARAPET_T, -z0 - PARAPET_T);
  hole.lineTo(t.x + hx - PARAPET_T, -z0 - PARAPET_T);
  hole.lineTo(t.x + hx - PARAPET_T, -z1 + PARAPET_T);
  hole.closePath();
  outer.holes.push(hole);
  const g = new ExtrudeGeometry(outer, { depth: PARAPET_H, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, t.h + BEVEL, 0);
  return g;
}

function fins(t: TowerDef, n: number): BufferGeometry[] {
  const base = hillTop(t.x) - 0.05;
  const top = t.h - t.r - 0.06;
  const h = top - base;
  const out: BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const x = t.x + (i / (n - 1) - 0.5) * t.w * 0.78;
    const g = new BoxGeometry(0.02, h, 0.05);
    g.translate(x, base + h / 2, t.z + BEVEL + FIN_GAP + 0.025);
    out.push(g);
  }
  return out;
}

/** The roof spot farthest from every canopy mound on the tower (back half of the roof). */
function spireSpot(t: TowerDef, ti: number): { x: number; z: number } {
  const mounds = CANOPIES.filter((c) => c.tower === ti);
  const depth = towerDepth(t);
  let best = { x: t.x, z: t.z - depth * 0.8 };
  let bestD = -Infinity;
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 3; j++) {
      const x = t.x + (i / 8 - 0.5) * (t.w - 2 * t.r - 0.12);
      const z = t.z - depth * (0.55 + j * 0.12);
      let d = Infinity;
      for (const m of mounds) d = Math.min(d, Math.hypot(x - m.x, z - m.z) - m.r);
      if (d > bestD) {
        bestD = d;
        best = { x, z };
      }
    }
  }
  return best;
}

function spire(t: TowerDef, ti: number): { geo: BufferGeometry; tip: [number, number, number] } {
  const { x, z } = spireSpot(t, ti);
  const y0 = t.h + BEVEL - 0.005;
  const profile = [
    [0.045, 0],
    [0.045, 0.06],
    [0.028, 0.08],
    [0.022, 0.4],
    [0.012, 0.75],
    [0.006, SPIRE_H],
    [0, SPIRE_H],
  ].map(([r, y]) => new Vector2(r, y));
  const mast = new LatheGeometry(profile, 12);
  mast.translate(x, y0, z);
  const ball = new SphereGeometry(0.022, 10, 8);
  ball.translate(x, y0 + SPIRE_H + 0.012, z);
  const geo = mergeGeometries([mast.toNonIndexed(), ball.toNonIndexed()], false)!;
  mast.dispose();
  ball.dispose();
  return { geo, tip: [x, y0 + SPIRE_H + 0.05, z] };
}

export type DetailShared = { uTime: IUniform<number>; uNight: IUniform<number>; uScale: IUniform<number> };

export class TowerDetails {
  readonly mesh: Mesh;
  readonly beacon: Points;
  private readonly mat: MeshStandardMaterial;

  constructor(tier: Tier, shared: DetailShared) {
    const parts: BufferGeometry[] = [];
    const t4 = TOWERS.findIndex((t) => t.id === "4");
    const t7 = TOWERS.findIndex((t) => t.id === "7");
    TOWERS.forEach((t) => {
      if (t.r < 0.3) parts.push(parapet(t).toNonIndexed());
    });
    for (const g of fins(TOWERS[t4], 5)) parts.push(g.toNonIndexed());
    for (const g of fins(TOWERS[t7], 4)) parts.push(g.toNonIndexed());
    const sp = spire(TOWERS[t4], t4);
    parts.push(sp.geo);
    // uvs stay: the high tier's anisotropic metal builds its brushing direction from them
    for (const p of parts) if (!p.getAttribute("normal")) p.computeVertexNormals();
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!merged) throw new Error("tower details merge failed");
    merged.computeBoundingSphere();

    const metal = { color: new Color("#DDE6E0"), metalness: 0.85, roughness: 0.32 };
    this.mat = tier === "high" ? new MeshPhysicalMaterial({ ...metal, anisotropy: 0.6, anisotropyRotation: Math.PI / 2 }) : new MeshStandardMaterial(metal);
    this.mesh = new Mesh(merged, this.mat);

    // the aircraft light: one red point, night only, blinking while awake
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(sp.tip), 3));
    const bm = new ShaderMaterial({
      uniforms: { uTime: shared.uTime, uNight: shared.uNight, uScale: shared.uScale, uColor: { value: new Color("#FF5A4E") } },
      vertexShader: /* glsl */ `
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 0.12 * uScale / max(-mv.z, 0.1);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNight;
        uniform vec3 uColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a = a * a * uNight * step(0.5, fract(uTime * 0.5));
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor * a * 1.6, a);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.beacon = new Points(g, bm);
    this.beacon.frustumCulled = false;
    this.beacon.renderOrder = 6;
    this.beacon.visible = false;
  }

  setNight(night: number) {
    // no draw call by day
    this.beacon.visible = night > 0.02;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.beacon.geometry.dispose();
    (this.beacon.material as ShaderMaterial).dispose();
  }
}
