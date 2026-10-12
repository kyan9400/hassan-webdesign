import { Color, ShaderMaterial, Vector3, type IUniform } from "three";
import { DAY, NIGHT } from "./palette";

/**
 * SoftGlassMaterial — the medium-tier tower glass (and the back row on every tier). An OPAQUE
 * ShaderMaterial (no sorting problems), not tone-mapped so it matches the poster's flat colours:
 *  - vertical gradient (#FFFFFF top → sky bottom, pre-mixed 60 % over paper), a dark foot where the
 *    tower meets the lawn (contact AO);
 *  - fine floor lines and mullions, soft fern "indoor plant" bands;
 *  - a fake curtain-wall reflection: R = reflect(−V, N) looks up a sky / ground gradient with a
 *    bright horizon band, mixed by fresnel (0.04 + 0.5·(1 − N·V)^5). N is "pillowed" per window
 *    cell, so the reflection breaks up panel by panel like real glass;
 *  - a specular streak toward the cursor-sun, and a light sweep band (uSweep) on reveal / theme;
 *  - windows: at night ~45 % of the cells glow; the golden-hour scroll (uDusk) switches them on in
 *    a ripple from tower 4 by day, and off (down to 15 %) at night. Lobbies glow warm at the foot.
 * The same GLSL helpers are reused by the high-tier physical glass (see Skyline.ts).
 */

export type GlassShared = {
  uNight: IUniform<number>;
  uSunDir: IUniform<Vector3>;
  /** golden hour / midnight scroll amount, 0 … 1 */
  uDusk: IUniform<number>;
  /** diagonal light sweep position (−3.6 → 4.4 while it runs) */
  uSweep: IUniform<number>;
};

/** Tower 4's x (the ripple centre), from layout.ts. */
const T4_X = -0.6;

export const GLASS_GLSL = /* glsl */ `
  float hw_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hw_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hw_hash(i), hw_hash(i + vec2(1.0, 0.0)), f.x), mix(hw_hash(i + vec2(0.0, 1.0)), hw_hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // the hill line (layout.ts hillTop), so the foot shading follows the lawn
  float hw_hillTop(float x) { return 0.09 * sin(0.55 * x + 0.8) + 0.05 * sin(1.3 * x + 2.1) - 0.02; }
  float hw_along(vec3 wp, vec3 n) { return abs(n.x) > 0.5 ? wp.z : wp.x; }
  // x = floor/mullion line mask, y = lit window amount (night + golden hour), z = plant band mask
  vec3 hw_facade(vec3 wp, vec3 n, float tower, float night, float dusk) {
    float wall = 1.0 - step(0.6, n.y);
    float along = hw_along(wp, n);
    float floorF = fract(wp.y * 4.0);
    float floorLine = step(floorF, 0.03);
    float mullion = step(fract(along * 4.0), 0.025);
    float lines = max(floorLine, mullion * 0.7) * wall;
    vec2 cellUV = vec2(along, wp.y) * vec2(6.0, 4.0);
    vec2 cell = floor(cellUV) + tower;
    vec2 cf = fract(cellUV);
    float inCell = step(0.14, cf.x) * step(cf.x, 0.86) * step(0.2, cf.y) * step(cf.y, 0.8) * wall * step(0.05, wp.y);
    float h = hw_hash(cell);
    // the ripple: from tower 4 outward, floor by floor
    float ripple = step(h * 0.35 + abs(wp.x - (${T4_X.toFixed(2)})) * 0.06 + wp.y * 0.04, dusk);
    float dayOn = ripple * step(0.25, h);
    float nightCells = step(0.55, h);
    float keep = step(0.85, hw_hash(cell + 17.0));
    float nightOn = nightCells * mix(1.0, keep, ripple);
    float lit = mix(dayOn, nightOn, night) * inCell;
    float band = 1.0 - smoothstep(0.0, 0.25, floorF);
    float plants = band * smoothstep(0.35, 0.75, hw_noise(vec2(along * 3.0 + tower * 7.0, floor(wp.y * 4.0) * 1.7))) * wall;
    return vec3(lines, lit, plants);
  }
  // warm lobby band on the front faces, at the foot of each tower
  float hw_lobby(vec3 wp, vec3 n) {
    float front = step(0.5, n.z);
    return front * (1.0 - smoothstep(0.0, 0.3, wp.y - hw_hillTop(wp.x))) * step(-0.05, wp.y - hw_hillTop(wp.x));
  }
  // contact shading where the glass meets the lawn
  float hw_foot(vec3 wp) { return mix(0.78, 1.0, smoothstep(0.0, 0.35, wp.y - hw_hillTop(wp.x))); }
  // the diagonal light sweep band
  float hw_sweep(vec3 wp, float s) { float d = (wp.x * 0.35 + wp.y * 0.2) - s; return exp(-d * d * 30.0) * 0.35; }
  // per-panel "pillowing": each window cell tilts its normal a little (world space)
  vec3 hw_pillow(vec3 wp, vec3 n) {
    float wall = 1.0 - step(0.6, n.y);
    vec2 cell = floor(vec2(hw_along(wp, n), wp.y) * vec2(6.0, 4.0));
    vec2 j = (vec2(hw_hash(cell + 3.1), hw_hash(cell + 7.7)) - 0.5) * 0.07 * wall;
    vec3 t = abs(n.x) > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    return normalize(n + t * j.x + vec3(0.0, j.y, 0.0));
  }
`;

const SKY_DAY = DAY.sky.clone().lerp(DAY.paper, 0.35);
const GROUND_DAY = DAY.fern.clone().lerp(DAY.paper, 0.35);

export function createSoftGlassMaterial(shared: GlassShared, fade: { amount: number; color: Color }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uNight: shared.uNight,
      uSunDir: shared.uSunDir,
      uDusk: shared.uDusk,
      uSweep: shared.uSweep,
      uTopDay: { value: DAY.glassTop.clone() },
      uBottomDay: { value: DAY.glassBottom.clone() },
      uTopNight: { value: NIGHT.glassTop.clone() },
      uBottomNight: { value: NIGHT.glassBottom.clone() },
      uFern: { value: DAY.fern.clone() },
      uWindow: { value: NIGHT.sun.clone() },
      uSkyDay: { value: SKY_DAY },
      uGroundDay: { value: GROUND_DAY },
      uSkyNight: { value: new Color("#1B3A4A") },
      uGroundNight: { value: new Color("#13221A") },
      uSkyDusk: { value: new Color("#FFB36B") },
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
      uniform float uDusk;
      uniform float uSweep;
      uniform vec3 uSunDir;
      uniform vec3 uTopDay;
      uniform vec3 uBottomDay;
      uniform vec3 uTopNight;
      uniform vec3 uBottomNight;
      uniform vec3 uFern;
      uniform vec3 uWindow;
      uniform vec3 uSkyDay;
      uniform vec3 uGroundDay;
      uniform vec3 uSkyNight;
      uniform vec3 uGroundNight;
      uniform vec3 uSkyDusk;
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
        vec3 f = hw_facade(vWorld, N, vTower, uNight, uDusk);
        col = mix(col, vec3(1.0), f.x * 0.18 * (1.0 - 0.6 * uNight));
        col = mix(col, uFern, f.z * 0.15);

        // curtain-wall reflection of a sky / lawn gradient, panel by panel
        vec3 P = hw_pillow(vWorld, N);
        vec3 R = reflect(-V, P);
        float duskSky = uDusk * (1.0 - uNight) * 0.6;
        vec3 sky = mix(mix(uSkyDay, uSkyNight, uNight), uSkyDusk, duskSky);
        vec3 ground = mix(uGroundDay, uGroundNight, uNight);
        vec3 env = mix(ground, sky, smoothstep(-0.1, 0.35, R.y)) + exp(-abs(R.y) * 18.0) * 0.25 * (1.0 - 0.6 * uNight);
        float fres = 0.04 + 0.5 * pow(1.0 - max(dot(P, V), 0.0), 5.0);
        col = mix(col, env, fres);
        col *= hw_foot(vWorld);

        // light: windows, lobbies, the sun streak and the sweep
        col += uWindow * f.y * 0.95;
        float lobbyOn = max(uNight, smoothstep(0.0, 0.25, uDusk));
        col += uWindow * hw_lobby(vWorld, N) * mix(0.25, 1.0, lobbyOn) * 0.6;
        col += pow(max(dot(R, normalize(uSunDir)), 0.0), 48.0) * 0.6 * (1.0 - 0.7 * uNight);
        col += hw_sweep(vWorld, uSweep) * (1.0 - step(0.6, N.y));
        col = mix(col, uFadeColor, uFade);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  });
}
