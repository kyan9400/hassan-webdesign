import { RouteLink as Link } from "@/components/ui/RouteLink";
import type { ProjectCard as Project } from "@/data/sectors";
import { pad2, PROJECT_COUNT } from "@/data/sectors";
import { work } from "@/data/site";
import { btnClass } from "@/components/ui/Button";
import { ScreenshotFrame } from "./ScreenshotFrame";

/**
 * The card presentation of a project (cards / list modes): screenshots, name, one-liner,
 * Try this, Live site ↗ and Details. No state of its own; rendered inside WorkItem.
 */
export function WorkCard({ project: p, hasDesktop, hasMobile }: { project: Project; hasDesktop: boolean; hasMobile: boolean }) {
  // the accent variables come from the <li> around it (WorkItem)
  return (
    <article className="gh-card" data-reveal>
      <div className="gh-card-media">
        <ScreenshotFrame project={p} kind="desktop" available={hasDesktop} sizes="(min-width: 1024px) 380px, (min-width: 500px) 360px, 72vw" />
        <div className="gh-card-phone">
          <ScreenshotFrame project={p} kind="mobile" available={hasMobile} sizes="(min-width: 1024px) 96px, 22vw" />
        </div>
      </div>
      <p className="text-label accent-text mt-6 tabular-nums">
        {pad2(p.order)} / {pad2(PROJECT_COUNT)}
      </p>
      <h3 className="text-display-m mt-2">{p.name}</h3>
      <p className="text-small text-ink-soft">{p.sectorLabel}</p>
      <p className="mt-3">{p.oneLiner}</p>
      <p className="mt-3 text-small text-ink-soft">
        <span className="font-semibold text-ink">{work.tryThis}</span> {p.tryThis}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {p.liveUrl ? (
          <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={work.liveSiteLabel(p.name)} className={btnClass("primary", "sm")}>
            {work.liveSite} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span aria-disabled="true" className={btnClass("primary", "sm")}>
            {work.liveSoon}
          </span>
        )}
        <Link href={`/work/${p.slug}`} scroll={false} className={btnClass("ghost", "sm")} aria-label={work.detailsLabel(p.name)}>
          {work.details}
        </Link>
      </div>
    </article>
  );
}
