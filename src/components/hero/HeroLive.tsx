"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { hero as copy } from "@/data/site";
import { detectQuality, type Quality } from "@/lib/quality";
import { getMotion } from "@/lib/motion";

/**
 * Decides, after hydration and an idle callback, whether the real-time 3D replaces the drawing.
 * Low tier / no WebGL2 → the poster stays (it is designed to be the whole hero). Otherwise the 3D
 * chunk is loaded, warms up behind the poster and cross-fades in (`data-hero="live"`).
 * On `webglcontextlost` the canvas is unmounted and the poster comes back.
 */

const HeroStage = dynamic(() => import("./HeroStage"), { ssr: false });

type Stage = { quality: Quality; hero: HTMLElement; text: HTMLElement | null };

export function HeroLive() {
  const ref = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [hint, setHint] = useState(false);
  const [touch, setTouch] = useState(false);
  const movedRef = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>(".hero") ?? null;
    heroRef.current = hero;
    if (!hero) return;
    let cancelled = false;

    const decide = () => {
      if (cancelled) return;
      const q = detectQuality();
      hero.dataset.tier = q.tier;
      setTouch(q.touch);
      if (q.tier === "low" || !q.webgl2) {
        hero.setAttribute("data-hero", "poster");
        return;
      }
      setStage({ quality: q, hero, text: hero.querySelector<HTMLElement>("[data-hero-text]") });
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(decide, { timeout: 1000 });
    else timeoutId = setTimeout(decide, 300);

    const onMove = () => {
      movedRef.current = true;
      setHint(false);
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerdown", onMove, { passive: true });

    return () => {
      cancelled = true;
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerdown", onMove);
    };
  }, []);

  const onReady = useCallback(() => {
    heroRef.current?.setAttribute("data-hero", "live");
    if (getMotion() !== "full") return;
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      if (!movedRef.current && getMotion() === "full") setHint(true);
    }, 2500);
  }, []);

  const onLost = useCallback(() => {
    heroRef.current?.setAttribute("data-hero", "poster");
    setHint(false);
    setStage(null);
  }, []);

  return (
    <>
      <div ref={ref} className="hero-canvas">
        {stage ? <HeroStage quality={stage.quality} hero={stage.hero} text={stage.text} onReady={onReady} onLost={onLost} /> : null}
      </div>
      <p className="hero-hint" data-show={hint ? "true" : "false"} aria-hidden="true">
        {touch ? copy.hintTouch : copy.hintDesktop}
      </p>
    </>
  );
}
