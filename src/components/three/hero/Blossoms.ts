import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from "three";
import type { Tier } from "@/lib/quality";
import { BLOSSOMS, START_BLOSSOM, type BlossomDef } from "./layout";
import { DAY } from "./palette";

/**
 * Blossoms — one InstancedMesh of a 5-petal flower (~33 tris; bloom petals, sun centre).
 * Per instance: aDelay (ripple intro), aStiff (how far it turns), aBob (sip bob, CPU-written).
 * Vertex shader:
 *  - opening: petal hinge angle mix(1.25, 0.15, open), open = clamp((uOpen − aDelay)/0.35, 0, 1)
 *  - heliotropism: dir = normalize(mix(up, normalize(uSun − anchor), 0.65·aStiff)); the flower basis is
 *    oriented to `dir` before the instance translation/scale. All flowers turn on the GPU with one uniform.
 *  - night: petals become emissive (bloom × 0.6 × uNight).
 */

export type BlossomShared = {
  uTime: IUniform<number>;
  uNight: IUniform<number>;
  uSun: IUniform<Vector3>;
  uLightDir: IUniform<Vector3>;
};

export const HINGE = 0.18;

/** The 5-petal flower (petals laid flat in XZ, hinge at r = HINGE). Shared with the gallery vine. */
export function flowerGeometry(): BufferGeometry {
  const pos: number[] = [];
  const petal: number[] = [];
  const dir: number[] = [];
  const push = (x: number, y: number, z: number, p: number, dx: number, dz: number) => {
    pos.push(x, y, z);
    petal.push(p);
    dir.push(dx, dz);
  };
  // 5 petals, each a 5-triangle strip from the hinge to the tip, laid flat in XZ
  const rows: [number, number][] = [
    [HINGE, 0.1],
    [0.45, 0.25],
    [0.75, 0.24],
    [0.93, 0.13],
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const tx = -dz;
    const tz = dx;
    const P = (r: number, w: number, s: number): [number, number, number] => [dx * r + tx * w * s, 0, dz * r + tz * w * s];
    for (let i = 0; i < rows.length - 1; i++) {
      const [r0, w0] = rows[i];
      const [r1, w1] = rows[i + 1];
      const a0 = P(r0, w0, -1);
      const b0 = P(r0, w0, 1);
      const a1 = P(r1, w1, -1);
      const b1 = P(r1, w1, 1);
      push(...a0, 1, dx, dz);
      push(...b0, 1, dx, dz);
      push(...b1, 1, dx, dz);
      push(...a0, 1, dx, dz);
      push(...b1, 1, dx, dz);
      push(...a1, 1, dx, dz);
    }
    const [rl, wl] = rows[rows.length - 1];
    const al = P(rl, wl, -1);
    const bl = P(rl, wl, 1);
    push(...al, 1, dx, dz);
    push(...bl, 1, dx, dz);
    push(dx * 1.0, 0, dz * 1.0, 1, dx, dz);
  }
  // centre: a low 8-sided cone
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2;
    const a1 = ((k + 1) / 8) * Math.PI * 2;
    push(Math.cos(a0) * 0.2, 0.04, Math.sin(a0) * 0.2, 0, 0, 1);
    push(0, 0.12, 0, 0, 0, 1);
    push(Math.cos(a1) * 0.2, 0.04, Math.sin(a1) * 0.2, 0, 0, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aPetal", new BufferAttribute(new Float32Array(petal), 1));
  g.setAttribute("aDir", new BufferAttribute(new Float32Array(dir), 2));
  return g;
}

export class Blossoms {
  readonly mesh: InstancedMesh;
  readonly list: BlossomDef[];
  /** index in `list` of the poster's sip flower */
  readonly startIndex: number;
  readonly anchors: Float32Array;
  readonly uOpen = { value: 0 };
  readonly uHelio = { value: 1 };
  private readonly bob: InstancedBufferAttribute;
  private readonly bobValues: Float32Array;
  private readonly uPetal = { value: DAY.bloom.clone() };
  private readonly uCentre = { value: DAY.sun.clone() };

  constructor(tier: Tier, shared: BlossomShared) {
    const start = BLOSSOMS[START_BLOSSOM];
    this.list = tier === "high" ? BLOSSOMS : BLOSSOMS.filter((b) => b.keepMedium);
    this.startIndex = Math.max(0, this.list.indexOf(start));
    const n = this.list.length;
    const geo = flowerGeometry();
    const delay = new Float32Array(n);
    const stiff = new Float32Array(n);
    this.bobValues = new Float32Array(n);
    this.anchors = new Float32Array(n * 3);
    this.list.forEach((b, i) => {
      delay[i] = b.delay;
      stiff[i] = b.stiff;
      this.anchors[i * 3] = b.x;
      this.anchors[i * 3 + 1] = b.y;
      this.anchors[i * 3 + 2] = b.z;
    });
    geo.setAttribute("aDelay", new InstancedBufferAttribute(delay, 1));
    geo.setAttribute("aStiff", new InstancedBufferAttribute(stiff, 1));
    this.bob = new InstancedBufferAttribute(this.bobValues, 1);
    this.bob.setUsage(DynamicDrawUsage);
    geo.setAttribute("aBob", this.bob);

    const mat = new ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uNight: shared.uNight,
        uSun: shared.uSun,
        uLightDir: shared.uLightDir,
        uOpen: this.uOpen,
        uHelio: this.uHelio,
        uPetal: this.uPetal,
        uCentre: this.uCentre,
      },
      vertexShader: /* glsl */ `
        attribute float aPetal;
        attribute vec2 aDir;
        attribute float aDelay;
        attribute float aStiff;
        attribute float aBob;
        uniform float uOpen;
        uniform float uTime;
        uniform float uHelio;
        uniform vec3 uSun;
        uniform vec3 uLightDir;
        varying float vPetal;
        varying float vLight;
        void main() {
          float open = clamp((uOpen - aDelay) / 0.35, 0.0, 1.0);
          open = open * open * (3.0 - 2.0 * open);
          float hinge = mix(1.25, 0.15, open);
          vec3 p = position;
          if (aPetal > 0.5) {
            float rr = dot(p.xz, aDir);
            vec2 t = p.xz - rr * aDir;
            float L = max(rr - ${HINGE.toFixed(2)}, 0.0);
            p.xz = t + aDir * (${HINGE.toFixed(2)} + L * cos(hinge));
            p.y = L * sin(hinge) + L * L * 0.12;
          }
          p *= mix(0.55, 1.0, open);
          vec3 anchor = instanceMatrix[3].xyz;
          float scale = length(instanceMatrix[0].xyz);
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 toSun = normalize(uSun - anchor);
          vec3 dir = normalize(mix(up, toSun, 0.65 * aStiff * uHelio));
          dir = normalize(dir + vec3(sin(uTime * 18.0) * 0.28, 0.0, cos(uTime * 15.0) * 0.2) * aBob);
          vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
          vec3 fwd = cross(side, dir);
          vec3 local = side * p.x + dir * p.y + fwd * p.z;
          vec3 world = anchor + local * scale;
          world.y += sin(uTime * 14.0) * 0.025 * aBob;
          vPetal = aPetal;
          vLight = 0.8 + 0.25 * max(dot(dir, normalize(uLightDir)), 0.0);
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uPetal;
        uniform vec3 uCentre;
        uniform float uNight;
        varying float vPetal;
        varying float vLight;
        void main() {
          vec3 c = mix(uCentre, uPetal, vPetal);
          vec3 col = c * vLight + c * (0.6 * uNight * vPetal);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: DoubleSide,
    });

    this.mesh = new InstancedMesh(geo, mat, n);
    const o = new Object3D();
    this.list.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.setScalar(0.115);
      o.updateMatrix();
      this.mesh.setMatrixAt(i, o.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.frustumCulled = false;
  }

  setColors(petal: Color, centre: Color) {
    this.uPetal.value.copy(petal);
    this.uCentre.value.copy(centre);
  }

  /** Kick a flower's bob (sip). */
  bobAt(index: number, amount = 1) {
    if (index < 0 || index >= this.bobValues.length) return;
    this.bobValues[index] = Math.max(this.bobValues[index], amount);
    this.bob.needsUpdate = true;
  }

  /** Decay bobs; returns true while any flower is still moving. */
  decay(dt: number): boolean {
    let any = false;
    let changed = false;
    const k = Math.exp(-3.2 * dt);
    for (let i = 0; i < this.bobValues.length; i++) {
      const v = this.bobValues[i];
      if (v === 0) continue;
      const nv = v * k;
      this.bobValues[i] = nv < 0.01 ? 0 : nv;
      changed = true;
      if (this.bobValues[i] > 0) any = true;
    }
    if (changed) this.bob.needsUpdate = true;
    return any;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}

