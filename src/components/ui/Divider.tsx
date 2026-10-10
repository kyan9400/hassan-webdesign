import { Sprout } from "./icons";

/** Section divider: a hairline with a 12px sprout glyph at the left end. */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`divider ${className}`} aria-hidden="true">
      <Sprout size={12} />
    </div>
  );
}
