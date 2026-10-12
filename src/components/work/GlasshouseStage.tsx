"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, memo, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import { GlasshouseScene, type GlasshouseSceneProps } from "@/components/three/gallery/GlasshouseScene";

/**
 * The 3D Glasshouse, lazy-loaded on the client only in 3D mode (desktop, fine pointer,
 * tier ≥ medium, WebGL2) when the section comes near. Render on demand; the controller's governor
 * decides when frames happen (60 / 30 / 0 fps). The canvas is aria-hidden and never focusable —
 * the <ol> next to it carries every action.
 */

const Stats = lazy(() => import("@react-three/drei/core/Stats").then((m) => ({ default: m.Stats })));

type Props = Omit<GlasshouseSceneProps, "onDpr">;

// ACES for the lit parts (bird, metal mullions); panes and phone screens opt out, so the
// screenshots are never altered
const GL = {
  alpha: true,
  antialias: true,
  stencil: false,
  powerPreference: "high-performance" as const,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.05,
};

function GlasshouseStage(props: Props) {
  // adaptive DPR lives above the Canvas: a Canvas re-render would otherwise reset it
  const [dprCap, setDprCap] = useState(props.quality.dprCap);
  const [showStats] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has("fps");
    } catch {
      return false;
    }
  });

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, dprCap]}
      resize={{ scroll: false }}
      gl={GL}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0.15, -3.8] }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <GlasshouseScene {...props} onDpr={setDprCap} />
      {showStats ? (
        <Suspense fallback={null}>
          <Stats />
        </Suspense>
      ) : null}
    </Canvas>
  );
}

export default memo(GlasshouseStage);
