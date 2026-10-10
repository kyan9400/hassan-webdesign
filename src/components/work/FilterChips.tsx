"use client";

import { useId } from "react";
import type { Project, Sector } from "@/data/projects";
import { SECTORS } from "@/data/projects";
import { work } from "@/data/site";

type Props = {
  projects: Project[];
  value: Sector | "all";
  onChange: (value: Sector | "all") => void;
};

/**
 * "Show work for" — toggle chips (`<button aria-pressed>`) in a labelled group, with counts in Plex
 * Mono. They filter the <ol>, the 3D arc and the cards; the choice is mirrored in the URL (?for=).
 */
export function FilterChips({ projects, value, onChange }: Props) {
  const labelId = useId();
  const chips: { id: Sector | "all"; label: string; count: number }[] = [
    { id: "all", label: work.filterAll, count: projects.length },
    ...SECTORS.map((s) => ({ id: s.id, label: s.label, count: projects.filter((p) => p.sector === s.id).length })).filter((c) => c.count > 0),
  ];
  return (
    <div className="gh-chips" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="gh-chips-label text-small">
        {work.filterLabel}
      </span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="gh-chip"
          aria-pressed={value === c.id}
          aria-label={work.chipLabel(c.label, c.count)}
          onClick={() => onChange(c.id)}
        >
          {c.label}
          <span className="gh-chip-n" aria-hidden="true">
            {c.count}
          </span>
        </button>
      ))}
    </div>
  );
}
