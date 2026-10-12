"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sectionDotsLabel, sectionLinks } from "@/data/site";
import { subscribeScrollFrame } from "@/lib/scroll-progress";

/**
 * Page chrome that follows the scroll, with no dependencies and no React state per frame:
 *  - a 2px leaf progress stem at the top (transform: scaleX, written on a ref);
 *  - section dots on the right (≥ 1024px): real links in a labelled nav, aria-current on the
 *    section in the middle of the screen (one IntersectionObserver);
 *  - magnetic buttons: elements with [data-magnetic] lean up to 6px toward a fine pointer within
 *    80px (one pointermove listener, one rAF, translate only; full motion only).
 * Both bars hide while the project dialog is open (html[data-dialog-open], CSS).
 */

type Id = (typeof sectionLinks)[number]["id"];

const RANGE = 80;
const PULL = 0.25;
const MAX = 6;

export function ScrollChrome() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState<Id[]>([]);
  const [current, setCurrent] = useState<Id | null>(null);

  // progress stem
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let last = -1;
    const update = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      bar.style.transform = `scaleX(${p})`;
    };
    update();
    return subscribeScrollFrame(update);
  }, [pathname]);

  // which sections exist on this page, and which one is in the middle of the screen
  useEffect(() => {
    const els = sectionLinks
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    // after this frame: the dots render only for the sections this page has
    const raf = requestAnimationFrame(() => setPresent(els.map((el) => el.id as Id)));
    if (!els.length || !("IntersectionObserver" in window)) return () => cancelAnimationFrame(raf);
    // the sections crossing the middle band; none (e.g. back in the hero) clears the dot
    const inBand = new Set<Id>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id as Id);
          else inBand.delete(e.target.id as Id);
        }
        let next: Id | null = null;
        for (const el of els) if (inBand.has(el.id as Id)) next = el.id as Id;
        setCurrent(next);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pathname]);

  // magnetic buttons
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const visible = new Set<HTMLElement>();
    // the current lean of each element, so its resting centre is measured without it
    const lean = new Map<HTMLElement, Float32Array>();
    const set = (el: HTMLElement, dx: number, dy: number) => {
      const l = lean.get(el);
      if (!l || (l[0] === dx && l[1] === dy)) return;
      l[0] = dx;
      l[1] = dy;
      el.style.translate = dx || dy ? `${dx.toFixed(1)}px ${dy.toFixed(1)}px` : "";
    };
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver((entries) => {
            for (const e of entries) {
              const el = e.target as HTMLElement;
              if (e.isIntersecting) visible.add(el);
              else {
                visible.delete(el);
                set(el, 0, 0);
              }
            }
          })
        : null;
    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
      lean.set(el, new Float32Array(2));
      io?.observe(el);
    });

    let px = 0;
    let py = 0;
    let frame = 0;
    const apply = () => {
      frame = 0;
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        const l = lean.get(el);
        const left = r.left - (l ? l[0] : 0);
        const top = r.top - (l ? l[1] : 0);
        const cx = left + r.width / 2;
        const cy = top + r.height / 2;
        // distance from the pointer to the element's resting box (0 inside)
        const ox = Math.max(left - px, 0, px - left - r.width);
        const oy = Math.max(top - py, 0, py - top - r.height);
        if (ox * ox + oy * oy > RANGE * RANGE) {
          set(el, 0, 0);
          continue;
        }
        set(el, Math.max(-MAX, Math.min(MAX, (px - cx) * PULL)), Math.max(-MAX, Math.min(MAX, (py - cy) * PULL)));
      }
    };
    const reset = () => {
      for (const el of visible) set(el, 0, 0);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches) return;
      if (document.documentElement.getAttribute("data-motion") !== "full") {
        reset();
        return;
      }
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
      if (frame) cancelAnimationFrame(frame);
      io?.disconnect();
      reset();
    };
  }, [pathname]);

  return (
    <>
      <div className="scroll-stem" aria-hidden="true">
        <div ref={barRef} className="scroll-stem-fill" />
      </div>
      {present.length ? (
        <nav className="section-dots" aria-label={sectionDotsLabel}>
          <ul>
            {sectionLinks
              .filter((s) => present.includes(s.id))
              .map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="section-dot" aria-current={current === s.id ? "true" : undefined}>
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
                      <path d="M5 9.5V4.6M5 5.4C5 3.4 3.6 2.2 1.4 2.2 1.4 4.3 2.9 5.4 5 5.4ZM5 4.6C5 2.6 6.4 1 8.6 1 8.6 3.2 7.2 4.6 5 4.6Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
                    </svg>
                    <span className="sr-only">{s.label}</span>
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
