"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { projectsBySector } from "@/data/projects";
import { projectCase } from "@/data/site";
import { useGallery } from "@/lib/gallery-store";
import { Toaster } from "@/components/ui/Toast";
import { IconArrowLeft, IconArrowRight, IconClose } from "@/components/ui/icons";

/**
 * The project panel: a native <dialog> opened with showModal() (focus trap, Esc, inert page),
 * a right-hand sheet on desktop and a full-height sheet on mobile. Solid surface, tint-only
 * backdrop (no blur). Lives in the @modal/(.)work layout, so it stays mounted while prev / next
 * swap the content (router.replace). Closing = router.back(); focus returns to the opener.
 * While open, <html> gets `is-locked` (overflow hidden + scrollbar-gutter: stable → no shift).
 */

export const PANEL_TITLE_ID = "project-panel-title";

// Safari never focuses a link / button on click or tap: remember the last one activated instead
let lastActivated: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>("a, button");
      if (t) lastActivated = t;
    },
    true,
  );
}

function focusTitle() {
  document.getElementById(PANEL_TITLE_ID)?.focus({ preventScroll: true });
}

export function ProjectDialog({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const closing = useRef(false);
  const downOnBackdrop = useRef(false);
  const pathname = usePathname();
  const shownPath = useRef(pathname);

  useEffect(() => {
    if (pathname === shownPath.current) return;
    shownPath.current = pathname;
    // prev / next swapped the project (its page remounted): start at its title
    focusTitle();
  }, [pathname]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Safari focuses the nearest focusable ancestor (a tabIndex=-1 section or <main>) instead of
    // the clicked link, so prefer the recorded click target whenever it sits inside the focus
    const active = document.activeElement as HTMLElement | null;
    const clicked = lastActivated && lastActivated.isConnected ? lastActivated : null;
    const opener =
      clicked && (!active || active === document.body || (active !== clicked && active.contains(clicked)))
        ? clicked
        : active instanceof HTMLElement && active !== document.body
          ? active
          : null;
    closing.current = false;
    if (!d.open) d.showModal();
    // phones have no top Close: start at the title, not the first link halfway down
    if (window.matchMedia("(max-width: 767px)").matches) focusTitle();
    document.documentElement.classList.add("is-locked");

    const onCancel = (e: Event) => {
      e.preventDefault();
      if (closing.current) return;
      closing.current = true;
      router.back();
    };
    const onClose = () => {
      if (closing.current) return;
      closing.current = true;
      router.back();
    };
    d.addEventListener("cancel", onCancel);
    d.addEventListener("close", onClose);
    return () => {
      d.removeEventListener("cancel", onCancel);
      d.removeEventListener("close", onClose);
      document.documentElement.classList.remove("is-locked");
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      lastActivated = null; // an old click is never reused for a later opening
    };
  }, [router]);

  return (
    <dialog
      id="project-panel"
      ref={ref}
      className="panel-dialog"
      aria-labelledby={PANEL_TITLE_ID}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // light dismiss: the content fills the dialog, so only a backdrop click hits the dialog itself;
        // the press must start there too (a text drag released over the backdrop is not a dismiss)
        if (downOnBackdrop.current && e.target === e.currentTarget && !closing.current) {
          closing.current = true;
          router.back();
        }
        downOnBackdrop.current = false;
      }}
    >
      {children}
      {/* toasts outside a modal dialog are inert and hidden: this outlet shows them in the panel */}
      <Toaster scope="project-panel" />
    </dialog>
  );
}

/** Close button (top of the panel on desktop). */
export function PanelClose({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`icon-btn icon-btn-outline bg-surface ${className}`}
      aria-label={projectCase.close}
      onClick={() => router.back()}
    >
      <IconClose size={22} />
    </button>
  );
}

type NavItem = { slug: string; name: string };

/**
 * Bottom bar: Previous / Close (thumb zone on mobile) / Next. Neighbours follow the gallery
 * filter; the server-computed prev / next cover direct visits and the "all" filter.
 */
export function PanelNav({ slug, prev: prevAll, next: nextAll }: { slug: string; prev: NavItem; next: NavItem }) {
  const router = useRouter();
  const filter = useGallery((s) => s.filter);
  const list = projectsBySector(filter);
  const i = list.findIndex((p) => p.slug === slug);
  const inList = i >= 0 && list.length > 1;
  const prev = inList ? list[(i - 1 + list.length) % list.length] : prevAll;
  const next = inList ? list[(i + 1) % list.length] : nextAll;
  return (
    <nav aria-label={projectCase.panelNav} className="flex items-center gap-2 border-t border-line bg-surface px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6">
      <button
        type="button"
        className="icon-btn min-w-0 flex-1 justify-start"
        aria-label={projectCase.previous(prev.name)}
        onClick={() => router.replace(`/work/${prev.slug}`, { scroll: false })}
      >
        <IconArrowLeft size={20} />
        {/* stacked so the project name survives on narrow phones */}
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-label text-ink-soft">{projectCase.previousShort}</span>
          <span className="max-w-full truncate font-semibold">{prev.name}</span>
        </span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-outline md:hidden"
        aria-label={projectCase.close}
        onClick={() => router.back()}
      >
        <IconClose size={22} />
      </button>
      <button
        type="button"
        className="icon-btn min-w-0 flex-1 justify-end"
        aria-label={projectCase.next(next.name)}
        onClick={() => router.replace(`/work/${next.slug}`, { scroll: false })}
      >
        <span className="flex min-w-0 flex-col items-end leading-tight">
          <span className="text-label text-ink-soft">{projectCase.nextShort}</span>
          <span className="max-w-full truncate font-semibold">{next.name}</span>
        </span>
        <IconArrowRight size={20} />
      </button>
    </nav>
  );
}
