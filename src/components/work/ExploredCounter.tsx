"use client";

import { RouteLink as Link } from "@/components/ui/RouteLink";
import { useGallery } from "@/lib/gallery-store";
import { PROJECT_COUNT } from "@/data/sectors";
import { work } from "@/data/site";
import { btnClass } from "@/components/ui/Button";

/** "{n} of 11 explored" — reads the same session store as the vine blossoms. */
export function ExploredCounter({ className = "" }: { className?: string }) {
  const n = useGallery((s) => s.visited.length);
  if (n >= PROJECT_COUNT) {
    return (
      <p className={`flex flex-wrap items-center gap-3 ${className}`}>
        <span className="font-medium">{work.exploredAll}</span>
        <Link href="/#contact" className={btnClass("primary", "sm")}>
          {work.exploredAllCta}
        </Link>
      </p>
    );
  }
  return <p className={`text-label tabular-nums text-ink-soft ${className}`}>{work.explored(n)}</p>;
}
