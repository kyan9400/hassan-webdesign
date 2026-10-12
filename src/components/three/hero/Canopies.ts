import {
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
  type IUniform,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "@/lib/damp";
import type { Tier } from "@/lib/quality";
import { CANOPIES } from "./layout";
import { DAY, NIGHT } from "./palette";

/**
 * Canopies — the draft's circle clusters as one InstancedMesh of a seeded "lumpy foliage" mound:
 * an icosphere (detail 3 on high, 2 on medium), vertices merged, pushed along the normal by two
 * octaves of value noise, the bottom flattened so the mounds sit on the roofs, then smooth
 * normals (no facets). ~70 instances (50 on medium) on rooftops and terraces of towers 2, 4, 5, 7.
 * Material: Lambert with a foliage term — wrapped diffuse, back-light translucency and a
 * hemispheric AO. Wind sway in the vertex shader (only advances while the scene is awake);
 * the night colours are a second per-instance colour mixed by uNight.
 */

export type CanopyShared = {
  uTime: IUniform<number>;
  uNight: IUniform<number>;
  uWind: IUniform<number>;
};

/** Seeded 3D value noise (lattice hash + smooth trilinear blend), two octaves. */
function makeFbm(seed: number) {
  const rnd = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rnd() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const lat = (x: number, y: number, z: number) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
  const s = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = s(x - xi);
    const v = s(y - yi);
    const w = s(z - zi);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(l(lat(xi, yi, zi), lat(xi + 1, yi, zi), u), l(lat(xi, yi + 1, zi), lat(xi + 1, yi + 1, zi), u), v),
      l(l(lat(xi, yi, zi + 1), lat(xi + 1, yi, zi + 1), u), l(lat(xi, yi + 1, zi + 1), lat(xi + 1, yi + 1, zi + 1), u), v),
      w,
    );
  };
  return (x: number, y: number, z: number) => noise(x, y, z) * 0.67 + noise(x * 2.03 + 11.1, y * 2.03 + 3.7, z * 2.03 + 7.3) * 0.33;
}

/** The lumpy, flat-bottomed, smooth-normalled foliage mound (unit radius). */
export function foliageGeometry(detail: number, seed = 20260417): BufferGeometry {
  const ico = new IcosahedronGeometry(1, detail);
  ico.deleteAttribute("normal");
  ico.deleteAttribute("uv");
  const geo = mergeVertices(ico);
  ico.dispose();
  const fbm = makeFbm(seed);
  const pos = geo.getAttribute("position");
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = p.clone().normalize();
    p.addScaledVector(n, 0.12 * fbm(p.x * 2.1, p.y * 2.1, p.z * 2.1));
    // flatten the underside so the mound sits on a roof
    if (p.y < -0.35) p.y = -0.35 + (p.y + 0.35) * 0.25;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createCanopies(tier: Tier, shared: CanopyShared): InstancedMesh {
  const list = tier === "high" ? CANOPIES : CANOPIES.filter((c) => c.keepMedium);
  const geo = foliageGeometry(tier === "high" ? 3 : 2);
  const phase = new Float32Array(list.length);
  const night = new Float32Array(list.length * 3);
  const uFern = { value: DAY.fern.clone() };

  const mat = new MeshLambertMaterial();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uNight = shared.uNight;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uFern = uFern;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aPhase;\nattribute vec3 aNightColor;\nuniform float uTime;\nuniform float uNight;\nuniform float uWind;\nvarying float vFoliageAO;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(uTime * 1.3 + aPhase) * 0.06 * (position.y + 1.0) * uWind;\nvFoliageAO = mix(0.72, 1.0, smoothstep(-0.6, 0.6, objectNormal.y));",
      )
      .replace(
        "#include <color_vertex>",
        "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\nvColor.xyz = mix(vColor.xyz, aNightColor, uNight);\n#endif",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uFern;\nvarying float vFoliageAO;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vFoliageAO;")
      .replace(
        "#include <lights_lambert_pars_fragment>",
        /* glsl */ `
        varying vec3 vViewPosition;
        struct LambertMaterial { vec3 diffuseColor; float specularStrength; };
        // foliage: wrapped diffuse plus light shining through the leaves from behind
        void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
          float wrapNL = saturate( ( dot( geometryNormal, directLight.direction ) + 0.4 ) / 1.4 );
          float back = pow( max( dot( geometryViewDir, -directLight.direction ), 0.0 ), 4.0 ) * 0.35;
          reflectedLight.directDiffuse += wrapNL * directLight.color * BRDF_Lambert( material.diffuseColor );
          reflectedLight.directDiffuse += back * directLight.color * BRDF_Lambert( uFern );
        }
        void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
          reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
        }
        #define RE_Direct RE_Direct_Lambert
        #define RE_IndirectDiffuse RE_IndirectDiffuse_Lambert
        `,
      );
  };
  mat.customProgramCacheKey = () => "hw-canopy-foliage";

  const mesh = new InstancedMesh(geo, mat, list.length);
  const o = new Object3D();
  const c = new Color();
  list.forEach((cn, i) => {
    o.position.set(cn.x, cn.y, cn.z);
    // turn about y only, so the flat underside stays on the roof
    o.rotation.set(0, cn.phase * 1.7, 0);
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
