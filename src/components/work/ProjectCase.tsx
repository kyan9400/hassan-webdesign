import type { CSSProperties } from "react";
import type { Project } from "@/data/projects";
import { pad2 } from "@/data/projects";
import type { ShotFlags } from "@/data/screenshots.server";
import { projectCase, waLink } from "@/data/site";
import { btnClass } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ScreenshotFrame } from "./ScreenshotFrame";
import { MarkVisited } from "./MarkVisited";

type Props = {
  project: Project;
  flags: ShotFlags;
  /** "page" = full case page (title is the H1); "panel" = the side panel over the home page */
  variant: "page" | "panel";
  /** id of the title element (the dialog is labelled by it) */
  titleId?: string;
  /** show the desktop + phone screenshots at the top (hidden in 3D mode, where the pane shows them) */
  showShots?: boolean;
};

/** Shared case content for the project panel and the /work/[slug] page. */
export function ProjectCase({ project: p, flags, variant, titleId, showShots = true }: Props) {
  const Title = variant === "page" ? "h1" : "h2";
  const Sub = variant === "page" ? "h2" : "h3";
  return (
    <article
      className="flex flex-col"
      style={{ "--accent-l": p.accent.textLight, "--accent-d": p.accent.textDark } as CSSProperties}
    >
      <MarkVisited slug={p.slug} />

      {showShots ? (
        <div className="case-shots relative mb-8 pr-[18%]" data-case-shots>
          <ScreenshotFrame
            project={p}
            kind="desktop"
            available={flags.hasDesktop}
            sizes={variant === "page" ? "(min-width: 1024px) 760px, 92vw" : "(min-width: 768px) 560px, 92vw"}
            eager={variant === "page"}
          />
          <div className="absolute bottom-[-8%] right-0 w-[26%] min-w-[84px] drop-shadow-xl">
            <ScreenshotFrame project={p} kind="mobile" available={flags.hasMobile} sizes="(min-width: 768px) 160px, 26vw" />
          </div>
        </div>
      ) : null}

      <p className="text-label accent-text">
        {projectCase.kicker(pad2(p.order), p.sectorLabel)}
      </p>
      <Title
        id={titleId}
        tabIndex={variant === "panel" ? -1 : undefined}
        className={`${variant === "page" ? "text-display-l" : "text-display-m outline-none"} mt-3`}
      >
        {p.name}
      </Title>
      <p className="text-lead mt-4 text-ink-soft">{p.oneLiner}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {p.liveUrl ? (
          <a
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={projectCase.liveLabel(p.name)}
            className={btnClass("primary")}
          >
            {projectCase.live} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <button type="button" aria-disabled="true" className={btnClass("primary")}>
            {projectCase.liveSoon}
          </button>
        )}
        <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" aria-label={projectCase.codeLabel(p.name)} className={btnClass("ghost")}>
          {projectCase.code} <span aria-hidden="true">↗</span>
        </a>
      </div>

      <section className="mt-10 border-t border-line pt-6" aria-labelledby={`${p.slug}-sig`}>
        <Sub id={`${p.slug}-sig`} className="text-label text-ink-soft">
          {projectCase.signature}
        </Sub>
        <p className="text-title mt-3">{p.signature.title}</p>
        <p className="mt-2 text-ink-soft">{p.signature.body}</p>
      </section>

      <section className="mt-8" aria-labelledby={`${p.slug}-try`}>
        <Sub id={`${p.slug}-try`} className="text-label text-ink-soft">
          {projectCase.tryThis}
        </Sub>
        <p className="mt-3 font-medium">{p.tryThis}</p>
      </section>

      <section className="mt-8" aria-labelledby={`${p.slug}-how`}>
        <Sub id={`${p.slug}-how`} className="text-label text-ink-soft">
          {projectCase.howBuilt}
        </Sub>
        <ul className="mt-3 flex flex-col gap-2">
          {p.techniques.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.6em] h-[6px] w-[6px] flex-none rounded-full bg-leaf" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby={`${p.slug}-with`}>
        <Sub id={`${p.slug}-with`} className="text-label text-ink-soft">
          {projectCase.builtWith}
        </Sub>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.tech.map((t) => (
            <li key={t} className="chip font-mono !text-[0.8125rem]">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby={`${p.slug}-fit`}>
        <Sub id={`${p.slug}-fit`} className="text-label text-ink-soft">
          {projectCase.goodFor}
        </Sub>
        <p className="mt-3">{p.goodFor}</p>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <CopyButton
          label={projectCase.copyLink}
          copiedLabel={projectCase.linkCopied}
          toastMessage={projectCase.linkCopied}
          className={btnClass("text", "sm")}
        />
        <a
          href={waLink(projectCase.wantOneMessage(p.name))}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={projectCase.wantOneLabel(p.name)}
          className={btnClass("accent", "sm")}
        >
          {projectCase.wantOne}
        </a>
      </div>

      <p className="mt-8 text-small text-ink-soft">
        {projectCase.footnote}
        {p.credits ? ` ${p.credits}` : ""}
      </p>
    </article>
  );
}
