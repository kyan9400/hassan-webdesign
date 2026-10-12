/**
 * Client-safe project helpers and the slim card shape the gallery needs. Importing this never
 * pulls the full project texts (techniques, signature, credits…) into a client bundle.
 */

export type Sector =
  | "food" | "beauty-health" | "real-estate" | "products" | "travel-events" | "tech";

export const SECTORS: { id: Sector; label: string }[] = [
  { id: "food", label: "Cafés & food" },
  { id: "beauty-health", label: "Beauty & health" },
  { id: "real-estate", label: "Real estate" },
  { id: "products", label: "Products & retail" },
  { id: "travel-events", label: "Travel & events" },
  { id: "tech", label: "Tech & SaaS" },
];

/** Number of projects, used in copy such as "04 / 11" (projects.ts checks it at build time). */
export const PROJECT_COUNT = 11;

/** "4" → "04" */
export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** The fields the gallery (client) reads; long texts stay on the server for ProjectCase. */
export type ProjectCard = {
  slug: string;
  order: number;
  name: string;
  sector: Sector;
  sectorLabel: string;
  oneLiner: string;
  tryThis: string;
  accent: { swatch: string; textLight: string; textDark: string };
  liveUrl: string | null;
  screenshots: { desktop: string; mobile: string; alt: string; altMobile: string };
};
