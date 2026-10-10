"use client";

import Link from "next/link";
import type { CSSProperties, FocusEvent } from "react";
import type { Project } from "@/data/projects";
import { pad2, PROJECT_COUNT } from "@/data/projects";
import { projectCase, work } from "@/data/site";
import { btnClass } from "@/components/ui/Button";
import { Sprout } from "@/components/ui/icons";
import { ScreenshotFrame } from "./ScreenshotFrame";

type Props = {
  project: Project;
  hasDesktop: boolean;
  hasMobile: boolean;
  /** position in the filtered list, or −1 when filtered out */
  slot: number;
  active: boolean;
  eager?: boolean;
  onIndexFocus: (slot: number, e: FocusEvent<HTMLAnchorElement>) => void;
};

/**
 * One project in the gallery's single <ol> — the real content in every mode. It carries both
 * presentations and CSS shows the one for the current mode (`html[data-gallery]`):
 *  - 3D mode: the index entry (`{order}` + name + sector), aria-current on the active one;
 *  - cards / list: the card (screenshots, name, one-liner, Try this, Live site ↗ and Details).
 * Both open the project panel through `<Link href="/work/{slug}" scroll={false}>`.
 */
export function WorkItem({ project: p, hasDesktop, hasMobile, slot, active, eager = false, onIndexFocus }: Props) {
  const style = { "--accent-l": p.accent.textLight, "--accent-d": p.accent.textDark } as CSSProperties;
  return (
    <li hidden={slot < 0} data-slug={p.slug} data-slot={slot} style={style}>
      <Link
        href={`/work/${p.slug}`}
        scroll={false}
        className="gh-idx"
        data-slug={p.slug}
        aria-current={active ? "true" : undefined}
        onFocus={(e) => onIndexFocus(slot, e)}
      >
        <Sprout size={12} className="gh-idx-mark" />
        <span className="gh-idx-n text-label">{pad2(p.order)}</span>
        <span className="min-w-0">
          <span className="gh-idx-name">{p.name}</span>
          <span className="gh-idx-sector">{p.sectorLabel}</span>
        </span>
      </Link>

      <article className="gh-card" data-reveal>
        <div className="gh-card-media">
          <ScreenshotFrame
            project={p}
            kind="desktop"
            available={hasDesktop}
            sizes="(min-width: 1024px) 380px, (min-width: 500px) 360px, 72vw"
            eager={eager}
          />
          <div className="gh-card-phone">
            <ScreenshotFrame project={p} kind="mobile" available={hasMobile} sizes="(min-width: 1024px) 96px, 22vw" eager={eager} />
          </div>
        </div>
        <p className="text-label accent-text mt-5">
          {pad2(p.order)} / {pad2(PROJECT_COUNT)}
        </p>
        <h3 className="text-display-m mt-2">{p.name}</h3>
        <p className="text-small text-ink-soft">{p.sectorLabel}</p>
        <p className="mt-3">{p.oneLiner}</p>
        <p className="mt-3 text-small text-ink-soft">
          <span className="font-semibold text-ink">{work.tryThis}</span> {p.tryThis}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {p.liveUrl ? (
            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={work.liveSiteLabel(p.name)} className={btnClass("primary", "sm")}>
              {work.liveSite} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span aria-disabled="true" className={btnClass("primary", "sm")}>
              {projectCase.liveSoon}
            </span>
          )}
          <Link href={`/work/${p.slug}`} scroll={false} className={btnClass("ghost", "sm")} aria-label={work.detailsLabel(p.name)}>
            {work.details}
          </Link>
        </div>
      </article>
    </li>
  );
}
