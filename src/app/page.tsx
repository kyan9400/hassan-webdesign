import { projects } from "@/data/projects";
import { allShotFlags } from "@/data/screenshots.server";
import { contact, owner, seo, siteUrl } from "@/data/site";
import { Hero } from "@/components/hero/Hero";
import { ProofStrip } from "@/components/sections/ProofStrip";
import { WorkSection } from "@/components/work/WorkSection";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Divider } from "@/components/ui/Divider";

function jsonLd() {
  const shots = allShotFlags(projects);
  const person = {
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: owner.name,
    url: siteUrl,
    jobTitle: seo.jobTitle,
    image: `${siteUrl}/opengraph-image`,
    sameAs: [contact.github, contact.mainPortfolio, contact.telegram.url],
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "ProfessionalService",
        "@id": `${siteUrl}/#service`,
        name: seo.siteName,
        url: siteUrl,
        founder: { "@id": `${siteUrl}/#person` },
        makesOffer: [
          {
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: "Landing page" },
            priceSpecification: { "@type": "PriceSpecification", minPrice: 150, priceCurrency: "USD" },
          },
          {
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: "Business website" },
            priceSpecification: { "@type": "PriceSpecification", minPrice: 400, priceCurrency: "USD" },
          },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "3D website" } },
        ],
      },
      {
        "@type": "ItemList",
        name: "Live 3D websites",
        itemListElement: projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            name: p.name,
            url: `${siteUrl}/work/${p.slug}`,
            image: shots[p.slug].hasDesktop ? `${siteUrl}${p.screenshots.desktop}` : `${siteUrl}/work/${p.slug}/opengraph-image`,
            creator: { "@id": `${siteUrl}/#person` },
          },
        })),
      },
    ],
  };
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <ProofStrip />
      <WorkSection />
      <div className="container-site">
        <Divider />
      </div>
      <Services />
      <Process />
      <About />
      <Contact />
    </>
  );
}
