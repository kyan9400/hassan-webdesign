"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import type { Project, Sector } from "@/data/projects";
import { pad2, SECTORS } from "@/data/projects";
import { work } from "@/data/site";
import { getGallery, setGalleryActive, setGalleryFilter, setGalleryView, useGallery } from "@/lib/gallery-store";
import { getGalleryMode, useGallery3dCapable, useGalleryMode, useGalleryQuality } from "@/lib/gallery-mode";
import { getMotion } from "@/lib/motion";
import { subscribeScrollFrame } from "@/lib/scroll-progress";
import { clamp } from "@/lib/damp";
import { announce } from "@/components/ui/LiveRegion";
import { btnClass } from "@/components/ui/Button";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import { ExploredCounter } from "./ExploredCounter";
import { FilterChips } from "./FilterChips";
import { ScreenshotFrame } from "./ScreenshotFrame";
import { WorkItem } from "./WorkItem";

/**
 * "The Glasshouse" (SPEC §6) — the interactive part of the work section.
 *
 * One <ol> of projects is always the real content (index in 3D mode, swipe cards on narrow / touch
 * screens, a grid in list mode); the 3D stage is an enhancement layered next to it and loaded only
 * in 3D mode, when the section comes near. Scroll is the single source of truth in 3D mode: the
 * pinned block maps scroll progress to the walk position, and every control (←/→, Home/End, the
 * buttons, the index, drag, snap) just scrolls the page.
 */

const GlasshouseStage = dynamic(() => import("./GlasshouseStage"), { ssr: false });

type Flags = { hasDesktop: boolean; hasMobile: boolean; hasOg: boolean };
type Props = { projects: Project[]; shots: Record<string, Flags> };

const PENDING_MS = 900;

export function Glasshouse({ projects, shots }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const mode = useGalleryMode();
  const quality = useGalleryQuality();
  const can3d = useGallery3dCapable();
  const filter = useGallery((s) => s.filter);
  const activeRaw = useGallery((s) => s.active);

  const filtered = useMemo(() => (filter === "all" ? projects : projects.filter((p) => p.sector === filter)), [projects, filter]);
  const n = filtered.length;
  const active = clamp(activeRaw, 0, Math.max(n - 1, 0));
  const current = filtered[active] ?? projects[0];
  const presentSlug = pathname && pathname.startsWith("/work/") ? decodeURIComponent(pathname.slice(6)) : null;
  const flagsList = useMemo(() => projects.map((p) => ({ hasDesktop: shots[p.slug]?.hasDesktop ?? false, hasMobile: shots[p.slug]?.hasMobile ?? false })), [projects, shots]);

  // elements needed during render are kept in state through callback refs
  const [blockEl, setBlockEl] = useState<HTMLDivElement | null>(null);
  const [stickyEl, setStickyEl] = useState<HTMLDivElement | null>(null);
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const [indexEl, setIndexEl] = useState<HTMLDivElement | null>(null);
  const [cellEl, setCellEl] = useState<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const olRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  const [near, setNear] = useState(false);
  const [live, setLive] = useState(false);
  const [lost, setLost] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const pending = useRef<{ i: number; t: number } | null>(null);
  const pointerDown = useRef(false);

  // ───────────────────────── helpers (read live values, never stale) ─────────────────────────

  const currentList = useCallback(() => {
    const f = getGallery().filter;
    return f === "all" ? projects : projects.filter((p) => p.sector === f);
  }, [projects]);

  const pendingIndex = useCallback((): number | null => {
    const p = pending.current;
    return p && performance.now() - p.t < PENDING_MS ? p.i : null;
  }, []);

  /** Pinned-block geometry: document top, scroll range, current rect top. */
  const geometry = useCallback(() => {
    if (!blockEl || !stickyEl) return null;
    const r = blockEl.getBoundingClientRect();
    return { top: window.scrollY + r.top, range: r.height - stickyEl.offsetHeight, rTop: r.top };
  }, [blockEl, stickyEl]);

  const scrollToSlot = useCallback(
    (i: number, behavior?: ScrollBehavior) => {
      const g = geometry();
      if (!g) return;
      const nn = currentList().length;
      const p = nn > 1 ? i / (nn - 1) : 0;
      const b: ScrollBehavior = behavior ?? (getMotion() === "full" ? "smooth" : "instant");
      window.scrollTo({ top: Math.round(g.top + p * Math.max(g.range, 0)), behavior: b });
    },
    [geometry, currentList],
  );

  const cardItems = useCallback((): HTMLElement[] => {
    const ol = olRef.current;
    if (!ol) return [];
    return Array.from(ol.children).filter((li): li is HTMLElement => li instanceof HTMLElement && !li.hidden);
  }, []);

  const scrollToCard = useCallback(
    (i: number) => {
      const ol = olRef.current;
      const li = cardItems()[i];
      if (!ol || !li) return;
      const behavior: ScrollBehavior = getMotion() === "full" ? "smooth" : "instant";
      ol.scrollTo({ left: li.offsetLeft - (ol.clientWidth - li.offsetWidth) / 2, behavior });
    },
    [cardItems],
  );

  /** Go to project i of the filtered list (keyboard / buttons announce through the live region). */
  const go = useCallback(
    (target: number, say: boolean) => {
      const list = currentList();
      if (!list.length) return;
      const i = clamp(target, 0, list.length - 1);
      const m = getGalleryMode();
      pending.current = { i, t: performance.now() };
      if (m === "3d") scrollToSlot(i);
      else if (m === "cards") scrollToCard(i);
      setGalleryActive(i);
      if (say) announce(work.liveRegion(i + 1, list.length, list[i].name, list[i].sectorLabel));
    },
    [currentList, scrollToSlot, scrollToCard],
  );

  const step = useCallback(
    (delta: number) => {
      const base = pendingIndex() ?? getGallery().active;
      go(base + delta, true);
    },
    [go, pendingIndex],
  );

  /** Snap on idle: settle on the nearest pane when the walk stops between two. */
  const snap = useCallback(() => {
    if (getGalleryMode() !== "3d" || pointerDown.current) return;
    if (document.documentElement.classList.contains("is-locked")) return;
    const g = geometry();
    if (!g || g.range <= 1) return;
    const p = -g.rTop / g.range;
    if (p <= 0.0005 || p >= 0.9995) return; // not pinned: the visitor is passing by
    const nn = currentList().length;
    if (nn < 2) return;
    const s = p * (nn - 1);
    const nearest = Math.round(s);
    if (Math.abs(s - nearest) > 0.02) scrollToSlot(nearest);
  }, [geometry, currentList, scrollToSlot]);

  // ───────────────────────── 3D mode: scroll → active, snap, drag tracking ─────────────────────────

  useEffect(() => {
    if (mode !== "3d") return;
    const onFrame = () => {
      const g = geometry();
      if (!g) return;
      if (pendingIndex() !== null) return;
      pending.current = null;
      const nn = currentList().length;
      const p = g.range > 1 ? clamp(-g.rTop / g.range, 0, 1) : 0;
      setGalleryActive(Math.round(p * Math.max(nn - 1, 0)));
    };
    onFrame();
    return subscribeScrollFrame(onFrame);
  }, [mode, geometry, currentList, pendingIndex]);

  useEffect(() => {
    if (mode !== "3d") return;
    const hasScrollEnd = "onscrollend" in window;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(snap, 140);
    };
    if (hasScrollEnd) window.addEventListener("scrollend", snap);
    else window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scrollend", snap);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode, snap]);

  useEffect(() => {
    if (mode !== "3d" || !stageEl) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const down = (e: PointerEvent) => {
      if (e.button === 0) pointerDown.current = true;
    };
    const up = () => {
      if (!pointerDown.current) return;
      pointerDown.current = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(snap, 160);
    };
    stageEl.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      stageEl.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [mode, stageEl, snap]);

  // keep the active index entry visible inside the index column (never scrolls the page)
  useEffect(() => {
    if (mode !== "3d" || !indexEl) return;
    const link = indexEl.querySelector<HTMLElement>('[aria-current="true"]');
    if (!link) return;
    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;
    if (top < indexEl.scrollTop + 8) indexEl.scrollTo({ top: Math.max(0, top - 8), behavior: "instant" });
    else if (bottom > indexEl.scrollTop + indexEl.clientHeight - 8) {
      indexEl.scrollTo({ top: bottom - indexEl.clientHeight + 8, behavior: "instant" });
    }
  }, [mode, indexEl, active, filter]);

  // load the 3D stage when the section comes near (one viewport ahead)
  useEffect(() => {
    if (mode !== "3d") return;
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // after the 3D cross-fade, drop the poster image
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setPosterGone(true), 900);
    return () => clearTimeout(t);
  }, [live]);

  // the panel hides its own screenshots while the 3D pane shows them
  const showing3d = mode === "3d" && live && !lost;
  useEffect(() => {
    const root = document.documentElement;
    if (showing3d) root.setAttribute("data-gallery-live", "");
    else root.removeAttribute("data-gallery-live");
    return () => root.removeAttribute("data-gallery-live");
  }, [showing3d]);

  // prev / next inside the panel: walk the arc to that project behind the scrim
  useEffect(() => {
    if (!presentSlug || getGalleryMode() !== "3d") return;
    const k = currentList().findIndex((p) => p.slug === presentSlug);
    if (k < 0 || k === getGallery().active) return;
    pending.current = { i: k, t: performance.now() };
    scrollToSlot(k, "instant");
    setGalleryActive(k);
  }, [presentSlug, currentList, scrollToSlot]);

  // ───────────────────────── cards mode: rail scroll → active + progress bar ─────────────────────────

  useEffect(() => {
    if (mode !== "cards") return;
    const ol = olRef.current;
    if (!ol) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = cardItems();
      if (!items.length) return;
      const centre = ol.scrollLeft + ol.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      items.forEach((li, i) => {
        const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - centre);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      const max = ol.scrollWidth - ol.clientWidth;
      const f = max > 0 ? clamp(ol.scrollLeft / max, 0, 1) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${(1 + f * (items.length - 1)) / items.length})`;
      if (pendingIndex() !== null) return;
      pending.current = null;
      setGalleryActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    ol.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      ol.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, filter, cardItems, pendingIndex]);

  // ───────────────────────── events ─────────────────────────

  const onFilter = useCallback(
    (f: Sector | "all") => {
      if (f === getGallery().filter) return;
      setGalleryFilter(f);
      // the chip only says "pressed": tell screen readers what the list now holds
      const list = f === "all" ? projects : projects.filter((p) => p.sector === f);
      announce(work.filterAnnounce(list.length, f === "all" ? null : (SECTORS.find((s) => s.id === f)?.label ?? null)));
      try {
        const url = new URL(window.location.href);
        if (f === "all") url.searchParams.delete("for");
        else url.searchParams.set("for", f);
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        /* the filter still works without the URL */
      }
      pending.current = null;
      const m = getGalleryMode();
      // after React has applied the new pinned height
      requestAnimationFrame(() => {
        if (m === "3d") {
          const g = geometry();
          if (g && g.rTop < 0) {
            const far = -g.rTop > window.innerHeight * 1.5;
            window.scrollTo({ top: Math.round(g.top), behavior: far || getMotion() !== "full" ? "instant" : "smooth" });
          }
        } else if (m === "cards") {
          olRef.current?.scrollTo({ left: 0, behavior: "instant" });
        }
      });
    },
    [geometry, projects],
  );

  const onView = useCallback(() => {
    setGalleryView(getGalleryMode() === "3d" ? "list" : "auto");
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }, []);

  const onIndexFocus = useCallback(
    (slot: number, e: FocusEvent<HTMLAnchorElement>) => {
      if (slot < 0 || getGalleryMode() !== "3d") return;
      if (!e.currentTarget.matches(":focus-visible")) return; // keyboard focus walks the stage; clicks just open
      if (slot === getGallery().active && pendingIndex() === null) return;
      pending.current = { i: slot, t: performance.now() };
      scrollToSlot(slot);
      setGalleryActive(slot);
    },
    [scrollToSlot, pendingIndex],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const m = getGalleryMode();
      if (m !== "3d" && m !== "cards") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable='true']")) return;
      const nn = currentList().length;
      const base = pendingIndex() ?? getGallery().active;
      let target: number;
      switch (e.key) {
        case "ArrowRight":
          target = base + 1;
          break;
        case "ArrowLeft":
          target = base - 1;
          break;
        case "Home":
          target = 0;
          break;
        case "End":
          target = nn - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const fromItem = t.closest(".gh-ol > li");
      // the live region speaks only when focus stays put (a moved focus already announces the item)
      go(target, !fromItem);
      if (fromItem) {
        // keep focus on the item that is now active (the old one may be clipped out of the rail);
        // in cards, the Details link, so Enter opens the panel rather than leaving for the live site
        const li = cardItems()[clamp(target, 0, nn - 1)];
        li?.querySelector<HTMLElement>(m === "3d" ? "a.gh-idx" : '.gh-card a[href^="/work/"]')?.focus({ preventScroll: true });
      }
    },
    [currentList, go, pendingIndex, cardItems],
  );

  /** A click on the active pane (3D) opens it; focus moves to its index entry first, so closing the panel returns there. */
  const onOpen = useCallback(
    (slug: string) => {
      const link = indexEl?.querySelector<HTMLAnchorElement>(`a[data-slug="${slug}"]`);
      link?.focus({ preventScroll: true });
      router.push(`/work/${slug}`, { scroll: false });
    },
    [indexEl, router],
  );

  const onTravel = useCallback(
    (slot: number) => {
      pending.current = { i: slot, t: performance.now() };
      scrollToSlot(slot);
      setGalleryActive(slot);
    },
    [scrollToSlot],
  );

  const onReady = useCallback(() => setLive(true), []);
  const onLost = useCallback(() => {
    setLive(false);
    setLost(true);
    setPosterGone(false);
  }, []);

  const openFromPoster = useCallback(() => {
    if (getGalleryMode() !== "3d" || stageEl?.dataset.live === "true") return; // the live 3D handles its own clicks
    const list = currentList();
    const p = list[clamp(getGallery().active, 0, list.length - 1)];
    if (p) onOpen(p.slug);
  }, [currentList, onOpen, stageEl]);

  // ───────────────────────── render ─────────────────────────

  const wantStage =
    mode === "3d" && near && !lost && quality !== null && quality.tier !== "low" && quality.webgl2 && blockEl && stickyEl && stageEl && cellEl;
  const showSwitch = mode === "3d" || (mode === "list" && can3d);
  const presenting = showing3d && presentSlug !== null;
  const slotOf = new Map(filtered.map((p, i) => [p.slug, i]));
  const accent = { "--accent-l": current.accent.textLight, "--accent-d": current.accent.textDark } as CSSProperties;

  return (
    <div ref={rootRef} className="gh" data-presenting={presenting ? "true" : undefined} onKeyDown={onKeyDown}>
      <div ref={setBlockEl} className="gh-block" style={{ "--n": n } as CSSProperties}>
        <div ref={setStickyEl} className="gh-sticky">
          <div className="gh-wide">
            <div className="gh-bar">
              <FilterChips projects={projects} value={filter} onChange={onFilter} />
              <div className="gh-nav" role="group" aria-label={work.galleryControls}>
                <p className="gh-count text-label">
                  <span aria-hidden="true">
                    {pad2(active + 1)} / {pad2(n)}
                  </span>
                  <span className="sr-only">{work.counterLabel(active + 1, n)}</span>
                </p>
                <button type="button" className="icon-btn icon-btn-outline bg-surface" aria-label={work.prev} onClick={() => step(-1)}>
                  <IconArrowLeft size={20} />
                </button>
                <button type="button" className="icon-btn icon-btn-outline bg-surface" aria-label={work.next} onClick={() => step(1)}>
                  <IconArrowRight size={20} />
                </button>
              </div>
              {showSwitch ? (
                <button type="button" className={btnClass("ghost", "sm", "gh-switch bg-surface")} onClick={onView}>
                  {mode === "list" ? work.view3d : work.viewList}
                </button>
              ) : null}
            </div>
          </div>

          <div className="gh-wide gh-body-wrap">
            <div className="gh-body">
              <div ref={setIndexEl} className="gh-index">
                <ol ref={olRef} className="gh-ol" aria-label={work.indexLabel}>
                  {projects.map((p, i) => {
                    const slot = slotOf.get(p.slug) ?? -1;
                    return (
                      <WorkItem
                        key={p.slug}
                        project={p}
                        hasDesktop={flagsList[i].hasDesktop}
                        hasMobile={flagsList[i].hasMobile}
                        slot={slot}
                        active={slot === active}
                        onIndexFocus={onIndexFocus}
                      />
                    );
                  })}
                </ol>
              </div>

              <div ref={setStageEl} className="gh-stage" aria-hidden="true" data-live={showing3d ? "true" : "false"}>
                <div ref={setCellEl} className="gh-cell">
                  {!posterGone || !showing3d ? (
                    <div className="gh-poster" onClick={openFromPoster}>
                      <div className="gh-poster-frame">
                        <ScreenshotFrame
                          project={current}
                          kind="desktop"
                          available={shots[current.slug]?.hasDesktop ?? false}
                          sizes="(min-width: 1024px) 52vw, 1px"
                        />
                        <div className="gh-poster-phone">
                          <ScreenshotFrame project={current} kind="mobile" available={shots[current.slug]?.hasMobile ?? false} sizes="(min-width: 1024px) 12vw, 1px" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="gh-canvas">
                  {wantStage && quality && blockEl && stickyEl && stageEl ? (
                    <GlasshouseStage
                      quality={quality}
                      projects={projects}
                      flags={flagsList}
                      block={blockEl}
                      sticky={stickyEl}
                      stage={stageEl}
                      cell={cellEl}
                      presentSlug={presentSlug}
                      onReady={onReady}
                      onLost={onLost}
                      onOpen={onOpen}
                      onTravel={onTravel}
                    />
                  ) : null}
                </div>
              </div>

              <p className="gh-hint3d" aria-hidden="true">
                <span className="when-full">{work.hint3d}</span>
                <span className="when-reduced">{work.hint3dReduced}</span>
              </p>
            </div>

            <div className="gh-cardsbar">
              <p className="gh-count text-label">
                <span aria-hidden="true">
                  {active + 1} / {n}
                </span>
                <span className="sr-only">{work.counterLabel(active + 1, n)}</span>
              </p>
              <span className="gh-progress" aria-hidden="true">
                <span ref={fillRef} className="gh-progress-fill" style={{ transform: `scaleX(${1 / Math.max(n, 1)})` }} />
              </span>
              <button type="button" className="icon-btn icon-btn-outline bg-surface" aria-label={work.prev} onClick={() => step(-1)}>
                <IconArrowLeft size={20} />
              </button>
              <button type="button" className="icon-btn icon-btn-outline bg-surface" aria-label={work.next} onClick={() => step(1)}>
                <IconArrowRight size={20} />
              </button>
              <p className="gh-hint-cards text-small text-ink-soft" aria-hidden="true">
                {work.hintCards}
              </p>
            </div>
          </div>

          <div className="gh-caption">
            <div className="gh-wide gh-caption-inner">
              <p className="gh-cap-main" style={accent}>
                <span className="text-label accent-text">{pad2(current.order)}</span>
                <span className="gh-cap-name">{current.name}</span>
                <span className="text-small text-ink-soft">{current.sectorLabel}</span>
                <span className="gh-cap-try text-small text-ink-soft">
                  <span className="font-semibold text-ink">{work.tryThis}</span> {current.tryThis}
                </span>
              </p>
              <Link
                href={`/work/${current.slug}`}
                scroll={false}
                className={btnClass("primary", "sm")}
                aria-label={work.openProjectLabel(current.name)}
              >
                {work.openProject}
              </Link>
              <ExploredCounter className="gh-cap-explored" />
            </div>
          </div>
        </div>
      </div>

      <div className="container-site gh-explored-out">
        <ExploredCounter className="mt-10" />
      </div>
    </div>
  );
}
