import {
  BufferAttribute,
  Color,
  ExtrudeGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Shape,
  type BufferGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Tier } from "@/lib/quality";
import { BACK_BASE_Y, BACK_TOWERS, TOWERS, TOWER_BASE_Y, towerDepth, type TowerDef } from "./layout";
import { DAY, NIGHT } from "./palette";
import { GLASS_GLSL, createSoftGlassMaterial, type GlassShared } from "./SoftGlassMaterial";

/**
 * The skyline: every front-row tower is a 2D rounded-rect / pill Shape → ExtrudeGeometry
 * (depth 0.6·w, bevel 0.04), all merged into ONE geometry with per-vertex `aTower` and `aH`.
 * The back row is merged the same way. 2 draw calls.
 */

function towerShape(t: TowerDef, base: number): Shape {
  const hw = t.w / 2;
  const r = Math.min(t.r, hw);
  const s = new Shape();
  s.moveTo(-hw, base);
  s.lineTo(hw, base);
  s.lineTo(hw, t.h - r);
  s.absarc(hw - r, t.h - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, t.h);
  s.absarc(-hw + r, t.h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, base);
  return s;
}

function buildRow(towers: TowerDef[], base: number): BufferGeometry {
  const parts: BufferGeometry[] = towers.map((t, i) => {
    const depth = towerDepth(t);
    const g = new ExtrudeGeometry(towerShape(t, base), {
      depth,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 3,
      curveSegments: 8,
    });
    g.translate(t.x, 0, t.z - depth);
    g.deleteAttribute("uv");
    const pos = g.getAttribute("position");
    const tower = new Float32Array(pos.count).fill(i);
    const h = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) h[k] = Math.min(1, Math.max(0, pos.getY(k) / t.h));
    g.setAttribute("aTower", new BufferAttribute(tower, 1));
    g.setAttribute("aH", new BufferAttribute(h, 1));
    return g;
  });
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("skyline merge failed");
  merged.computeBoundingSphere();
  return merged;
}

/** High tier: real transmission glass with the same floor lines and night windows. */
function createPhysicalGlass(shared: GlassShared): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    color: new Color("#FFFFFF"),
    transmission: 1,
    thickness: 0.6,
    roughness: 0.18,
    ior: 1.45,
    metalness: 0,
    attenuationColor: DAY.sky.clone(),
    attenuationDistance: 2.5,
    envMapIntensity: 0.9,
  });
  const uWindow = { value: NIGHT.sun.clone() };
  const uFern = { value: DAY.fern.clone() };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = shared.uNight;
    shader.uniforms.uWindow = uWindow;
    shader.uniforms.uFern = uFern;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aTower;\nattribute float aH;\nvarying float vTowerId;\nvarying vec3 vGW;\nvarying vec3 vGN;",
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvTowerId = aTower;\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGN = normalize(mat3(modelMatrix) * objectNormal);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform float uNight;\nuniform vec3 uWindow;\nuniform vec3 uFern;\nvarying float vTowerId;\nvarying vec3 vGW;\nvarying vec3 vGN;\n${GLASS_GLSL}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 hwF = hw_facade(vGW, normalize(vGN), vTowerId);
        totalEmissiveRadiance += vec3(0.18) * hwF.x * (1.0 - 0.6 * uNight);
        totalEmissiveRadiance += uWindow * hwF.y * uNight * 1.6;
        totalEmissiveRadiance += uFern * hwF.z * 0.08;`,
      )
      .replace("#include <opaque_fragment>", "#include <opaque_fragment>\ngl_FragColor.a = 1.0;");
  };
  m.customProgramCacheKey = () => "hw-physical-glass";
  return m;
}

export class Skyline {
  readonly front: Mesh;
  readonly back: Mesh;
  /** high tier only: hidden mesh with the soft glass, shown during warm-up so its shader is pre-compiled */
  readonly softProbe: Mesh | null;
  private readonly physical: MeshPhysicalMaterial | null;
  /** high tier only: the cheaper front-row glass swapped in when the frame rate keeps falling */
  private readonly soft: Material | null;
  private readonly backFade: Color;
  private readonly tint = new Color();
  private readonly nightTint = new Color("#4A6A74");
  private readonly white = new Color("#FFFFFF");

  constructor(tier: Tier, shared: GlassShared) {
    const frontGeo = buildRow(TOWERS, TOWER_BASE_Y);
    const backGeo = buildRow(BACK_TOWERS, BACK_BASE_Y);
    let frontMat: Material;
    if (tier === "high") {
      this.physical = createPhysicalGlass(shared);
      frontMat = this.physical;
      this.soft = createSoftGlassMaterial(shared, { amount: 0, color: DAY.sky.clone() });
    } else {
      this.physical = null;
      this.soft = null;
      frontMat = createSoftGlassMaterial(shared, { amount: 0, color: DAY.sky.clone() });
    }
    this.backFade = DAY.sky.clone();
    const backMat = createSoftGlassMaterial(shared, { amount: 0.7, color: this.backFade });
    this.front = new Mesh(frontGeo, frontMat);
    this.back = new Mesh(backGeo, backMat);
    this.front.renderOrder = 1;
    // shares the front geometry and soft material, so it owns nothing of its own to dispose
    this.softProbe = this.soft ? new Mesh(frontGeo, this.soft) : null;
    if (this.softProbe) this.softProbe.visible = false;
  }

  setNight(night: number) {
    this.backFade.copy(DAY.sky).lerp(NIGHT.sky, night).multiplyScalar(1 - 0.45 * night);
    if (this.physical) {
      this.physical.color.copy(this.white).lerp(this.nightTint, night);
      this.physical.attenuationColor.copy(DAY.sky).lerp(NIGHT.glassTop, night);
      this.tint.copy(this.physical.color);
    }
  }

  /** Drop the transmission glass (and its extra scene pass) for the soft glass. False if nothing changed. */
  switchToSoftGlass(): boolean {
    if (!this.physical || !this.soft || this.front.material === this.soft) return false;
    this.front.material = this.soft;
    return true;
  }

  dispose() {
    this.physical?.dispose();
    this.soft?.dispose();
    this.front.geometry.dispose();
    this.back.geometry.dispose();
    (this.front.material as Material).dispose();
    (this.back.material as Material).dispose();
  }
}
