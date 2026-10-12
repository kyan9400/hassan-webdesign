"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { heroUi as copy } from "@/data/site";
import { detectQuality, type Quality } from "@/lib/quality";
import { getMotion, subscribeMotion } from "@/lib/motion";
import { afterLoadIdle, setHeroLoading, setHeroSettled } from "@/lib/three-gate";

/**
 * Decides, after window `load` and an idle callback, whether the real-time 3D replaces the drawing.
 * Low tier / no WebGL2 → the poster stays (it is designed to be the whole hero). Otherwise the 3D
 * chunk is loaded, warms up behind the poster and cross-fades in (`data-hero="live"`).
 * On `webglcontextlost` the canvas is unmounted and the poster comes back.
 * The tall "golden hour" scroll track (`data-track="tall"`) is switched on only when the 3D is
 * live and the reader is still at the top, so the page never shifts under them.
 */

// React.lazy, not next/dynamic: it is only rendered after an effect, so never on the server,
// and the first-load bundle skips next/dynamic's loader
const HeroStage = lazy(() => import("./HeroStage"));

type Stage = { quality: Quality; hero: HTMLElement; text: HTMLElement | null };

/**
 * The pinned stage has a fixed first-screen height: pin it only when the hero's natural height
 * (measured in the short layout) fits the window, or its lower part (the skyline) would be cut.
 */
function stageFits(hero: HTMLElement): boolean {
  const stage = hero.querySelector<HTMLElement>(".hero-sticky");
  return !!stage && stage.offsetHeight <= window.innerHeight + 2;
}

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

    // wait for the page's own load, then an idle moment: the headline paints first (good LCP)
    const cancelIdle = afterLoadIdle(() => {
      if (cancelled) return;
      const q = detectQuality();
      hero.dataset.tier = q.tier;
      setTouch(q.touch);
      if (q.tier === "low" || !q.webgl2) {
        hero.setAttribute("data-hero", "poster");
        setHeroSettled();
        return;
      }
      setHeroLoading();
      setStage({ quality: q, hero, text: hero.querySelector<HTMLElement>("[data-hero-text]") });
    });

    const onMove = () => {
      movedRef.current = true;
      setHint(false);
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerdown", onMove, { passive: true });

    return () => {
      cancelled = true;
      cancelIdle();
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerdown", onMove);
    };
  }, []);

  // turning full motion on later (nav toggle, hero pill) may grow the hero into the tall track:
  // allowed only from the top of the page, otherwise the page would jump under the reader
  useEffect(() => {
    let was = getMotion();
    return subscribeMotion(() => {
      const now = getMotion();
      const turnedOn = was !== "full" && now === "full";
      was = now;
      const hero = heroRef.current;
      if (!turnedOn || !hero || hero.getAttribute("data-hero") !== "live") return;
      hero.removeAttribute("data-track");
      if (window.scrollY < 10 && stageFits(hero)) hero.setAttribute("data-track", "tall");
    });
  }, []);

  const onReady = useCallback(() => {
    const hero = heroRef.current;
    hero?.setAttribute("data-hero", "live");
    // golden-hour track: only from the top of the page (no shift under a reader)
    if (hero && window.scrollY < 10 && stageFits(hero)) hero.setAttribute("data-track", "tall");
    setHeroSettled();
    if (getMotion() !== "full") return;
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      if (!movedRef.current && getMotion() === "full") setHint(true);
    }, 2500);
  }, []);

  const onLost = useCallback(() => {
    const hero = heroRef.current;
    hero?.setAttribute("data-hero", "poster");
    hero?.removeAttribute("data-track");
    setHeroSettled();
    setHint(false);
    setStage(null);
  }, []);

  return (
    <>
      <div ref={ref} className="hero-canvas">
        {stage ? (
          <Suspense fallback={null}>
            <HeroStage quality={stage.quality} hero={stage.hero} text={stage.text} onReady={onReady} onLost={onLost} />
          </Suspense>
        ) : null}
      </div>
      <p className="hero-hint" data-show={hint ? "true" : "false"} aria-hidden="true">
        {touch ? copy.hintTouch : copy.hintDesktop}
      </p>
    </>
  );
}
