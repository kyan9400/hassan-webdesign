import { BufferAttribute, Color, Mesh, MeshLambertMaterial, PlaneGeometry } from "three";
import type { Tier } from "@/lib/quality";
import { HILL, hillTop } from "./layout";
import { DAY, NIGHT } from "./palette";

/**
 * The hill: a smooth lawn instead of a stepped extrude. A PlaneGeometry grid (480 × 24 on high,
 * 240 × 16 on medium) laid flat over x ∈ [−30, 30], z ∈ [zBack, zFront]; every vertex sits on the
 * exact hillTop(x) line (so the towers' bases still match the poster), and the last rows curl over
 * a rounded front lip down to y = −3, so the camera never sees an edge. Smooth vertex normals.
 * Lambert, with a soft lawn variation (world-space noise mixes the hill colour 12 % toward fern).
 */

const LIP_R = 0.6;
const BOTTOM = -3;

export function createHill(tier: Tier = "high"): { mesh: Mesh; color: Color; lawn: Color } {
  const segX = tier === "high" ? 480 : 240;
  const segZ = tier === "high" ? 24 : 16;
  const geo = new PlaneGeometry(HILL.xMax - HILL.xMin, HILL.zFront - HILL.zBack, segX, segZ);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  const pos = geo.getAttribute("position") as BufferAttribute;
  // rows: the flat lawn, then a quarter-circle lip, then one row straight down
  const lipRows = Math.max(4, Math.round(segZ / 4));
  const flatRows = segZ - lipRows - 1;
  const zLip = HILL.zFront - LIP_R;
  for (let i = 0; i < pos.count; i++) {
    const col = i % (segX + 1);
    const row = Math.floor(i / (segX + 1)); // 0 = back (PlaneGeometry rows run top → bottom = back → front after the mapping below)
    const x = HILL.xMin + (col / segX) * (HILL.xMax - HILL.xMin);
    const top = hillTop(x);
    let y = top;
    let z: number;
    if (row <= flatRows) {
      z = HILL.zBack + (row / flatRows) * (zLip - HILL.zBack);
    } else if (row < segZ) {
      const phi = ((row - flatRows) / lipRows) * (Math.PI / 2);
      z = zLip + LIP_R * Math.sin(phi);
      y = top - LIP_R * (1 - Math.cos(phi));
    } else {
      z = HILL.zFront;
      y = BOTTOM;
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const color = DAY.hill.clone();
  const lawn = DAY.fern.clone();
  const mat = new MeshLambertMaterial({ color });
  const uLawn = { value: lawn };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLawn = uLawn;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vLawnXZ;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLawnXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform vec3 uLawn;
        varying vec2 vLawnXZ;
        float hl_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float hl_noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hl_hash(i), hl_hash(i + vec2(1.0, 0.0)), f.x), mix(hl_hash(i + vec2(0.0, 1.0)), hl_hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat hlN = hl_noise(vLawnXZ * vec2(0.9, 1.6)) * 0.65 + hl_noise(vLawnXZ * 3.1) * 0.35;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uLawn, 0.12 * smoothstep(0.25, 0.85, hlN));",
      );
  };
  mat.customProgramCacheKey = () => "hw-hill-lawn";
  const mesh = new Mesh(geo, mat);
  return { mesh, color, lawn };
}

/** Lawn variation colour for a night amount (fern by day, the night canopy green after dark). */
export function lawnColor(out: Color, night: number): Color {
  return out.copy(DAY.fern).lerp(NIGHT.canopyB, night);
}
