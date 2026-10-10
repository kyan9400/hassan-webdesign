import { CircleGeometry, Color, DoubleSide, PlaneGeometry, ShaderMaterial } from "three";

/**
 * Hummingbird wings. A real hummingbird beats ~50 times a second, which a 60 fps render can't show
 * without strobing, so each wing is drawn twice:
 *  1. Blur fan — a sector covering the stroke arc whose density follows the arcsine distribution
 *     1/sqrt(1 − x²): a sinusoidal wing spends most of its time at the turning points, so the fan is
 *     denser at both edges. Faint radial feather streaks. Colour `sky`, max alpha 0.35.
 *  2. Ghost wing — the sharp wing shape (SDF alpha) at 30 % opacity, flapping at a visible 9 Hz.
 */

export const WING_ARC_START = (40 * Math.PI) / 180;
export const WING_ARC_LENGTH = (120 * Math.PI) / 180;
export const WING_LENGTH = 0.42;

export function createFanGeometry(): CircleGeometry {
  return new CircleGeometry(WING_LENGTH, 28, WING_ARC_START, WING_ARC_LENGTH);
}

export function createFanMaterial(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 1 },
      uArcMid: { value: WING_ARC_START + WING_ARC_LENGTH / 2 },
      uArcHalf: { value: WING_ARC_LENGTH / 2 },
      uLen: { value: WING_LENGTH },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uArcMid;
      uniform float uArcHalf;
      uniform float uLen;
      varying vec2 vP;
      void main() {
        float r = length(vP) / uLen;
        float a = atan(vP.y, vP.x);
        float x = clamp((a - uArcMid) / uArcHalf, -0.995, 0.995);
        // arcsine density: the wing lingers at the turning points
        float density = 0.11 / sqrt(1.0 - x * x);
        float streaks = 0.82 + 0.18 * sin(a * 70.0);
        float radial = smoothstep(0.18, 0.45, r) * (1.0 - smoothstep(0.86, 1.0, r));
        float alpha = min(0.35, density * streaks) * radial * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

export function createGhostGeometry(): PlaneGeometry {
  const g = new PlaneGeometry(WING_LENGTH * 0.95, 0.13, 1, 1);
  g.translate((WING_LENGTH * 0.95) / 2, 0, 0); // pivot at the shoulder (x = 0)
  return g;
}

export function createGhostMaterial(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 0.3 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // wing silhouette: narrow at the shoulder, broad in the middle, rounded tip, swept trailing edge
        float u = vUv.x;
        float hw = 0.5 * (0.35 + 0.65 * sin(3.14159 * pow(u, 0.75))) * (1.0 - smoothstep(0.86, 1.0, u) * 0.6);
        float v = vUv.y - 0.5 + 0.12 * u * u;
        float d = abs(v) - hw * 0.92;
        float edge = 1.0 - smoothstep(-0.03, 0.01, d);
        float tip = 1.0 - smoothstep(0.97, 1.0, u);
        float vein = 0.9 + 0.1 * sin(u * 40.0 + v * 8.0);
        gl_FragColor = vec4(uColor * vein, edge * tip * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
