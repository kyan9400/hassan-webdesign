import { projects } from "@/data/projects";
import { allShotFlags } from "@/data/screenshots.server";
import { work } from "@/data/site";
import { SpecimenLabel } from "@/components/ui/SpecimenLabel";
import { Glasshouse } from "./Glasshouse";

/**
 * 01 — Selected work: "The Glasshouse". The intro is server-rendered; the gallery below is one
 * accessible <ol> of the projects (index / cards / list) with the 3D conservatory layered next to it
 * on capable desktops. Screenshot presence is detected at build time, so missing files show
 * designed placeholders and never break the build.
 */
export function WorkSection() {
  const shots = allShotFlags(projects);
  return (
    <section
      id="work"
      tabIndex={-1}
      role="region"
      aria-roledescription="gallery"
      aria-labelledby="work-title"
      className="section-pad relative"
    >
      <a href="#services" className="skip-gallery btn btn-primary btn-sm">
        {work.skip}
      </a>
      <div className="container-site">
        <div className="max-w-[760px]">
          <SpecimenLabel>{work.eyebrow}</SpecimenLabel>
          <h2 id="work-title" className="text-display-l mt-4">
            {work.title}
          </h2>
          <p className="text-lead mt-5 text-ink-soft">{work.lead}</p>
          <p className="mt-3 text-small text-ink-soft">{work.note}</p>
        </div>
      </div>

      <Glasshouse projects={projects} shots={shots} />
    </section>
  );
}
