import { contact, contactSection } from "@/data/site";
import { SpecimenLabel } from "@/components/ui/SpecimenLabel";
import { CopyButton } from "@/components/ui/CopyButton";

/** Static hummingbird drinking from a bloom (no animation). */
function SippingBird() {
  return (
    <svg viewBox="0 0 220 160" className="h-auto w-[120px] sm:w-[180px] md:w-[220px]" aria-hidden="true" focusable="false">
      <path d="M176 160C172 128 168 108 160 92" fill="none" stroke="#79C48C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M168 128C182 120 196 122 204 132 192 140 178 138 168 128Z" fill="#3E7A52" />
      <g transform="translate(150 78)">
        {[0, 1, 2, 3, 4].map((k) => (
          <ellipse key={k} cx="0" cy="-13" rx="7" ry="13" transform={`rotate(${k * 72 - 20})`} fill="#F07A9A" />
        ))}
        <circle r="5.5" fill="#FFC86B" />
      </g>
      <g transform="translate(78 64) rotate(-8)">
        <path d="M-6-6C-20-30-10-50 6-52 20-44 16-22 2-6Z" fill="rgb(143 211 232 / .45)" />
        <path d="M-30 12C-42 18-48 24-54 32-42 30-34 26-26 20Z" fill="#3FB59A" />
        <ellipse rx="20" ry="10.5" transform="rotate(-28)" fill="#2F7D4F" />
        <path d="M-14 9C-4 12 7 7 14-2 7 9-4 15-16 13Z" fill="#E8F1E6" />
        <circle cx="14" cy="-13" r="8" fill="#2F7D4F" />
        <path d="M9-7C14-2 19-4 21-10 17-9 13-8 9-7Z" fill="#F07A9A" />
        <circle cx="17" cy="-14.5" r="1.5" fill="#0D1712" />
        <path d="M21-15.5Q38-17 56-12" fill="none" stroke="#E9F2EC" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Contact() {
  return (
    <section id="contact" tabIndex={-1} aria-labelledby="contact-title" className="section-pad">
      <div className="container-site">
        <div className="contact-panel relative overflow-hidden rounded-[36px] px-6 py-12 md:px-14 md:py-16">
          <div className="pointer-events-none absolute right-3 top-3 opacity-95 sm:right-6 sm:top-6 md:right-10 md:top-8">
            <SippingBird />
          </div>
          <div className="relative max-w-[640px] pr-0 md:pr-24">
            <SpecimenLabel tone="onDark">{contactSection.eyebrow}</SpecimenLabel>
            <h2 id="contact-title" className="text-display-l mt-4 max-w-[16ch] pt-16 md:pt-0">
              {contactSection.title}
            </h2>
            <p className="text-lead mt-5 text-contact-soft">{contactSection.text}</p>
          </div>

          <ul className="relative mt-10 grid gap-3 md:grid-cols-2 md:gap-4">
            {contactSection.channels.map((c) => (
              <li key={c.id} className="relative">
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={c.ariaLabel}
                  className={`channel h-full ${c.id === "email" ? "pr-16 sm:pr-28" : ""}`}
                >
                  <span className="text-label text-contact-soft">{c.label}</span>
                  <span className="text-base font-semibold [overflow-wrap:anywhere] sm:text-lg">{c.value}</span>
                  <span className="mt-1 font-medium text-contact-text underline decoration-[#F07A9A] decoration-2 underline-offset-4">{c.action}</span>
                </a>
                {c.id === "email" ? (
                  <CopyButton
                    value={contact.email}
                    label={contactSection.copy}
                    copiedLabel={contactSection.copied}
                    ariaLabel={contactSection.copyLabel}
                    labelClassName="max-sm:sr-only"
                    className="absolute right-3 top-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border border-[rgb(244_247_241/.3)] px-3 text-sm sm:px-4 font-semibold text-contact-text hover:bg-[rgb(244_247_241/.1)]"
                  />
                ) : null}
              </li>
            ))}
          </ul>

          <p className="relative mt-8 text-contact-soft">
            <a
              href={contact.mainPortfolio}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={contactSection.moreLabel}
              className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-contact-text"
            >
              {contactSection.more}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
