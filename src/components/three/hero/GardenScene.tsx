"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { PerspectiveCamera } from "three";
import type { Quality } from "@/lib/quality";
import { GardenController } from "./garden";

type Props = {
  quality: Quality;
  hero: HTMLElement;
  text: HTMLElement | null;
  onReady: () => void;
  onLost: () => void;
  /** lowers the Canvas DPR cap (kept in React state above the Canvas so re-renders keep it) */
  onDpr: (dpr: number) => void;
  onDegrade: () => void;
};

/**
 * "The living skyline" scene. A thin React wrapper: the GardenController owns every three.js
 * object and does all per-frame work on refs and uniforms, so React never re-renders per frame.
 */
export function GardenScene({ quality, hero, text, onReady, onLost, onDpr, onDegrade }: Props) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const dpr = useThree((s) => s.viewport.dpr);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const [garden] = useState(() => new GardenController(quality));

  useEffect(() => {
    return garden.attach({
      renderer: gl,
      scene,
      camera: camera as PerspectiveCamera,
      invalidate: () => invalidate(),
      setDpr: onDpr,
      hero,
      text,
      onReady,
      onLost,
      onDegrade,
    });
  }, [garden, gl, scene, camera, invalidate, onDpr, hero, text, onReady, onLost, onDegrade]);

  useEffect(() => {
    // a DPR change resizes the drawing buffer: re-run so point sizes follow
    garden.resize(width, height);
  }, [garden, width, height, dpr]);

  useEffect(() => () => garden.dispose(), [garden]);

  useFrame((_, delta) => garden.frame(delta));

  return <primitive object={garden.root} />;
}
