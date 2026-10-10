"use client";

import { nav } from "@/data/site";
import { toggleTheme, useTheme } from "@/lib/theme";
import { IconMoon, IconSun } from "@/components/ui/icons";

type Props = {
  /** "auto": text from lg up, icon-only below. "text": always shows the text. */
  display?: "auto" | "text";
  className?: string;
};

/** Day / Night switch. Visible text and icon are switched by CSS so they are right before hydration. */
export function ThemeToggle({ display = "auto", className = "" }: Props) {
  const theme = useTheme();
  const night = theme === "dark";
  const textClass = display === "auto" ? "hidden lg:inline" : "inline";
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={night ? nav.theme.toDayLabel : nav.theme.toNightLabel}
      onClick={toggleTheme}
    >
      <span className="show-light" aria-hidden="true">
        <IconMoon size={20} />
      </span>
      <span className="show-dark" aria-hidden="true">
        <IconSun size={20} />
      </span>
      <span className={textClass} aria-hidden="true">
        <span className="show-light">{nav.theme.toNight}</span>
        <span className="show-dark">{nav.theme.toDay}</span>
      </span>
    </button>
  );
}
