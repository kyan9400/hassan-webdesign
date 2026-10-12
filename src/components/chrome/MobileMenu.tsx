"use client";

import { Suspense, lazy, useCallback, useState } from "react";
import { nav } from "@/data/site";
import { IconMenu } from "@/components/ui/icons";

// the sheet (links, toggles, toast outlet) loads on the first tap, not with the page
// (React.lazy: rendered only after a click, so it never runs on the server)
const MobileSheet = lazy(() => import("./MobileSheet"));

/** Mobile (< 768px) Menu button. The full-screen <dialog> sheet is fetched on first use. */
export function MobileMenu() {
  const [openCount, setOpenCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const onClosed = useCallback(() => setExpanded(false), []);

  return (
    <>
      <button
        type="button"
        className="icon-btn md:hidden"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={openCount > 0 ? "mobile-menu" : undefined}
        onClick={() => {
          setOpenCount((n) => n + 1);
          setExpanded(true);
        }}
      >
        <IconMenu size={22} />
        <span className="max-[379px]:sr-only">{nav.menu.open}</span>
      </button>
      {openCount > 0 ? (
        <Suspense fallback={null}>
          <MobileSheet openCount={openCount} onClosed={onClosed} />
        </Suspense>
      ) : null}
    </>
  );
}
