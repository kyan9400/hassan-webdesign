import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "./projects";

/**
 * Build-time screenshot detection. Server-only (uses the file system).
 * Missing files fall back to designed placeholders, so they never break the build.
 */

export type ShotFlags = { hasDesktop: boolean; hasMobile: boolean; hasOg: boolean };

function inPublic(src: string): boolean {
  try {
    return existsSync(join(process.cwd(), "public", src.replace(/^\//, "")));
  } catch {
    return false;
  }
}

export function shotFlags(project: Project): ShotFlags {
  return {
    hasDesktop: inPublic(project.screenshots.desktop),
    hasMobile: inPublic(project.screenshots.mobile),
    hasOg: inPublic(project.screenshots.og),
  };
}

export function allShotFlags(projects: Project[]): Record<string, ShotFlags> {
  const out: Record<string, ShotFlags> = {};
  for (const p of projects) out[p.slug] = shotFlags(p);
  return out;
}

/** Absolute path of a file in `public/` (for OG image composition). */
export function publicPath(src: string): string {
  return join(process.cwd(), "public", src.replace(/^\//, ""));
}
