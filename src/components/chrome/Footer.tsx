import Link from "next/link";
import { footer, owner } from "@/data/site";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Divider } from "@/components/ui/Divider";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-2">
      <div className="container-site py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link href="/#top" className="wordmark" aria-label={`${owner.name} — home`}>
              {owner.wordmark}
              <span className="dot">.</span>
            </Link>
            <p className="mt-3 text-ink-soft">{footer.tagline}</p>
          </div>

          <nav aria-label={footer.footerNavLabel} className="md:col-span-5">
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {footer.links.map((l) => {
                const external = l.href.startsWith("http");
                return (
                  <li key={l.href}>
                    {external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${l.label.replace(" ↗", "")} (opens in a new tab)`}
                        className="inline-flex min-h-[44px] items-center font-medium underline-offset-4 hover:underline"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="inline-flex min-h-[44px] items-center font-medium underline-offset-4 hover:underline">
                        {l.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col items-start gap-1 md:col-span-3 md:items-end">
            <MotionToggle display="text" />
            <ThemeToggle display="text" />
            <a href="#top" className="inline-flex min-h-[44px] items-center px-[10px] font-medium underline-offset-4 hover:underline">
              {footer.backToTop}
            </a>
          </div>
        </div>

        <Divider className="mt-12" />
        <div className="mt-6 flex flex-col gap-2 text-small text-ink-soft sm:flex-row sm:justify-between">
          <p>{footer.copyright}</p>
          <p>{footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
