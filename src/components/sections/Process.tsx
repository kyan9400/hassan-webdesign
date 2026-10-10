import type { CSSProperties } from "react";
import { processSection } from "@/data/site";
import { SpecimenLabel } from "@/components/ui/SpecimenLabel";

function Bud({ i }: { i: number }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false" className="relative z-[1]">
      <circle cx="28" cy="28" r="27" className="fill-surface stroke-line" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k} transform={`rotate(${k * 72} 28 28)`}>
          <path
            className="bud-petal fill-bloom"
            style={{ "--i": i, opacity: 0.9 } as CSSProperties}
            d="M28 27C23.5 22 23.5 14 28 10.5 32.5 14 32.5 22 28 27Z"
          />
        </g>
      ))}
      <circle cx="28" cy="28" r="5.5" className="fill-sun" />
    </svg>
  );
}

export function Process() {
  return (
    <section id="process" tabIndex={-1} aria-labelledby="process-title" className="section-pad bg-paper-2">
      <div className="container-site">
        <div className="max-w-[720px]">
          <SpecimenLabel>{processSection.eyebrow}</SpecimenLabel>
          <h2 id="process-title" className="text-display-l mt-4">
            {processSection.title}
          </h2>
          <p className="text-lead mt-5 text-ink-soft">{processSection.lead}</p>
        </div>

        <ol className="process-list relative mt-12 grid gap-10 md:mt-16 md:grid-cols-4 md:gap-6" data-reveal-watch>
          {processSection.steps.map((s, i) => (
            <li key={s.n} className="relative grid grid-cols-[56px_1fr] gap-x-5 md:block">
              {i < processSection.steps.length - 1 ? (
                // bud centre to the next bud centre: 40px is gap-10, 24px is md:gap-6
                <span
                  aria-hidden="true"
                  className="stem-line left-[27px] top-[28px] h-[calc(100%+40px)] w-[2px] md:left-[28px] md:top-[27px] md:h-[2px] md:w-[calc(100%+24px)]"
                  style={{ transitionDelay: `${i * 180}ms` } as CSSProperties}
                />
              ) : null}
              <Bud i={i} />
              <div className="md:mt-6">
                <span className="text-numeral block text-leaf" aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="text-title mt-2">
                  <span className="sr-only">{s.n} — </span>
                  {s.title}
                </h3>
                <p className="mt-2 max-w-[34ch] text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
