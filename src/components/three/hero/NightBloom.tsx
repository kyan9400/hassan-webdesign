"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";

/**
 * High tier + night only: a soft bloom on the lit windows, glowing petals and fireflies.
 * Loaded with a dynamic import only in that case.
 */
export default function NightBloom() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
    </EffectComposer>
  );
}
