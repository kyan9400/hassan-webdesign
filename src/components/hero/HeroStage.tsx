"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, memo, useCallback, useState } from "react";
import type { Quality } from "@/lib/quality";
import { useTheme } from "@/lib/theme";
import { GardenScene } from "@/components/three/hero/GardenScene";

/**
 * The real-time 3D hero, loaded with next/dynamic (ssr: false) only when the tier is not low and
 * WebGL2 exists. Render on demand; the GardenController's governor decides when frames happen.
 */

const NightBloom = lazy(() => import("@/components/three/hero/NightBloom"));
const Stats = lazy(() => import("@react-three/drei/core/Stats").then((m) => ({ default: m.Stats })));

type Props = {
  quality: Quality;
  hero: HTMLElement;
  text: HTMLElement | null;
  onReady: () => void;
  onLost: () => void;
};

function HeroStage({ quality, hero, text, onReady, onLost }: Props) {
  const theme = useTheme();
  const [showStats] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has("fps");
    } catch {
      return false;
    }
  });
  // adaptive quality lives above the Canvas: a Canvas re-render would otherwise reset the DPR
  const [dprCap, setDprCap] = useState(quality.dprCap);
  const [lite, setLite] = useState(false);
  const onDegrade = useCallback(() => setLite(true), []);
  const bloom = quality.tier === "high" && theme === "dark" && !lite;

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, dprCap]}
      resize={{ scroll: false }}
      gl={{ alpha: true, antialias: true, stencil: false, powerPreference: "high-performance" }}
      flat
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
      {bloom ? (
        <Suspense fallback={null}>
          <NightBloom />
        </Suspense>
      ) : null}
      {showStats ? (
        <Suspense fallback={null}>
          <Stats />
        </Suspense>
      ) : null}
    </Canvas>
  );
}

export default memo(HeroStage);
