import { projectToViewBox } from "@/lib/skyline-fit";
import {
  BLOSSOMS,
  CANOPIES,
  HILL,
  START_BLOSSOM,
  TOWERS,
  hillTop,
  type TowerDef,
} from "@/components/three/hero/layout";

/**
 * Server-rendered drawing of the skyline: the loading state, the low-tier view and the no-WebGL
 * fallback all at once. Every shape is pre-projected with the same camera the 3D scene uses, so the
 * cross-fade from drawing to 3D lines up. Fills are CSS variables, so it themes itself.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;

function towerPath(t: TowerDef): string {
  const top = projectToViewBox(t.x, t.h, t.z);
  const base = projectToViewBox(t.x, hillTop(t.x), t.z);
  const s = top.s;
  const half = (t.w / 2) * 100 * s;
  const rr = Math.min(t.r * 100 * s, half);
  const x0 = r1(top.vx - half);
  const x1 = r1(top.vx + half);
  const yt = r1(top.vy);
  const yb = r1(base.vy + 4);
  const rad = r1(rr);
  return `M${x0} ${yb}V${r1(yt + rad)}A${rad} ${rad} 0 0 1 ${r1(x0 + rad)} ${yt}H${r1(x1 - rad)}A${rad} ${rad} 0 0 1 ${x1} ${r1(yt + rad)}V${yb}Z`;
}

function hillPath(): string {
  const pts: string[] = [];
  for (let x = -19; x <= 19; x += 1) {
    const p = projectToViewBox(x, hillTop(x), HILL.zBack);
    pts.push(`${Math.round(p.vx)} ${r1(p.vy)}`);
  }
  const y0 = pts[0].split(" ")[1];
  const yN = pts[pts.length - 1].split(" ")[1];
  return `M-1600 620V${y0}L${pts.join("L")}L3000 ${yN}V620Z`;
}

export function HeroPoster() {
  const sip = BLOSSOMS[START_BLOSSOM];
  const sipVB = projectToViewBox(sip.x, sip.y, sip.z);
  // bird: bill tip (local 27, −20, mirrored) touches the flower — same offset as SIP_OFFSET in 3D
  const birdX = r1(sipVB.vx + 27);
  const birdY = r1(sipVB.vy + 20);

  return (
    <svg
      className="hero-poster"
      viewBox="-240 0 1920 500"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hp-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="hp-g0" />
          <stop offset="1" className="hp-g1" />
        </linearGradient>
        <pattern id="hp-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path className="hp-floor" d="M0 .5H25M.5 0V25" />
          <rect className="hp-win" x="5" y="6" width="7" height="12" />
          <rect className="hp-win" x="15" y="6" width="6" height="12" opacity=".55" />
        </pattern>
        <symbol id="hp-f" viewBox="-7 -7 14 14" width="14" height="14" overflow="visible">
          <circle className="hp-pet" cx="0" cy="-3.6" r="2.9" />
          <circle className="hp-pet" cx="3.4" cy="-1.1" r="2.9" />
          <circle className="hp-pet" cx="2.1" cy="2.9" r="2.9" />
          <circle className="hp-pet" cx="-2.1" cy="2.9" r="2.9" />
          <circle className="hp-pet" cx="-3.4" cy="-1.1" r="2.9" />
          <circle className="hp-ctr" r="1.9" />
        </symbol>
        {TOWERS.map((t) => (
          <path key={t.id} id={`hp-t${t.id}`} d={towerPath(t)} />
        ))}
      </defs>

      <path className="hp-hill" d={hillPath()} />

      <g fill="url(#hp-glass)">
        {TOWERS.map((t) => (
          <use key={t.id} href={`#hp-t${t.id}`} />
        ))}
      </g>
      <g fill="url(#hp-grid)">
        {TOWERS.map((t) => (
          <use key={t.id} href={`#hp-t${t.id}`} />
        ))}
      </g>

      {TOWERS.map((t, ti) => (
        <g key={t.id} className="hp-sway">
          {([0, 1] as const).map((tone) => (
            <g key={tone} className={tone ? "hp-c2" : "hp-c1"}>
              {CANOPIES.filter((c) => c.tower === ti && c.tone === tone).map((c, i) => {
                const p = projectToViewBox(c.x, c.y, c.z);
                return <circle key={i} cx={Math.round(p.vx)} cy={Math.round(p.vy)} r={Math.round(c.r * 100 * p.s)} />;
              })}
            </g>
          ))}
        </g>
      ))}

      <g>
        {BLOSSOMS.map((b, i) => {
          const p = projectToViewBox(b.x, b.y, b.z);
          return <use key={i} href="#hp-f" x={Math.round(p.vx - 7)} y={Math.round(p.vy - 7)} />;
        })}
      </g>

      {/* the hummingbird, hovering at a flower on tower 4 (mirrored: it faces left) */}
      <g transform={`translate(${birdX} ${birdY}) scale(-1 1)`}>
        <path className="hp-wingf hp-wing" d="M-2-6C-14-26-6-44 8-46 20-38 16-20 4-6Z" />
        <path className="hp-flank" d="M-24 14C-34 20-40 24-44 30-34 28-28 26-22 22Z" />
        <path className="hp-back" d="M-26 13C-30 21-29 27-33 33-25 27-21 22-18 16Z" />
        <ellipse className="hp-back" cx="0" cy="0" rx="17" ry="9" transform="rotate(-32)" />
        <path className="hp-belly" d="M-12 8C-4 10 6 6 12-2 6 8-4 13-14 11Z" />
        <circle className="hp-back" cx="12" cy="-11" r="6.8" />
        <path className="hp-gorget" d="M8-6C12-2 16-4 18-9 15-8 12-7 8-6Z" />
        <circle className="hp-eye" cx="14.5" cy="-12.5" r="1.3" />
        <path className="hp-bill" d="M17-13Q22-16.5 27-20" />
      </g>
    </svg>
  );
}
