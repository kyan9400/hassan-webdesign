import Image from "next/image";
import type { CSSProperties } from "react";
import type { Project } from "@/data/projects";
import { pad2 } from "@/data/projects";
import { work } from "@/data/site";

type Props = {
  project: Project;
  kind: "desktop" | "mobile";
  available: boolean;
  sizes: string;
  eager?: boolean;
  className?: string;
};

/**
 * A screenshot in a leaf-radius frame, or — when the file is not in public/work yet — a designed
 * placeholder in the project's accent colour. Missing screenshots never break the build.
 */
export function ScreenshotFrame({ project, kind, available, sizes, eager = false, className = "" }: Props) {
  const desktop = kind === "desktop";
  const style = { "--accent": project.accent.swatch } as CSSProperties;
  return (
    <div
      className={`shot-frame ${desktop ? "aspect-[16/10]" : "aspect-[390/844] !rounded-[18px]"} ${className}`}
      style={style}
    >
      {available ? (
        <Image
          src={desktop ? project.screenshots.desktop : project.screenshots.mobile}
          alt={desktop ? project.screenshots.alt : project.screenshots.altMobile}
          width={desktop ? 1600 : 780}
          height={desktop ? 1000 : 1688}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="shot-placeholder" role="img" aria-label={desktop ? project.screenshots.alt : project.screenshots.altMobile}>
          {desktop ? (
            <>
              <span className="text-label">
                {pad2(project.order)} / {project.name}
              </span>
              <span className="ph-name">{project.name}</span>
              <span className="text-small">{work.screenshotSoon}</span>
            </>
          ) : (
            <span className="text-label">{pad2(project.order)}</span>
          )}
        </div>
      )}
    </div>
  );
}
