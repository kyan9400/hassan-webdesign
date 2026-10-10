import {
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  type IUniform,
} from "three";
import type { Tier } from "@/lib/quality";
import { CANOPIES } from "./layout";
import { DAY, NIGHT } from "./palette";

/**
 * Canopies — the draft's circle clusters as one InstancedMesh of IcosahedronGeometry(1, 1)
 * (80 tris, flat shaded). ~70 instances (50 on medium) on rooftops and two terrace levels of
 * towers 2, 4, 5 and 7. Wind sway in the vertex shader (only advances while the scene is awake);
 * the night colours are a second per-instance colour mixed by uNight.
 */

export type CanopyShared = {
  uTime: IUniform<number>;
  uNight: IUniform<number>;
  uWind: IUniform<number>;
};

export function createCanopies(tier: Tier, shared: CanopyShared): InstancedMesh {
  const list = tier === "high" ? CANOPIES : CANOPIES.filter((c) => c.keepMedium);
  const geo = new IcosahedronGeometry(1, 1);
  const phase = new Float32Array(list.length);
  const night = new Float32Array(list.length * 3);

  const mat = new MeshLambertMaterial({ flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uNight = shared.uNight;
    shader.uniforms.uWind = shared.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aPhase;\nattribute vec3 aNightColor;\nuniform float uTime;\nuniform float uNight;\nuniform float uWind;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(uTime * 1.3 + aPhase) * 0.06 * (position.y + 1.0) * uWind;",
      )
      .replace(
        "#include <color_vertex>",
        "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\nvColor.xyz = mix(vColor.xyz, aNightColor, uNight);\n#endif",
      );
  };
  mat.customProgramCacheKey = () => "hw-canopy";

  const mesh = new InstancedMesh(geo, mat, list.length);
  const o = new Object3D();
  const c = new Color();
  list.forEach((cn, i) => {
    o.position.set(cn.x, cn.y, cn.z);
    o.rotation.set(cn.phase, cn.phase * 1.7, 0);
    o.scale.setScalar(cn.r);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.copy(cn.tone ? DAY.canopyB : DAY.canopyA);
    mesh.setColorAt(i, c);
    const n = cn.tone ? NIGHT.canopyB : NIGHT.canopyA;
    night[i * 3] = n.r;
    night[i * 3 + 1] = n.g;
    night[i * 3 + 2] = n.b;
    phase[i] = cn.phase;
  });
  geo.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));
  geo.setAttribute("aNightColor", new InstancedBufferAttribute(night, 3));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
