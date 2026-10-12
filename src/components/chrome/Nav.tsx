"use client";

import { RouteLink as Link } from "@/components/ui/RouteLink";
import { useEffect, useRef } from "react";
import { nav, navLinks, owner, waLink } from "@/data/site";
import { btnClass } from "@/components/ui/Button";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

/**
 * Floating pill nav: solid surface, 1px line border, soft shadow (never a blurred backdrop).
 * Hides on scroll down after the hero, returns on scroll up (transform only),
 * and stays visible while focus is inside it.
 */
export function Nav() {
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let lastY = window.scrollY;
    let hidden = false;
    let focusInside = false;
    let frame = 0;

    const apply = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      wrap.setAttribute("data-hidden", next ? "true" : "false");
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      const pastHero = y > window.innerHeight * 0.85;
      if (focusInside || !pastHero) apply(false);
      else if (dy > 6) apply(true);
      else if (dy < -6) apply(false);
      if (Math.abs(dy) > 6 || !pastHero) lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onFocusIn = () => {
      focusInside = true;
      apply(false);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!wrap.contains(e.relatedTarget as Node | null)) focusInside = false;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    wrap.addEventListener("focusin", onFocusIn);
    wrap.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("scroll", onScroll);
      wrap.removeEventListener("focusin", onFocusIn);
      wrap.removeEventListener("focusout", onFocusOut);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={wrapRef} className="nav-wrap" data-hidden="false">
      <nav aria-label={nav.primaryLabel} className="nav-pill">
        <Link href="/#top" aria-label={nav.homeLabel} className="wordmark mr-auto">
          {owner.wordmark}
          <span className="dot">.</span>
        </Link>

        <ul className="hidden md:flex items-center">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="nav-link">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center">
          <ThemeToggle />
          <MotionToggle />
        </div>

        <Link href={nav.cta.href} className={btnClass("primary", "sm", "hidden md:inline-flex ml-1")} data-magnetic>
          {nav.cta.label}
        </Link>

        <a
          href={waLink(nav.mobileCta.message)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={nav.mobileCta.ariaLabel}
          className={btnClass("primary", "sm", "md:hidden")}
        >
          {nav.mobileCta.label}
        </a>
        <MobileMenu />
      </nav>
    </header>
  );
}
