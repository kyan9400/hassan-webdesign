"use client";

import { nav } from "@/data/site";
import { setMotion, useMotion } from "@/lib/motion";
import { IconMotion } from "@/components/ui/icons";
import { toast } from "@/lib/toast";

type Props = {
  /** "auto": icon + text from lg up, icon-only below. "text": always icon + text. */
  display?: "auto" | "text";
  className?: string;
};

/**
 * "Turn on full motion" / "Reduce motion". The label names the action, so there is no aria-pressed.
 * The label text is switched by CSS (html[data-motion]) so it is correct before hydration;
 * below lg the text is visually hidden but still names the button.
 */
export function MotionToggle({ display = "auto", className = "" }: Props) {
  const motion = useMotion();
  const full = motion === "full";
  const textWrap = display === "auto" ? "sr-only lg:not-sr-only" : "";

  function onClick() {
    const next = full ? "reduced" : "full";
    setMotion(next);
    toast(next === "full" ? nav.motion.toastOn : nav.motion.toastOff);
  }

  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick}>
      <IconMotion size={20} />
      <span className={textWrap}>
        <span className="when-reduced">{nav.motion.turnOn}</span>
        <span className="when-full">{nav.motion.reduce}</span>
      </span>
    </button>
  );
}
