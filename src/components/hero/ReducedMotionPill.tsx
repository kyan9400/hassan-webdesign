"use client";

import { hero, nav } from "@/data/site";
import { setMotion } from "@/lib/motion";
import { toast } from "@/components/ui/Toast";

/** Bottom-left of the hero, only visible while motion is reduced (CSS reads html[data-motion]). */
export function ReducedMotionPill() {
  return (
    <div className="rm-pill">
      <span>{hero.reducedPill}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={(e) => {
          const next = e.currentTarget.closest(".hero")?.querySelector<HTMLElement>('a[href="#work"], a[href="/#work"]');
          setMotion("full");
          // the pill hides itself: keep focus in the hero (before the toast, so nothing can skip it)
          next?.focus();
          toast(nav.motion.toastOn);
        }}
      >
        {hero.reducedButton}
      </button>
    </div>
  );
}
