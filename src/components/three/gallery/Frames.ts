import {
  BoxGeometry,
  Color,
  Curve,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
  type Texture,
} from "three";
import { MAX_PANES, PANE_H, PANE_W, R } from "./arrangement";

/**
 * The glasshouse ironwork, all instanced (one draw call each):
 *  - mullions: 4 thin boxes per pane (44 instances), #3C5A45 by day, #9BB8A3 at night;
 *  - ribs: 12 half-ellipse tubes at the pane joints, rising from the wall top toward the centre —
 *    they suggest the roof without blocking anything;
 *  - drop shadows: one shared blurred rounded-rect texture on a plane behind each pane (18 % ink).
 * The ironwork is metal (MeshStandardMaterial, metalness 0.8, roughness 0.35) reflecting the
 * code-made environment, so the mullions catch the light as the camera walks.
 */

const BAR = 0.05;
const BAR_DEPTH = 0.06;
const RIB_BASE_Y = PANE_H / 2 + 0.04;

class HalfEllipse extends Curve<Vector3> {
  constructor(
    private readonly a: number,
    private readonly b: number,
  ) {
    super();
  }
  getPoint(t: number, target = new Vector3()): Vector3 {
    const u = Math.PI * t;
    return target.set(0, RIB_BASE_Y + this.b * Math.sin(u), -R + this.a * (1 - Math.cos(u)));
  }
}

const DAY_FRAME = new Color("#3C5A45");
const NIGHT_FRAME = new Color("#9BB8A3");
const DAY_SHADOW = new Color("#13221A");
const NIGHT_SHADOW = new Color("#000000");

export class Frames {
  readonly mullions: InstancedMesh;
  readonly ribs: InstancedMesh;
  readonly shadows: InstancedMesh;
  private readonly frameMat: MeshStandardMaterial;
  private readonly shadowMat: MeshBasicMaterial;
  private readonly bars: Matrix4[];
  private readonly shadowLocal = new Matrix4();
  private readonly m = new Matrix4();
  private readonly zero = new Matrix4().makeScale(0, 0, 0);

  constructor(shadowTexture: Texture, ribCount = MAX_PANES + 1) {
    this.frameMat = new MeshStandardMaterial({ color: DAY_FRAME.clone(), metalness: 0.8, roughness: 0.35, envMapIntensity: 1.2 });
    this.mullions = new InstancedMesh(new BoxGeometry(1, 1, 1), this.frameMat, MAX_PANES * 4);
    const hw = PANE_W / 2;
    const hh = PANE_H / 2;
    const bar = (x: number, y: number, sx: number, sy: number) => new Matrix4().makeScale(sx, sy, BAR_DEPTH).setPosition(x, y, 0.012);
    this.bars = [
      bar(0, hh, PANE_W + BAR, BAR),
      bar(0, -hh, PANE_W + BAR, BAR),
      bar(-hw, 0, BAR, PANE_H + BAR),
      bar(hw, 0, BAR, PANE_H + BAR),
    ];

    const ribGeo = new TubeGeometry(new HalfEllipse(R * 0.5, 2.2), 40, 0.012, 5, false);
    this.ribs = new InstancedMesh(ribGeo, this.frameMat, ribCount);

    this.shadowMat = new MeshBasicMaterial({
      map: shadowTexture,
      color: DAY_SHADOW.clone(),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      toneMapped: false,
    });
    this.shadows = new InstancedMesh(new PlaneGeometry(PANE_W * 1.28, PANE_H * 1.42), this.shadowMat, MAX_PANES);
    this.shadowLocal.makeTranslation(0, -0.14, -0.14);

    for (const mesh of [this.mullions, this.ribs, this.shadows]) {
      mesh.frustumCulled = false;
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, this.zero);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Place pane i's mullions (glass frame, follows the tilt) and shadow (follows the arc). */
  setPane(i: number, tiltWorld: Matrix4 | null, groupWorld: Matrix4 | null) {
    for (let k = 0; k < 4; k++) {
      if (tiltWorld) this.m.multiplyMatrices(tiltWorld, this.bars[k]);
      this.mullions.setMatrixAt(i * 4 + k, tiltWorld ? this.m : this.zero);
    }
    if (groupWorld) this.m.multiplyMatrices(groupWorld, this.shadowLocal);
    this.shadows.setMatrixAt(i, groupWorld ? this.m : this.zero);
  }

  /** Rib j at world angle φ (rotation about y by −φ), or hidden. */
  setRib(j: number, phi: number | null) {
    if (j >= this.ribs.count) return;
    if (phi === null) this.ribs.setMatrixAt(j, this.zero);
    else this.ribs.setMatrixAt(j, this.m.makeRotationY(-phi));
  }

  commit() {
    this.mullions.instanceMatrix.needsUpdate = true;
    this.ribs.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  setNight(n: number) {
    this.frameMat.color.copy(DAY_FRAME).lerp(NIGHT_FRAME, n);
    this.shadowMat.color.copy(DAY_SHADOW).lerp(NIGHT_SHADOW, n);
    this.shadowMat.opacity = 0.18 + 0.14 * n;
  }

  dispose() {
    this.mullions.geometry.dispose();
    this.ribs.geometry.dispose();
    this.shadows.geometry.dispose();
    this.frameMat.dispose();
    this.shadowMat.dispose();
  }
}
