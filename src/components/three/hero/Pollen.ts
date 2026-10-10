import {
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from "three";
import { mulberry32 } from "@/lib/damp";
import type { Tier } from "@/lib/quality";
import { DAY, NIGHT } from "./palette";

/**
 * Pollen (day) / fireflies (night): THREE.Points with 300 (high) / 120 (medium) points and a
 * stateless shader: position = seed + slow sin drift + mod(t·0.08 + seed, 1)·5 rise.
 * Day: `sun` at 0.55 alpha. Night: `firefly` with a blink pow(sin(t·2 + seed)·.5 + .5, 6).
 */

export type PollenShared = {
  uTime: IUniform<number>;
  uNight: IUniform<number>;
};

export function createPollen(tier: Tier, shared: PollenShared, uScale: IUniform<number>): Points {
  const count = tier === "high" ? 300 : 120;
  const rnd = mulberry32(4242);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 20;
    pos[i * 3 + 1] = rnd() * 0.6;
    pos[i * 3 + 2] = -2.2 + rnd() * 3.6;
    seed[i * 4] = rnd();
    seed[i * 4 + 1] = rnd();
    seed[i * 4 + 2] = rnd();
    seed[i * 4 + 3] = rnd();
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 4));
  const mat = new ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uNight: shared.uNight,
      uScale,
      uDay: { value: DAY.pollen.clone() },
      uFire: { value: NIGHT.firefly.clone() },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uNight;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float rise = mod(uTime * 0.08 + aSeed.w, 1.0);
        p.y += rise * 5.0;
        p.x += sin(uTime * 0.35 + aSeed.x * 6.2831) * 0.25;
        p.z += cos(uTime * 0.27 + aSeed.y * 6.2831) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float fade = smoothstep(0.0, 0.12, rise) * (1.0 - smoothstep(0.75, 1.0, rise));
        float blink = pow(sin(uTime * 2.0 + aSeed.z * 20.0) * 0.5 + 0.5, 6.0);
        vAlpha = fade * mix(0.55, blink, uNight);
        gl_PointSize = mix(0.035, 0.055, uNight) * uScale / max(-mv.z, 0.1);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDay;
      uniform vec3 uFire;
      uniform float uNight;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d) * vAlpha;
        if (a < 0.01) discard;
        vec3 c = mix(uDay, uFire * 1.6, uNight);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  return points;
}

/** Six pooled pollen sparks that fly out of a flower when the bird sips. */
export class Sparks {
  readonly points: Points;
  private readonly uOrigin = { value: new Vector3() };
  private readonly uT = { value: 1 };
  private t = 1;

  constructor(shared: PollenShared, uScale: IUniform<number>) {
    const rnd = mulberry32(99);
    const dir = new Float32Array(6 * 3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.6;
      dir[i * 3] = Math.cos(a) * (0.6 + rnd() * 0.4);
      dir[i * 3 + 1] = 0.6 + rnd() * 0.6;
      dir[i * 3 + 2] = Math.sin(a) * 0.5;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(dir, 3));
    const mat = new ShaderMaterial({
      uniforms: {
        uOrigin: this.uOrigin,
        uT: this.uT,
        uNight: shared.uNight,
        uScale,
        uDay: { value: DAY.sun.clone() },
        uFire: { value: NIGHT.firefly.clone() },
      },
      vertexShader: /* glsl */ `
        uniform vec3 uOrigin;
        uniform float uT;
        uniform float uScale;
        varying float vA;
        void main() {
          vec3 p = uOrigin + position * (uT * 0.32) + vec3(0.0, -uT * uT * 0.22, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = 1.0 - uT;
          gl_PointSize = (0.05 * (1.0 - 0.6 * uT)) * uScale / max(-mv.z, 0.1);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDay;
        uniform vec3 uFire;
        uniform float uNight;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(uDay, uFire * 1.5, uNight), a);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.points = new Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 5;
  }

  burst(x: number, y: number, z: number) {
    this.uOrigin.value.set(x, y, z);
    this.t = 0;
    this.uT.value = 0;
    this.points.visible = true;
  }

  /** Advance; returns true while the burst is still visible. */
  update(dt: number): boolean {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dt / 0.7);
    this.uT.value = this.t;
    if (this.t >= 1) this.points.visible = false;
    return this.t < 1;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
  }
}
