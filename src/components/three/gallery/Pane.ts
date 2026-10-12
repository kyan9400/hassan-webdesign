import { BufferGeometry, Group, Mesh, Shape, ShapeGeometry, type Texture } from "three";
import type { ProjectCard as Project } from "@/data/sectors";
import { PANE_H, PANE_R, PANE_W, PHONE, PHONE_H, PHONE_W } from "./arrangement";
import { createPaneMaterial, createPhoneMaterial, type PaneShared } from "./PaneMaterial";
import type { Placeholder } from "./textures";

/** Rounded-rect ShapeGeometry with UVs remapped to 0..1. */
export function roundedRectGeometry(w: number, h: number, r: number, curveSegments = 6): BufferGeometry {
  const s = new Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x0 + w, y0 + h - r);
  s.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y0 + h);
  s.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new ShapeGeometry(s, curveSegments);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x0) / w, (pos.getY(i) - y0) / h);
  }
  uv.needsUpdate = true;
  return g;
}

export type PaneGeometries = { pane: BufferGeometry; phone: BufferGeometry };

export function createPaneGeometries(): PaneGeometries {
  return {
    pane: roundedRectGeometry(PANE_W, PANE_H, PANE_R, 6),
    phone: roundedRectGeometry(PHONE_W, PHONE_H, PHONE.screenR + PHONE.bezel, 6),
  };
}

/**
 * One pane of the conservatory wall: arc transform (group) → hover tilt (tilt) → the glass,
 * plus the floating phone. All animation state lives here as plain numbers, damped by the
 * controller every frame (no allocations).
 */
export class Pane {
  readonly index: number;
  readonly project: Project;
  readonly group = new Group();
  readonly tilt = new Group();
  readonly mesh: Mesh;
  readonly phone: Mesh;
  readonly mat: ReturnType<typeof createPaneMaterial>;
  readonly phoneMat: ReturnType<typeof createPhoneMaterial>;
  readonly place: Placeholder;
  readonly phonePlace: Placeholder;

  // arrangement
  slot = 0;
  slotTarget = 0;
  vis = 1;
  visTarget = 1;
  inFilter = true;
  // hover
  hover = 0;
  tiltX = 0;
  tiltY = 0;
  lift = 0;
  phoneOut = 0;
  // present
  pres = 0;
  presTarget = 0;
  dim = 0;
  // textures
  desktop: Texture | null = null;
  mobile: Texture | null = null;
  desktopState: "none" | "loading" | "done" | "missing" = "none";
  mobileState: "none" | "loading" | "done" | "missing" = "none";
  reveal = 0;
  phoneReveal = 0;

  constructor(index: number, project: Project, geo: PaneGeometries, place: Placeholder, phonePlace: Placeholder, shared: PaneShared) {
    this.index = index;
    this.project = project;
    this.place = place;
    this.phonePlace = phonePlace;
    this.mat = createPaneMaterial(place.texture, shared);
    this.phoneMat = createPhoneMaterial(phonePlace.texture, shared);
    this.mesh = new Mesh(geo.pane, this.mat);
    this.phone = new Mesh(geo.phone, this.phoneMat);
    this.phone.position.set(PHONE.x, PHONE.y, PHONE.z);
    this.phone.rotation.y = PHONE.rotY;
    this.tilt.add(this.mesh);
    this.group.add(this.tilt, this.phone);
    this.mesh.frustumCulled = false;
    this.phone.frustumCulled = false;
  }

  setDesktop(tex: Texture) {
    this.desktop = tex;
    this.mat.uniforms.uMap.value = tex;
  }

  setMobile(tex: Texture | null) {
    this.mobile = tex;
    this.phoneMat.uniforms.uMap.value = tex ?? this.phonePlace.texture;
    if (!tex) {
      this.phoneReveal = 0;
      this.phoneMat.uniforms.uReveal.value = 0;
    }
  }

  dispose() {
    this.mat.dispose();
    this.phoneMat.dispose();
    this.place.texture.dispose();
    this.phonePlace.texture.dispose();
  }
}
