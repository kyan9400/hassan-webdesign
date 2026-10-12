import { RouteLink as Link } from "@/components/ui/RouteLink";
import { notFound as copy } from "@/data/site";
import { btnClass } from "@/components/ui/Button";

/** The hummingbird hovering over an empty terracotta pot. */
function EmptyPot() {
  return (
    <svg viewBox="0 0 320 240" className="h-auto w-full max-w-[320px]" aria-hidden="true" focusable="false">
      <ellipse cx="160" cy="226" rx="92" ry="8" className="fill-line" />
      <path d="M104 150h112l-14 74h-84Z" fill="#C8693F" />
      <rect x="96" y="138" width="128" height="20" rx="6" fill="#B35A33" />
      <path d="M118 166h84" stroke="#E08A5E" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <ellipse cx="160" cy="140" rx="56" ry="5" fill="#5A3A28" opacity=".6" />
      <g transform="translate(178 70) scale(-1 1)">
        <path className="fill-[rgb(143_211_232/.5)]" d="M-2-6C-14-26-6-44 8-46 20-38 16-20 4-6Z" />
        <path fill="#3FB59A" d="M-24 14C-34 20-40 24-44 30-34 28-28 26-22 22Z" />
        <ellipse rx="17" ry="9" transform="rotate(-32)" fill="#2F7D4F" />
        <path fill="#E8F1E6" d="M-12 8C-4 10 6 6 12-2 6 8-4 13-14 11Z" />
        <circle cx="12" cy="-11" r="6.8" fill="#2F7D4F" />
        <path className="fill-bloom" d="M8-6C12-2 16-4 18-9 15-8 12-7 8-6Z" />
        <circle cx="14.5" cy="-12.5" r="1.3" fill="#13221a" />
        <path d="M18-13.5Q28-16 36-20" fill="none" className="stroke-ink" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <path d="M150 118c2-6 6-10 10-12" fill="none" className="stroke-ink-soft" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <section id="top" className="container-site flex min-h-[80svh] flex-col items-center justify-center pt-32 pb-24 text-center">
      <EmptyPot />
      <h1 className="text-display-l mt-8 max-w-[18ch]">{copy.title}</h1>
      <p className="text-lead mt-4 max-w-[48ch] text-ink-soft">{copy.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={copy.home.href} className={btnClass("primary")}>
          {copy.home.label}
        </Link>
        <Link href={copy.work.href} className={btnClass("ghost")}>
          {copy.work.label}
        </Link>
      </div>
    </section>
  );
}
