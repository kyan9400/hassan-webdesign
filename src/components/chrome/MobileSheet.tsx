"use client";

import { RouteLink as Link } from "@/components/ui/RouteLink";
import { useEffect, useRef } from "react";
import { nav, navLinks, owner } from "@/data/site";
import { IconClose } from "@/components/ui/icons";
import { btnClass } from "@/components/ui/Button";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Toaster } from "@/components/ui/Toast";

/**
 * The mobile menu sheet: a solid-surface native <dialog>. Loaded on the first tap of the Menu
 * button (React.lazy), so it is not in the first-load bundle. `openCount` opens it.
 */
export default function MobileSheet({ openCount, onClosed }: { openCount: number; onClosed: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d || d.open || openCount === 0) return;
    d.showModal();
    document.documentElement.classList.add("is-locked");
  }, [openCount]);

  function close() {
    dialogRef.current?.close();
  }

  function onClose() {
    document.documentElement.classList.remove("is-locked");
    onClosed();
  }

  return (
    <dialog id="mobile-menu" ref={dialogRef} className="sheet" aria-label={nav.menu.title} onClose={onClose}>
      <div className="container-site flex items-center justify-between pt-6 pb-2">
        <span className="wordmark" aria-hidden="true">
          {owner.wordmark}
          <span className="dot">.</span>
        </span>
        <button type="button" className="icon-btn icon-btn-outline" onClick={close} aria-label={nav.menu.closeLabel}>
          <IconClose size={22} />
        </button>
      </div>
      <nav aria-label={nav.menu.title} className="container-site flex-1 pt-6">
        <ul className="flex flex-col">
          {navLinks.map((l) => (
            <li key={l.href} className="border-b border-line">
              <Link href={l.href} onClick={close} className="flex min-h-[64px] items-center text-display-m no-underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-2">
          <ThemeToggle display="text" className="icon-btn-outline" />
          <MotionToggle display="text" className="icon-btn-outline" />
        </div>
      </nav>
      <div className="container-site pb-[max(24px,env(safe-area-inset-bottom))] pt-6">
        <Link href={nav.cta.href} onClick={close} className={btnClass("primary", "md", "w-full")}>
          {nav.cta.label}
        </Link>
      </div>
      {/* the page is inert while the menu is open: its toasts show here */}
      <Toaster scope="mobile-menu" />
    </dialog>
  );
}
