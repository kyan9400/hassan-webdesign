import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Curve,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
  type IUniform,
} from "three";
import type { Project } from "@/data/projects";
import { mulberry32 } from "@/lib/damp";
import { HINGE, flowerGeometry } from "../hero/Blossoms";
import { MAX_PANES, RAIL_OVERHANG, RAIL_R, RAIL_Y, THETA } from "./arrangement";

/**
 * The vine, the blossoms and the rail — all in slot space (the parent group rotates by s·θ).
 *  - Rail: a thin brass-green tube along the arc at y = −1.32; drawRange trims it to the filtered count.
 *  - Vine: 120 leaf instances (80 on medium) along the rail, one draw call. Each leaf has its slot
 *    coordinate; the vertex shader scales it to 0 past uGrow, which follows s — the vine grows as you
 *    walk the glasshouse (scroll-linked, so it also works under reduced motion, as a cut).
 *  - Blossoms: 11 instances, one at each pane's foot in the project's accent colour; a blossom opens
 *    once its project has been opened (sessionStorage["hw:visited"]).
 *  - Motes: a few pollen grains by day, blinking fireflies at night (time only runs while awake).
 */

export type VineShared = { uTime: IUniform<number>; uNight: IUniform<number>; uScale: IUniform<number> };

const RAIL_SEGMENTS = MAX_PANES * 16;
const RAIL_RADIAL = 6;
const RAIL_FROM = -RAIL_OVERHANG;
const RAIL_TO = MAX_PANES - 1 + RAIL_OVERHANG;
const BLOSSOM_SCALE = 0.1;
const BLOSSOM_TILT = 0.95; // rad: faces up and toward the centre

class Arc extends Curve<Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new Vector3()): Vector3 {
    const a = (RAIL_FROM + (RAIL_TO - RAIL_FROM) * t) * THETA;
    return target.set(RAIL_R * Math.sin(a), RAIL_Y, -RAIL_R * Math.cos(a));
  }
}

/** Local slot-space point on the rail (radius offset dr, height offset dy). */
export function railPoint(slot: number, dr: number, dy: number, out: Vector3): Vector3 {
  const a = slot * THETA;
  const r = RAIL_R + dr;
  return out.set(r * Math.sin(a), RAIL_Y + dy, -r * Math.cos(a));
}

function leafGeometry(): BufferGeometry {
  // a small pointed leaf, base at the origin, pointing +y
  const s = new Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.075, 0.07, 0, 0.19);
  s.quadraticCurveTo(-0.075, 0.07, 0, 0);
  return new ShapeGeometry(s, 4);
}

const DAY_LEAF_A = new Color("#2F7D4F");
const DAY_LEAF_B = new Color("#79C48C");
const NIGHT_LEAF_A = new Color("#2A5A3C");
const NIGHT_LEAF_B = new Color("#3E7A52");
const DAY_RAIL = new Color("#7E8B4F");
const NIGHT_RAIL = new Color("#93A46C");

export class VineRail {
  readonly group = new Group();
  readonly rail: Mesh;
  readonly leaves: InstancedMesh;
  readonly blossoms: InstancedMesh;
  readonly motes: Points;
  readonly uGrow = { value: 1 };
  readonly uEnd = { value: MAX_PANES };
  /** blossom anchor per project index, slot space (flower centre) */
  readonly anchorsLocal: Vector3[] = [];

  private readonly railMat: MeshBasicMaterial;
  private readonly leafMat: ShaderMaterial;
  private readonly blossomMat: ShaderMaterial;
  private readonly moteMat: ShaderMaterial;
  private readonly open: InstancedBufferAttribute;
  private readonly bob: InstancedBufferAttribute;
  private readonly uLeafA = { value: DAY_LEAF_A.clone() };
  private readonly uLeafB = { value: DAY_LEAF_B.clone() };
  private readonly o = new Object3D();
  private readonly v = new Vector3();
  private readonly m = new Matrix4();
  private readonly segmentIndexCount: number;

  constructor(projects: Project[], leafCount: number, shared: VineShared) {
    // ── rail
    const railGeo = new TubeGeometry(new Arc(), RAIL_SEGMENTS, 0.018, RAIL_RADIAL, false);
    this.segmentIndexCount = RAIL_RADIAL * 6;
    this.railMat = new MeshBasicMaterial({ color: DAY_RAIL.clone() });
    this.rail = new Mesh(railGeo, this.railMat);
    this.rail.frustumCulled = false;

    // ── vine leaves
    const rnd = mulberry32(1311);
    const leafGeo = leafGeometry();
    const aSlot = new Float32Array(leafCount);
    const aSeed = new Float32Array(leafCount);
    this.leafMat = new ShaderMaterial({
      uniforms: {
        uGrow: this.uGrow,
        uEnd: this.uEnd,
        uTime: shared.uTime,
        uNight: shared.uNight,
        uA: this.uLeafA,
        uB: this.uLeafB,
      },
      vertexShader: /* glsl */ `
        attribute float aSlot;
        attribute float aSeed;
        uniform float uGrow;
        uniform float uEnd;
        uniform float uTime;
        varying float vSeed;
        varying float vShade;
        void main() {
          float g = smoothstep(uGrow, uGrow - 0.7, aSlot) * (1.0 - smoothstep(uEnd - 0.15, uEnd, aSlot));
          vec3 p = position * g;
          p.x += sin(uTime * 1.6 + aSeed * 6.2831) * 0.012 * position.y * 5.0;
          vSeed = aSeed;
          vShade = 0.82 + 0.18 * position.y / 0.19;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uA;
        uniform vec3 uB;
        varying float vSeed;
        varying float vShade;
        void main() {
          gl_FragColor = vec4(mix(uA, uB, vSeed) * vShade, 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: DoubleSide,
    });
    this.leaves = new InstancedMesh(leafGeo, this.leafMat, leafCount);
    for (let i = 0; i < leafCount; i++) {
      const slot = RAIL_FROM + 0.15 + ((RAIL_TO - RAIL_FROM - 0.3) * (i + rnd() * 0.6)) / leafCount;
      aSlot[i] = slot;
      aSeed[i] = rnd();
      const up = i % 2 === 0 ? 1 : -1;
      railPoint(slot, -0.01, 0, this.o.position);
      this.o.rotation.set(0, -slot * THETA, 0);
      // alternate: up-right / down-left along the stem
      this.o.rotateZ(up > 0 ? -(0.55 + rnd() * 0.5) : Math.PI - 0.55 - rnd() * 0.5);
      this.o.rotateX(0.35 + rnd() * 0.3);
      this.o.scale.setScalar(0.75 + rnd() * 0.5);
      this.o.updateMatrix();
      this.leaves.setMatrixAt(i, this.o.matrix);
    }
    leafGeo.setAttribute("aSlot", new InstancedBufferAttribute(aSlot, 1));
    leafGeo.setAttribute("aSeed", new InstancedBufferAttribute(aSeed, 1));
    this.leaves.frustumCulled = false;

    // ── project blossoms
    const fGeo = flowerGeometry();
    const n = projects.length;
    const color = new Float32Array(n * 3);
    const c = new Color();
    projects.forEach((p, i) => {
      c.set(p.accent.swatch);
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
      this.anchorsLocal.push(new Vector3());
    });
    this.open = new InstancedBufferAttribute(new Float32Array(n), 1);
    this.open.setUsage(DynamicDrawUsage);
    this.bob = new InstancedBufferAttribute(new Float32Array(n), 1);
    this.bob.setUsage(DynamicDrawUsage);
    fGeo.setAttribute("aColor", new InstancedBufferAttribute(color, 3));
    fGeo.setAttribute("aOpen", this.open);
    fGeo.setAttribute("aBob", this.bob);
    this.blossomMat = new ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uNight: shared.uNight,
        uCentre: { value: new Color("#FFC86B") },
      },
      vertexShader: /* glsl */ `
        attribute float aPetal;
        attribute vec2 aDir;
        attribute vec3 aColor;
        attribute float aOpen;
        attribute float aBob;
        uniform float uTime;
        varying float vPetal;
        varying vec3 vColor;
        void main() {
          float open = aOpen * aOpen * (3.0 - 2.0 * aOpen);
          float hinge = mix(1.3, 0.2, open);
          vec3 p = position;
          if (aPetal > 0.5) {
            float rr = dot(p.xz, aDir);
            vec2 t = p.xz - rr * aDir;
            float L = max(rr - ${HINGE.toFixed(2)}, 0.0);
            p.xz = t + aDir * (${HINGE.toFixed(2)} + L * cos(hinge));
            p.y = L * sin(hinge) + L * L * 0.12;
          }
          p *= mix(0.6, 1.0, open);
          p.x += sin(uTime * 16.0) * 0.18 * aBob * p.y;
          p.z += cos(uTime * 13.0) * 0.12 * aBob * p.y;
          vPetal = aPetal;
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uCentre;
        uniform float uNight;
        varying float vPetal;
        varying vec3 vColor;
        void main() {
          vec3 c = mix(uCentre, vColor, vPetal);
          gl_FragColor = vec4(c * (0.92 + 0.5 * uNight * vPetal), 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: DoubleSide,
    });
    this.blossoms = new InstancedMesh(fGeo, this.blossomMat, n);
    this.blossoms.frustumCulled = false;

    // ── pollen by day, fireflies at night
    const motes = 40;
    const pos = new Float32Array(motes * 3);
    const seed = new Float32Array(motes * 4);
    for (let i = 0; i < motes; i++) {
      const slot = RAIL_FROM + rnd() * (RAIL_TO - RAIL_FROM);
      railPoint(slot, -0.25 - rnd() * 0.5, -0.2 + rnd() * 2.4, this.v);
      pos[i * 3] = this.v.x;
      pos[i * 3 + 1] = this.v.y;
      pos[i * 3 + 2] = this.v.z;
      seed[i * 4] = rnd();
      seed[i * 4 + 1] = rnd();
      seed[i * 4 + 2] = rnd();
      seed[i * 4 + 3] = slot;
    }
    const mGeo = new BufferGeometry();
    mGeo.setAttribute("position", new BufferAttribute(pos, 3));
    mGeo.setAttribute("aSeed", new BufferAttribute(seed, 4));
    this.moteMat = new ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uNight: shared.uNight,
        uScale: shared.uScale,
        uEnd: this.uEnd,
        uDay: { value: new Color("#FFC86B") },
        uFire: { value: new Color("#E8FF9E") },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform float uNight;
        uniform float uScale;
        uniform float uEnd;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.5 + aSeed.x * 6.2831) * 0.18;
          p.x += sin(uTime * 0.3 + aSeed.y * 6.2831) * 0.22;
          p.z += cos(uTime * 0.27 + aSeed.z * 6.2831) * 0.12;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float blink = pow(sin(uTime * 2.0 + aSeed.x * 40.0) * 0.5 + 0.5, 6.0);
          float inside = step(aSeed.w, uEnd - 0.4);
          vAlpha = mix(0.4, 0.15 + 0.85 * blink, uNight) * inside;
          gl_PointSize = mix(0.035, 0.05, uNight) * uScale / max(-mv.z, 0.1);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDay;
        uniform vec3 uFire;
        uniform float uNight;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(uDay, uFire * 1.4, uNight), a);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.motes = new Points(mGeo, this.moteMat);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 4;

    this.group.add(this.rail, this.leaves, this.blossoms, this.motes);
  }

  /** Trim the rail to the filtered number of panes (damped by the caller). */
  setLength(n: number) {
    const to = Math.max(1, n) - 1 + RAIL_OVERHANG;
    const f = Math.min(1, Math.max(0, (to - RAIL_FROM) / (RAIL_TO - RAIL_FROM)));
    const segs = Math.ceil(f * RAIL_SEGMENTS);
    this.rail.geometry.setDrawRange(0, segs * this.segmentIndexCount);
    this.uEnd.value = to;
  }

  /** Place project i's blossom at its slot (vis 0..1 hides filtered-out projects). */
  setBlossom(i: number, slot: number, vis: number) {
    railPoint(slot, -0.04, 0.03, this.o.position);
    this.o.rotation.set(0, -slot * THETA, 0);
    this.o.rotateX(BLOSSOM_TILT);
    this.o.scale.setScalar(BLOSSOM_SCALE * vis);
    this.o.updateMatrix();
    this.blossoms.setMatrixAt(i, this.o.matrix);
    // flower centre (a little above the anchor along its face normal)
    this.v.set(0, 0.06, 0).applyMatrix4(this.m.makeRotationFromEuler(this.o.rotation));
    this.anchorsLocal[i].copy(this.o.position).add(this.v);
  }

  commitBlossoms() {
    this.blossoms.instanceMatrix.needsUpdate = true;
  }

  setOpen(i: number, v: number) {
    this.open.setX(i, v);
    this.open.needsUpdate = true;
  }

  setBob(i: number, v: number) {
    this.bob.setX(i, v);
    this.bob.needsUpdate = true;
  }

  getBob(i: number): number {
    return this.bob.getX(i);
  }

  setNight(n: number) {
    this.railMat.color.copy(DAY_RAIL).lerp(NIGHT_RAIL, n);
    this.uLeafA.value.copy(DAY_LEAF_A).lerp(NIGHT_LEAF_A, n);
    this.uLeafB.value.copy(DAY_LEAF_B).lerp(NIGHT_LEAF_B, n);
  }

  dispose() {
    this.rail.geometry.dispose();
    this.leaves.geometry.dispose();
    this.blossoms.geometry.dispose();
    this.motes.geometry.dispose();
    this.railMat.dispose();
    this.leafMat.dispose();
    this.blossomMat.dispose();
    this.moteMat.dispose();
  }
}
