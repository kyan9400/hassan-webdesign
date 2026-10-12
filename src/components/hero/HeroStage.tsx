"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, memo, useCallback, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import type { Quality } from "@/lib/quality";
import { GardenScene } from "@/components/three/hero/GardenScene";

/**
 * The real-time 3D hero, lazy-loaded on the client only when the tier is not low and
 * WebGL2 exists. Render on demand; the GardenController's governor decides when frames happen.
 * ACES tone mapping for the lit parts; the materials that must match the poster's flat colours
 * opt out (toneMapped: false). Night glow comes from additive sprites, not a post-processing pass.
 */

const Stats = lazy(() => import("@react-three/drei/core/Stats").then((m) => ({ default: m.Stats })));

type Props = {
  quality: Quality;
  hero: HTMLElement;
  text: HTMLElement | null;
  onReady: () => void;
  onLost: () => void;
};

const GL = {
  alpha: true,
  antialias: true,
  stencil: false,
  powerPreference: "high-performance" as const,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.05,
};

function HeroStage({ quality, hero, text, onReady, onLost }: Props) {
  const [showStats] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has("fps");
    } catch {
      return false;
    }
  });
  // adaptive quality lives above the Canvas: a Canvas re-render would otherwise reset the DPR
  const [dprCap, setDprCap] = useState(quality.dprCap);
  // the glass swap happens inside the scene; nothing above the Canvas has to change
  const onDegrade = useCallback(() => {}, []);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, dprCap]}
      resize={{ scroll: false }}
      gl={GL}
      camera={{ fov: 30, near: 0.1, far: 140, position: [0, 5.65, 22.2] }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <GardenScene
        quality={quality} hero={hero} text={text} onReady={onReady}
        onLost={onLost}
        onDpr={setDprCap}
        onDegrade={onDegrade}
      />
      {showStats ? (
        <Suspense fallback={null}>
          <Stats />
        </Suspense>
      ) : null}
    </Canvas>
  );
}

export default memo(HeroStage);
