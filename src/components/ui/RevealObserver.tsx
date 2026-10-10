"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * "Grow, don't slide": marks `[data-reveal]` / `[data-reveal-watch]` elements with `data-revealed`
 * the first time they enter the viewport. CSS does the rest (transform + opacity only), and only
 * under full motion — reduced motion shows everything at rest.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed]), [data-reveal-watch]:not([data-revealed])");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-revealed", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-revealed", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
