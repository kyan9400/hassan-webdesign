import { about, herbarium } from "@/data/site";
import { SpecimenLabel } from "@/components/ui/SpecimenLabel";

/** A pressed flower, drawn in code, for the top of the herbarium card. */
function PressedFlower() {
  return (
    <svg viewBox="0 0 240 120" className="h-auto w-full max-w-[260px]" aria-hidden="true" focusable="false">
      <path d="M40 112C70 90 96 70 120 40" className="fill-none stroke-leaf" strokeWidth="2" strokeLinecap="round" />
      <path d="M78 86C66 74 50 72 36 78 46 90 62 94 78 86Z" className="fill-fern" />
      <path d="M96 66C100 50 94 36 82 28 76 42 80 58 96 66Z" className="fill-fern" opacity=".8" />
      <path d="M62 100C56 90 46 86 34 88 40 98 50 102 62 100Z" className="fill-leaf" opacity=".7" />
      {[0, 1, 2, 3, 4].map((k) => (
        <ellipse key={k} cx="120" cy="24" rx="9" ry="17" transform={`rotate(${k * 72} 120 40)`} className="fill-bloom" opacity=".85" />
      ))}
      <circle cx="120" cy="40" r="7" className="fill-sun" />
      <path d="M150 96h70M150 104h46" className="stroke-line-strong" strokeWidth="1" strokeDasharray="2 4" />
      <rect x="146" y="58" width="78" height="28" rx="4" className="fill-paper-2 stroke-line" />
      <path d="M156 68h40M156 76h26" className="stroke-ink-soft" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function About() {
  return (
    <section id="about" tabIndex={-1} aria-labelledby="about-title" className="section-pad">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <SpecimenLabel>{about.eyebrow}</SpecimenLabel>
          <h2 id="about-title" className="text-display-l mt-4">
            {about.title}
          </h2>
          <div className="mt-6 flex max-w-[62ch] flex-col gap-4 text-ink-soft">
            {about.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
            {about.links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={l.ariaLabel}
                  className="inline-flex min-h-[44px] items-center font-semibold text-leaf-text underline underline-offset-4"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <aside aria-label={herbarium.label} className="lg:col-span-5" data-reveal>
          <div className="card leaf-radius p-6 md:p-8">
            <PressedFlower />
            <dl className="mt-6 divide-y divide-line border-t border-line">
              {herbarium.fields.map((f) => (
                <div key={f.field} className="grid grid-cols-[112px_1fr] items-baseline gap-4 py-3">
                  <dt className="text-label text-ink-soft">{f.field}</dt>
                  <dd className="font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
