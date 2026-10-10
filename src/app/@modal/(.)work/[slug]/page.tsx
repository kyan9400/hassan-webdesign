import { notFound } from "next/navigation";
import { getProject, neighbours, projects } from "@/data/projects";
import { shotFlags } from "@/data/screenshots.server";
import { ProjectCase } from "@/components/work/ProjectCase";
import { PANEL_TITLE_ID, PanelClose, PanelNav } from "@/components/work/ProjectDialog";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/** Intercepted /work/[slug]: the same case content as a side panel over the home page. */
export default async function ProjectPanel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { prev, next } = neighbours(slug);
  return (
    <>
      <div key={slug} className="relative flex-1 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 flex justify-end p-3 max-md:hidden">
          <PanelClose />
        </div>
        <div className="px-5 pb-10 pt-6 md:px-8 md:pt-0">
          <ProjectCase project={project} flags={shotFlags(project)} variant="panel" titleId={PANEL_TITLE_ID} showShots />
        </div>
      </div>
      <PanelNav slug={slug} prev={{ slug: prev.slug, name: prev.name }} next={{ slug: next.slug, name: next.name }} />
    </>
  );
}
