"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { PerspectiveCamera } from "three";
import type { ProjectCard as Project } from "@/data/sectors";
import type { Quality } from "@/lib/quality";
import { GlasshouseController, type GalleryShotFlags } from "./glasshouse";

export type GlasshouseSceneProps = {
  quality: Quality;
  projects: Project[];
  flags: GalleryShotFlags[];
  block: HTMLElement;
  sticky: HTMLElement;
  stage: HTMLElement;
  cell: HTMLElement | null;
  presentSlug: string | null;
  onReady: () => void;
  onLost: () => void;
  onOpen: (slug: string) => void;
  onTravel: (slot: number) => void;
  /** lowers the Canvas DPR cap (kept in React state above the Canvas so re-renders keep it) */
  onDpr: (dpr: number) => void;
};

/**
 * "The Glasshouse" scene. A thin React wrapper: the GlasshouseController owns every three.js object
 * and does all per-frame work on refs and uniforms, so React never re-renders per frame.
 */
export function GlasshouseScene(props: GlasshouseSceneProps) {
  const { quality, projects, flags, block, sticky, stage, cell, presentSlug, onReady, onLost, onOpen, onTravel, onDpr } = props;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const dpr = useThree((s) => s.viewport.dpr);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const [glass] = useState(() => new GlasshouseController(quality, projects, flags));

  useEffect(() => {
    return glass.attach({
      renderer: gl,
      scene,
      camera: camera as PerspectiveCamera,
      invalidate: () => invalidate(),
      setDpr: onDpr,
      block,
      sticky,
      stage,
      cell,
      onReady,
      onLost,
      onOpen,
      onTravel,
    });
  }, [glass, gl, scene, camera, invalidate, onDpr, block, sticky, stage, cell, onReady, onLost, onOpen, onTravel]);

  useEffect(() => {
    // a DPR change resizes the drawing buffer: re-run so point sizes follow
    glass.resize(width, height);
  }, [glass, width, height, dpr]);

  useEffect(() => {
    glass.setPresent(presentSlug);
  }, [glass, presentSlug]);

  useEffect(() => () => glass.dispose(), [glass]);

  useFrame((_, delta) => glass.frame(delta));

  return <primitive object={glass.root} />;
}
