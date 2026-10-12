import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, type IUniform } from "three";
import { mulberry32 } from "@/lib/damp";
import type { Tier } from "@/lib/quality";
import { TOWERS } from "./layout";
import { DAY, NIGHT } from "./palette";

/**
 * Night glow without post-processing: soft additive sprite halos instead of a bloom pass.
 * One Points layer: halos over lit-window clusters on the front faces (≈120 on high, 40 on
 * medium) and one per blossom centre. Faded by the window amount — night, or the golden-hour
 * scroll by day (and dimmed again as the city goes quiet at midnight). No draw call when dark.
 */

export type GlowShared = {
  uNight: IUniform<number>;
  uDusk: IUniform<number>;
  uScale: IUniform<number>;
};

export class Glows {
  readonly points: Points;
  private readonly uAmount = { value: 0 };
  private readonly uBlossom = { value: 0 };

  constructor(tier: Tier, shared: GlowShared, blossomAnchors: Float32Array) {
    const rnd = mulberry32(5150);
    const windows = tier === "high" ? 120 : 40;
    const main = TOWERS.filter((t) => t.h > 2);
    const totalW = main.reduce((s, t) => s + t.w * t.h, 0);
    const pos: number[] = [];
    const kind: number[] = [];
    const size: number[] = [];
    for (const t of main) {
      const n = Math.max(2, Math.round((windows * t.w * t.h) / totalW));
      for (let i = 0; i < n; i++) {
        // window-cell centres (cells are 1/6 wide, 1/4 tall), on the front face
        const cx = Math.floor(((rnd() - 0.5) * (t.w - 0.2) + t.x) * 6) / 6 + 1 / 12;
        const cy = Math.floor((0.3 + rnd() * (t.h - t.r - 0.5)) * 4) / 4 + 1 / 8;
        pos.push(cx, cy, t.z + 0.06);
        kind.push(0);
        size.push(0.35 + rnd() * 0.25);
      }
    }
    const nb = blossomAnchors.length / 3;
    for (let i = 0; i < nb; i++) {
      pos.push(blossomAnchors[i * 3], blossomAnchors[i * 3 + 1] + 0.02, blossomAnchors[i * 3 + 2] + 0.04);
      kind.push(1);
      size.push(0.22);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("aKind", new BufferAttribute(new Float32Array(kind), 1));
    geo.setAttribute("aSize", new BufferAttribute(new Float32Array(size), 1));
    const mat = new ShaderMaterial({
      uniforms: {
        uScale: shared.uScale,
        uAmount: this.uAmount,
        uBlossom: this.uBlossom,
        uWindow: { value: NIGHT.sun.clone() },
        uPetal: { value: NIGHT.bloom.clone().lerp(DAY.sun, 0.25) },
      },
      vertexShader: /* glsl */ `
        attribute float aKind;
        attribute float aSize;
        uniform float uScale;
        varying float vKind;
        void main() {
          vKind = aKind;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAmount;
        uniform float uBlossom;
        uniform vec3 uWindow;
        uniform vec3 uPetal;
        varying float vKind;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float fall = pow(max(1.0 - d, 0.0), 2.2);
          float a = fall * mix(uAmount * 0.32, uBlossom * 0.45, vKind);
          if (a < 0.004) discard;
          gl_FragColor = vec4(mix(uWindow, uPetal, vKind) * a, 1.0);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.points = new Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.points.visible = false;
  }

  /** Window glow follows night and the golden-hour / midnight scroll; blossoms glow at night. */
  update(night: number, dusk: number) {
    const amount = night * (1 - 0.85 * dusk) + (1 - night) * dusk;
    this.uAmount.value = amount;
    this.uBlossom.value = night;
    this.points.visible = amount > 0.01 || night > 0.01;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
  }
}

