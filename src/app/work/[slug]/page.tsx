import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/projects";
import { shotFlags } from "@/data/screenshots.server";
import { canonical, contact, mailLink, owner, projectCase, seo, siteUrl, waLink } from "@/data/site";
import { ProjectCase } from "@/components/work/ProjectCase";
import { btnClass } from "@/components/ui/Button";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  const title = `${p.name} — ${p.sectorLabel}`;
  const description = seo.caseDescription(p.oneLiner);
  return {
    title,
    description,
    alternates: { canonical: canonical(`/work/${p.slug}`) },
    openGraph: { type: "website", locale: "en_US", siteName: seo.siteName, title, description, url: `/work/${p.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CasePage({ params }: Params) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const flags = shotFlags(p);
  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.name,
    description: p.oneLiner,
    url: `${siteUrl}/work/${p.slug}`,
    mainEntityOfPage: `${siteUrl}/work/${p.slug}`,
    sameAs: p.liveUrl ? [p.liveUrl, p.repoUrl] : [p.repoUrl],
    image: flags.hasDesktop ? `${siteUrl}${p.screenshots.desktop}` : `${siteUrl}/work/${p.slug}/opengraph-image`,
    dateCreated: String(p.year),
    creator: { "@type": "Person", name: owner.name, url: siteUrl, sameAs: [contact.github, contact.mainPortfolio] },
  };
  const message = projectCase.wantOneMessage(p.name);

  return (
    <div id="top" className="container-site pt-28 pb-20 md:pt-36">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Link href="/#work" className="inline-flex min-h-[44px] items-center font-semibold text-leaf-text underline-offset-4 hover:underline">
        {projectCase.back}
      </Link>

      <div className="mt-6 max-w-[780px]">
        <ProjectCase project={p} flags={flags} variant="page" showShots />
      </div>

      <section aria-labelledby="case-cta" className="card leaf-radius mt-16 max-w-[780px] p-6 md:p-10">
        <h2 id="case-cta" className="text-display-m">
          {projectCase.ctaTitle(p.name)}
        </h2>
        <p className="mt-3 text-ink-soft">{projectCase.ctaText}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={waLink(message)} target="_blank" rel="noopener noreferrer" aria-label={`${projectCase.ctaWhatsApp} (opens in a new tab)`} className={btnClass("primary")}>
            {projectCase.ctaWhatsApp}
          </a>
          <a href={contact.telegram.url} target="_blank" rel="noopener noreferrer" aria-label={`${projectCase.ctaTelegram} (opens in a new tab)`} className={btnClass("ghost")}>
            {projectCase.ctaTelegram}
          </a>
          <a href={mailLink(projectCase.emailSubject(p.name))} className={btnClass("ghost")}>
            {projectCase.ctaEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
