import { Color, ShaderMaterial, Vector3, type IUniform } from "three";
import { DAY, NIGHT } from "./palette";

/**
 * SoftGlassMaterial — the medium-tier tower glass. An OPAQUE ShaderMaterial (no sorting problems):
 *  - vertical gradient (#FFFFFF top → sky bottom, pre-mixed 60 % over paper)
 *  - fine floor lines step(fract(worldY·4), 0.03) at 18 % white, mullions every 0.25 units
 *  - fresnel rim pow(1 − N·V, 3)·0.35
 *  - a specular streak toward the cursor-sun pow(max(R·sunDir, 0), 48)·0.6
 *  - soft fern "indoor plant" bands (value noise) in the lowest 25 % of each floor at 15 %
 *  - night: window cells hash(floor(worldPos.xy·(6,4)) + aTower) > 0.55 light up in warm sun × uNight,
 *    and the gradient shifts to #1F3B44 → #0F2228.
 * The same GLSL helpers are reused by the high-tier physical glass (see Skyline.ts).
 */

export type GlassShared = {
  uNight: IUniform<number>;
  uSunDir: IUniform<Vector3>;
};

export const GLASS_GLSL = /* glsl */ `
  float hw_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hw_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hw_hash(i), hw_hash(i + vec2(1.0, 0.0)), f.x), mix(hw_hash(i + vec2(0.0, 1.0)), hw_hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // returns x = floor/mullion line mask, y = lit window mask, z = plant band mask
  vec3 hw_facade(vec3 wp, vec3 n, float tower) {
    float wall = 1.0 - step(0.6, n.y);
    float along = abs(n.x) > 0.5 ? wp.z : wp.x;
    float floorF = fract(wp.y * 4.0);
    float floorLine = step(floorF, 0.03);
    float mullion = step(fract(along * 4.0), 0.025);
    float lines = max(floorLine, mullion * 0.7) * wall;
    vec2 cellUV = vec2(along, wp.y) * vec2(6.0, 4.0);
    vec2 cf = fract(cellUV);
    float inCell = step(0.14, cf.x) * step(cf.x, 0.86) * step(0.2, cf.y) * step(cf.y, 0.8);
    float lit = step(0.55, hw_hash(floor(cellUV) + tower)) * inCell * wall * step(0.05, wp.y);
    float band = 1.0 - smoothstep(0.0, 0.25, floorF);
    float plants = band * smoothstep(0.35, 0.75, hw_noise(vec2(along * 3.0 + tower * 7.0, floor(wp.y * 4.0) * 1.7))) * wall;
    return vec3(lines, lit, plants);
  }
`;

export function createSoftGlassMaterial(shared: GlassShared, fade: { amount: number; color: Color }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uNight: shared.uNight,
      uSunDir: shared.uSunDir,
      uTopDay: { value: DAY.glassTop.clone() },
      uBottomDay: { value: DAY.glassBottom.clone() },
      uTopNight: { value: NIGHT.glassTop.clone() },
      uBottomNight: { value: NIGHT.glassBottom.clone() },
      uFern: { value: DAY.fern.clone() },
      uWindow: { value: NIGHT.sun.clone() },
      uFade: { value: fade.amount },
      uFadeColor: { value: fade.color },
    },
    vertexShader: /* glsl */ `
      attribute float aTower;
      attribute float aH;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vH;
      varying float vTower;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vH = aH;
        vTower = aTower;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      uniform vec3 uSunDir;
      uniform vec3 uTopDay;
      uniform vec3 uBottomDay;
      uniform vec3 uTopNight;
      uniform vec3 uBottomNight;
      uniform vec3 uFern;
      uniform vec3 uWindow;
      uniform float uFade;
      uniform vec3 uFadeColor;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vH;
      varying float vTower;
      ${GLASS_GLSL}
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 top = mix(uTopDay, uTopNight, uNight);
        vec3 bottom = mix(uBottomDay, uBottomNight, uNight);
        vec3 col = mix(bottom, top, smoothstep(0.0, 1.0, vH));
        col *= 1.0 - 0.08 * abs(N.x);
        vec3 f = hw_facade(vWorld, N, vTower);
        col = mix(col, vec3(1.0), f.x * 0.18 * (1.0 - 0.6 * uNight));
        col = mix(col, uFern, f.z * 0.15);
        col += uWindow * f.y * uNight * 0.95;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.35;
        col += fres * mix(vec3(1.0), vec3(0.35, 0.55, 0.7), uNight);
        vec3 R = reflect(-V, N);
        col += pow(max(dot(R, normalize(uSunDir)), 0.0), 48.0) * 0.6 * (1.0 - 0.7 * uNight);
        col = mix(col, uFadeColor, uFade);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
