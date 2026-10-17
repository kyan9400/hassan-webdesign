import type { CSSProperties } from "react";
import type { ProjectCard as Project } from "@/data/sectors";
import { pad2 } from "@/data/sectors";
import { work } from "@/data/site";
import { ghPages, withBase } from "@/lib/pages";

type Props = {
  project: Project;
  kind: "desktop" | "mobile";
  available: boolean;
  sizes: string;
  eager?: boolean;
  className?: string;
};

// widths from Next's default deviceSizes / imageSizes, so the optimizer accepts every one
const DESKTOP_W = [384, 640, 828, 1080, 1200, 1920];
const MOBILE_W = [96, 128, 256, 384, 640, 828];

/** Optimizer URL (same as next/image produces): AVIF / WebP by the Accept header, q 75. */
const optimized = (src: string, w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;

/**
 * A screenshot in a leaf-radius frame, or — when the file is not in public/work yet — a designed
 * placeholder in the project's accent colour. Missing screenshots never break the build.
 * A plain responsive <img> through the Next image optimizer: the same files next/image would
 * serve, without shipping its client component in the first-load bundle.
 * The GitHub Pages mirror has no optimizer: it serves the file itself (they are small WebPs).
 */
export function ScreenshotFrame({ project, kind, available, sizes, eager = false, className = "" }: Props) {
  const desktop = kind === "desktop";
  const style = { "--accent": project.accent.swatch } as CSSProperties;
  const src = desktop ? project.screenshots.desktop : project.screenshots.mobile;
  const widths = desktop ? DESKTOP_W : MOBILE_W;
  return (
    <div
      className={`shot-frame ${desktop ? "aspect-[16/10]" : "aspect-[390/844] !rounded-[18px]"} ${className}`}
      style={style}
    >
      {available ? (
        // eslint-disable-next-line @next/next/no-img-element -- optimizer URLs written by hand (see above)
        <img
          src={ghPages ? withBase(src) : optimized(src, desktop ? 1080 : 384)}
          srcSet={ghPages ? undefined : widths.map((w) => `${optimized(src, w)} ${w}w`).join(", ")}
          sizes={sizes}
          alt={desktop ? project.screenshots.alt : project.screenshots.altMobile}
          width={desktop ? 1600 : 780}
          height={desktop ? 1000 : 1688}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
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
