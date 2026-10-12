"use client";

import { RouteLink as Link } from "@/components/ui/RouteLink";
import type { CSSProperties, FocusEvent } from "react";
import type { ProjectCard as Project } from "@/data/sectors";
import { pad2 } from "@/data/sectors";
import { Sprout } from "@/components/ui/icons";
import { WorkCard } from "./WorkCard";

type Props = {
  project: Project;
  hasDesktop: boolean;
  hasMobile: boolean;
  /** position in the filtered list, or −1 when filtered out */
  slot: number;
  active: boolean;
  onIndexFocus: (slot: number, e: FocusEvent<HTMLAnchorElement>) => void;
};

/**
 * One project in the gallery's single <ol> — the real content in every mode. It carries both
 * presentations and CSS shows the one for the current mode (`html[data-gallery]`):
 *  - 3D mode: the index entry (`{order}` + name + sector), aria-current on the active one;
 *  - cards / list: the card (WorkCard).
 * Both open the project panel at /work/{slug}.
 */
export function WorkItem({ project: p, hasDesktop, hasMobile, slot, active, onIndexFocus }: Props) {
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
      <WorkCard project={p} hasDesktop={hasDesktop} hasMobile={hasMobile} />
    </li>
  );
}
