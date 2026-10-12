import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  MultiplyBlending,
  NoColorSpace,
} from "three";
import { CANOPIES, TOWERS, hillTop, towerCentreZ, towerDepth, type TowerDef } from "./layout";

/**
 * Grounding — baked contact AO, so towers sit IN the lawn and mounds sit ON the roofs.
 * One 64 × 64 radial-gradient CanvasTexture made in code (dark centre → white edge, opaque), on
 * one merged mesh of small grids that follow the surface they lie on:
 *  - one under each front-row tower, on the hill (y = hillTop(x) + 0.004), 1.5·w × 1.2·depth;
 *  - one under each roof crown cluster (on the bevelled roof surface, 0.003–0.006 clear).
 * Multiply blending (dst × texel), no depth writes, not tone-mapped. One draw call, built once.
 */

const BEVEL = 0.04; // the towers' extrude bevel lifts the roof by this much

function aoTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgb(120,120,120)");
  grad.addColorStop(0.45, "rgb(170,170,170)");
  grad.addColorStop(0.8, "rgb(232,232,232)");
  grad.addColorStop(1, "rgb(255,255,255)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.colorSpace = NoColorSpace; // a plain multiply factor
  return tex;
}

type Patch = { x: number; z: number; w: number; d: number; y: (x: number) => number };

/**
 * The real roof surface at world x: the bevel pushes the outline out by BEVEL along its normal,
 * so a rounded corner of radius r becomes radius r + BEVEL (same centre). roofY(x) + BEVEL is
 * only right on the flat part; on slopes it sinks into the tower (z-fighting band).
 * The chord sag of the extruded arc (≤ ~0.004 with 8 segments) is covered by the lift.
 */
function bevelledRoofY(t: TowerDef, x: number): number {
  const r = Math.min(t.r, t.w / 2);
  const inner = t.w / 2 - r;
  const dx = Math.abs(x - t.x);
  if (dx <= inner) return t.h + BEVEL;
  const R = r + BEVEL;
  const k = Math.min(R, dx - inner);
  return t.h - r + Math.sqrt(Math.max(0, R * R - k * k));
}

function buildPatches(patches: Patch[], segX = 12, segZ = 3): BufferGeometry {
  const verts = (segX + 1) * (segZ + 1);
  const pos = new Float32Array(patches.length * verts * 3);
  const uv = new Float32Array(patches.length * verts * 2);
  const idx: number[] = [];
  let v = 0;
  for (const p of patches) {
    const base = v;
    for (let j = 0; j <= segZ; j++) {
      for (let i = 0; i <= segX; i++) {
        const u = i / segX;
        const t = j / segZ;
        const x = p.x + (u - 0.5) * p.w;
        const z = p.z + (t - 0.5) * p.d;
        pos[v * 3] = x;
        pos[v * 3 + 1] = p.y(x);
        pos[v * 3 + 2] = z;
        uv[v * 2] = u;
        uv[v * 2 + 1] = t;
        v++;
      }
    }
    for (let j = 0; j < segZ; j++) {
      for (let i = 0; i < segX; i++) {
        const a = base + j * (segX + 1) + i;
        const b = a + segX + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

export function createGrounding(): Mesh {
  const patches: Patch[] = TOWERS.map((t) => ({
    x: t.x,
    z: towerCentreZ(t),
    w: 1.5 * t.w,
    d: 1.2 * towerDepth(t),
    y: (x: number) => hillTop(x) + 0.004,
  }));
  for (const c of CANOPIES) {
    if (c.kind !== "crown") continue;
    const t = TOWERS[c.tower];
    const half = t.w / 2 - 0.02;
    patches.push({
      x: t.x,
      z: towerCentreZ(t),
      w: t.w * 0.96,
      d: towerDepth(t) * 0.9,
      // follow the rounded roof; never hang past the walls
      y: (x: number) => {
        const cx = Math.max(t.x - half, Math.min(t.x + half, x));
        // flat part: 0.003 clear; slopes: extra lift for the arc's chord sag
        return bevelledRoofY(t, cx) + (Math.abs(cx - t.x) <= t.w / 2 - Math.min(t.r, t.w / 2) ? 0.003 : 0.006);
      },
    });
  }
  const mat = new MeshBasicMaterial({
    map: aoTexture(),
    transparent: true,
    depthWrite: false,
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    toneMapped: false,
  });
  const mesh = new Mesh(buildPatches(patches), mat);
  mesh.renderOrder = 0;
  return mesh;
}
