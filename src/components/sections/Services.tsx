import type { CSSProperties } from "react";
import { services, waLink, type ServiceIcon } from "@/data/site";
import { SpecimenLabel } from "@/components/ui/SpecimenLabel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { NurseryTag } from "@/components/ui/NurseryTag";
import { btnClass } from "@/components/ui/Button";
import { IconBranching, IconCloche, IconLeafStem, IconSeedRoots } from "@/components/ui/icons";

const ICONS: Record<ServiceIcon, typeof IconLeafStem> = {
  landing: IconLeafStem,
  business: IconBranching,
  three: IconCloche,
  ai: IconSeedRoots,
};

export function Services() {
  return (
    <section id="services" tabIndex={-1} aria-labelledby="services-title" className="section-pad">
      <div className="container-site">
        <div className="max-w-[720px]">
          <SpecimenLabel>{services.eyebrow}</SpecimenLabel>
          <SectionTitle id="services-title" className="text-display-l mt-4">
            {services.title}
          </SectionTitle>
          <p className="text-lead mt-6 text-ink-soft">{services.lead}</p>
        </div>

        <ul className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 md:gap-6">
          {services.items.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <li
                key={s.title}
                data-reveal
                style={{ "--reveal-i": i } as CSSProperties}
                className="card leaf-radius flex flex-col p-6 md:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-leaf">
                  <Icon size={26} />
                </span>
                <h3 className="text-display-m mt-6">{s.title}</h3>
                <p className="mt-3 text-ink-soft">{s.body}</p>
                <div className="mt-6">
                  <NurseryTag>{s.price}</NurseryTag>
                </div>
                <p className="mt-6 text-small text-ink-soft">
                  {s.goodFor}
                  {s.extra ? (
                    <>
                      {" "}
                      <a href={s.extra.href} className="font-semibold text-leaf-text underline underline-offset-4">
                        {s.extra.label}
                      </a>
                    </>
                  ) : null}
                </p>
                <div className="mt-auto pt-6">
                  <a
                    href={waLink(services.ctaMessage(s.title, s.price))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={services.ctaLabel(s.title)}
                    className={btnClass("ghost", "sm")}
                  >
                    {services.cta}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
