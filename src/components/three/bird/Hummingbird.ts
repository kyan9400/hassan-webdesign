import {
  Color,
  Group,
  Mesh,
  type Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from "three";
import { BIRD_SCALE, SHOULDER, createBirdBodyGeometry, createGorgetGeometry } from "./hummingbird-geometry";
import {
  WING_ARC_LENGTH,
  WING_ARC_START,
  createFanGeometry,
  createFanMaterial,
  createGhostGeometry,
  createGhostMaterial,
} from "./wing-shaders";
import type { BirdPose } from "./birdBrain";

/**
 * The procedural hummingbird mesh: 6 draw calls (body, gorget, 2 blur fans, 2 ghost wings).
 * `apply(pose, time)` writes a BirdPose from birdBrain onto the meshes (no allocations).
 */

const WING_MID = WING_ARC_START + WING_ARC_LENGTH / 2;
const WING_AMP = WING_ARC_LENGTH / 2 - 0.08;
const FOLDED = Math.PI - 0.12;

export class Hummingbird {
  readonly group = new Group();
  private readonly body: Mesh;
  private readonly gorget: Mesh;
  private readonly fans: Mesh[] = [];
  private readonly ghosts: Mesh[] = [];
  private readonly bodyMat: MeshStandardMaterial;
  private readonly gorgetMat: MeshPhysicalMaterial;
  private readonly legUniform = { value: 0 };
  private readonly fanColor = new Color("#8FD3E8");
  private readonly ghostColor = new Color("#8FD3E8");
  private readonly foldedColor = new Color("#2A6B45");
  private readonly flyColor = new Color("#8FD3E8");
  private fold = 0;

  constructor(envMap: Texture | null) {
    this.bodyMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0, envMapIntensity: 0.35 });
    const legs = this.legUniform;
    this.bodyMat.onBeforeCompile = (shader) => {
      shader.uniforms.uLegs = legs;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aLeg;\nuniform float uLegs;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nif (aLeg > 0.5) transformed = mix(vec3(0.02, -0.095, 0.0), transformed, uLegs);",
        );
    };
    this.bodyMat.customProgramCacheKey = () => "hw-bird-body";

    this.gorgetMat = new MeshPhysicalMaterial({
      color: new Color("#F07A9A"),
      roughness: 0.28,
      metalness: 0.15,
      iridescence: 1,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
      envMap,
      envMapIntensity: 1.1,
    });
    // no environment (medium tier): metal with nothing to reflect reads dark, so swap the
    // reflections for a faint self-glow that keeps the gorget the brightest detail
    if (!envMap) {
      this.gorgetMat.metalness = 0;
      this.gorgetMat.emissive.set("#F07A9A");
      this.gorgetMat.emissiveIntensity = 0.12;
    }

    this.body = new Mesh(createBirdBodyGeometry(), this.bodyMat);
    this.gorget = new Mesh(createGorgetGeometry(), this.gorgetMat);
    this.group.add(this.body, this.gorget);

    const fanGeo = createFanGeometry();
    const ghostGeo = createGhostGeometry();
    for (const side of [1, -1]) {
      const fan = new Mesh(fanGeo, createFanMaterial(this.fanColor));
      fan.position.set(SHOULDER.x, SHOULDER.y, SHOULDER.z * side);
      fan.rotation.x = side * 0.18;
      fan.renderOrder = 2;
      const ghost = new Mesh(ghostGeo, createGhostMaterial(this.ghostColor));
      ghost.position.set(SHOULDER.x, SHOULDER.y, SHOULDER.z * side + 0.004 * side);
      ghost.renderOrder = 3;
      this.fans.push(fan);
      this.ghosts.push(ghost);
      this.group.add(fan, ghost);
    }
    this.group.scale.setScalar(BIRD_SCALE);
    this.group.rotation.order = "YZX";
  }

  get materials(): Material[] {
    return [this.bodyMat, this.gorgetMat, ...this.fans.map((f) => f.material as Material), ...this.ghosts.map((g) => g.material as Material)];
  }

  setNight(night: number) {
    // wings take the sky colour of the current theme (#8FD3E8 → #2E6F86)
    this.fanColor.setRGB(0.275, 0.651, 0.807).lerp(this.nightSky, night);
    this.flyColor.copy(this.fanColor);
  }
  private readonly nightSky = new Color("#2E6F86");

  /**
   * Apply a pose; `time` drives the visible 9 Hz ghost-wing flap. `instant` skips the fold
   * animation (reduced motion). Returns true while the wings are still folding / unfolding.
   */
  apply(pose: BirdPose, time: number, dt: number, instant = false): boolean {
    this.group.position.set(pose.x, pose.y, pose.z);
    this.group.rotation.set(pose.bank, pose.yaw, pose.pitch, "YZX");

    // fold the wings when perched (damped so landing reads as a motion)
    const goal = pose.flying ? 0 : 1;
    const k = instant ? 1 : 1 - Math.exp(-12 * Math.min(dt, 1 / 30));
    this.fold += (goal - this.fold) * k;
    if (Math.abs(this.fold - goal) < 0.002) this.fold = goal;
    const fold = this.fold;
    this.legUniform.value = fold;

    const flap = WING_MID + WING_AMP * Math.sin(2 * Math.PI * 9 * time);
    const angle = flap + (FOLDED - flap) * fold;
    this.ghostColor.copy(this.flyColor).lerp(this.foldedColor, fold);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const ghost = this.ghosts[i];
      ghost.rotation.set(0, 0, angle);
      ghost.position.z = (SHOULDER.z + 0.004 + fold * 0.03) * side;
      const gm = ghost.material as unknown as { uniforms: { uOpacity: { value: number } } };
      gm.uniforms.uOpacity.value = 0.3 + 0.7 * fold;
      const fan = this.fans[i];
      fan.visible = fold < 0.98;
      const fm = fan.material as unknown as { uniforms: { uOpacity: { value: number } } };
      fm.uniforms.uOpacity.value = 1 - fold;
    }
    return this.fold !== goal;
  }

  dispose() {
    this.body.geometry.dispose();
    this.gorget.geometry.dispose();
    this.fans[0].geometry.dispose();
    this.ghosts[0].geometry.dispose();
    for (const m of this.materials) m.dispose();
  }
}
