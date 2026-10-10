import { hero } from "@/data/site";
import { btnClass } from "@/components/ui/Button";
import { HeroPoster } from "./HeroPoster";
import { HeroLive } from "./HeroLive";
import { ReducedMotionPill } from "./ReducedMotionPill";

/**
 * Hero: the H1 and copy paint immediately over the server-rendered drawing (LCP = the H1 text,
 * never animated in). The 3D "living skyline" replaces the drawing in place when it is ready.
 */
export function Hero() {
  return (
    <section id="top" className="hero" data-hero="loading" aria-labelledby="hero-title">
      <div className="hero-art" aria-hidden="true">
        <HeroPoster />
        <HeroLive />
      </div>

      <div className="container-site hero-inner">
        <div className="hero-text" data-hero-text>
          <p className="hero-tag">{hero.tag}</p>
          <h1 id="hero-title" className="hero-title text-display-xl mt-6 max-w-[14ch]">
            {hero.titleBefore}
            <em>{hero.titleAccent}</em>
            {hero.titleAfter}
          </h1>
          <p className="text-lead mt-6 max-w-[56ch] text-ink-soft">{hero.text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={hero.primary.href} className={btnClass("primary")}>
              {hero.primary.label}
            </a>
            <a href={hero.ghost.href} className={btnClass("ghost", "md", "bg-surface")}>
              {hero.ghost.label}
            </a>
          </div>
          <p className="text-label mt-6 text-ink-soft">{hero.micro}</p>
        </div>
      </div>

      <ReducedMotionPill />
    </section>
  );
}
