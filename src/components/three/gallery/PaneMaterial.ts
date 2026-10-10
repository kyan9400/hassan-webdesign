import { Color, ShaderMaterial, Vector2, type IUniform, type Texture } from "three";
import { PANE_H, PANE_R, PANE_W, PHONE, PHONE_H, PHONE_W } from "./arrangement";

/**
 * PaneMaterial — an opaque, unlit ShaderMaterial (no sorting problems, geometry corners get MSAA):
 *  - frost for inactive / filtered-out panes via the mip LOD bias: texture(uMap, uv, frost · 3.5) — a
 *    free "blur" from the mip chain, no extra passes — plus 30 % desaturation and dimming;
 *  - glass glare: a soft diagonal band (≤ +8 % white) that follows uPointer.x, plus a 1 px inner rim;
 *  - reveal: a bottom-up wipe with a soft edge from the placeholder to the screenshot (uReveal 0 → 1);
 *  - uDim fades the pane toward the stage colour (other panes while a project is presented).
 * PhoneMaterial draws the 0.03 ink bezel and the mobile screenshot in one plane (one draw call).
 */

export type PaneShared = { uBg: IUniform<Color>; uNight: IUniform<number> };

const SDF = /* glsl */ `
  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export type PaneUniforms = {
  uMap: IUniform<Texture>;
  uPlace: IUniform<Texture>;
  uReveal: IUniform<number>;
  uFrost: IUniform<number>;
  uDim: IUniform<number>;
  uHover: IUniform<number>;
  uPointer: IUniform<Vector2>;
};

export function createPaneMaterial(place: Texture, shared: PaneShared): ShaderMaterial & { uniforms: PaneUniforms } {
  const uniforms = {
    uMap: { value: place },
    uPlace: { value: place },
    uReveal: { value: 0 },
    uFrost: { value: 1 },
    uDim: { value: 0 },
    uHover: { value: 0 },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uBg: shared.uBg,
    uNight: shared.uNight,
    uSize: { value: new Vector2(PANE_W, PANE_H) },
  };
  return new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform sampler2D uPlace;
      uniform float uReveal;
      uniform float uFrost;
      uniform float uDim;
      uniform float uHover;
      uniform float uNight;
      uniform vec2 uPointer;
      uniform vec2 uSize;
      uniform vec3 uBg;
      varying vec2 vUv;
      ${SDF}
      void main() {
        float bias = uFrost * 3.5;
        vec3 shot = texture2D(uMap, vUv, bias).rgb;
        vec3 place = texture2D(uPlace, vUv, bias).rgb;
        float edge = uReveal * 1.3 - 0.15;
        float m = 1.0 - smoothstep(edge - 0.12, edge + 0.02, vUv.y);
        vec3 col = mix(place, shot, m);

        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, vec3(l), 0.3 * uFrost);
        col *= mix(1.0, mix(0.8, 0.62, uNight), uFrost);

        // glass glare: a soft diagonal band that follows the pointer
        float g = vUv.x + (1.0 - vUv.y) * 0.55 - mix(0.42, uPointer.x * 1.5, uHover);
        col += exp(-g * g * 55.0) * (0.03 + 0.05 * uHover) * (1.0 - 0.7 * uFrost);

        // 1 px inner rim highlight along the rounded edge
        vec2 p = (vUv - 0.5) * uSize;
        float d = sdRound(p, uSize * 0.5, ${PANE_R.toFixed(3)});
        float aa = max(fwidth(d), 1e-4);
        col += (1.0 - smoothstep(aa * 0.5, aa * 1.8, -d)) * mix(0.22, 0.14, uNight);

        col = mix(col, uBg, uDim);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  }) as ShaderMaterial & { uniforms: PaneUniforms };
}

export type PhoneUniforms = {
  uMap: IUniform<Texture>;
  uPlace: IUniform<Texture>;
  uReveal: IUniform<number>;
  uDim: IUniform<number>;
};

export function createPhoneMaterial(place: Texture, shared: PaneShared): ShaderMaterial & { uniforms: PhoneUniforms } {
  const uniforms = {
    uMap: { value: place },
    uPlace: { value: place },
    uReveal: { value: 0 },
    uDim: { value: 0 },
    uBg: shared.uBg,
    uNight: shared.uNight,
    uBezel: { value: new Color("#13221a") },
    uOuter: { value: new Vector2(PHONE_W, PHONE_H) },
    uScreen: { value: new Vector2(PHONE.screenW, PHONE.screenH) },
  };
  return new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform sampler2D uPlace;
      uniform float uReveal;
      uniform float uDim;
      uniform float uNight;
      uniform vec3 uBg;
      uniform vec3 uBezel;
      uniform vec2 uOuter;
      uniform vec2 uScreen;
      varying vec2 vUv;
      ${SDF}
      void main() {
        vec2 p = (vUv - 0.5) * uOuter;
        float d = sdRound(p, uScreen * 0.5, ${PHONE.screenR.toFixed(3)});
        float aa = max(fwidth(d), 1e-4);
        vec2 suv = clamp(p / uScreen + 0.5, 0.0, 1.0);
        vec3 shot = texture2D(uMap, suv).rgb;
        vec3 place = texture2D(uPlace, suv).rgb;
        float edge = uReveal * 1.3 - 0.15;
        float m = 1.0 - smoothstep(edge - 0.12, edge + 0.02, suv.y);
        vec3 screen = mix(place, shot, m);
        vec3 bezel = mix(uBezel, uBezel + 0.08, uNight);
        vec3 col = mix(screen, bezel, smoothstep(-aa, aa, d));
        col = mix(col, uBg, uDim);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  }) as ShaderMaterial & { uniforms: PhoneUniforms };
}
