import { Sprout } from "./icons";

/** Herbarium specimen label used as a section eyebrow, e.g. "01 — SELECTED WORK". */
export function SpecimenLabel({ children, className = "", tone = "default" }: { children: string; className?: string; tone?: "default" | "onDark" }) {
  return (
    <p className={`eyebrow text-label ${tone === "onDark" ? "!text-[#cfe3d6]" : ""} ${className}`}>
      <Sprout size={10} className={tone === "onDark" ? "text-[#79c48c]" : "text-leaf"} />
      <span>{children}</span>
    </p>
  );
}
