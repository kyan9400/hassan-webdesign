import { ImageResponse } from "next/og";
import { projects } from "@/data/projects";
import { ogFonts, publicDataUri } from "@/lib/og";

export const alt = "Websites that feel alive — Alhassan Alfarran, web design, 3D websites and AI tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TOWERS: [number, number, number][] = [
  [40, 70, 120], [130, 90, 170], [240, 70, 230], [330, 100, 300], [450, 64, 190], [534, 110, 330],
  [664, 84, 250], [768, 104, 200], [892, 90, 280], [1002, 76, 180], [1098, 90, 150],
];

export default async function Image() {
  const fonts = await ogFonts();
  const picks = projects.slice(0, 3);
  const shots = await Promise.all(picks.map((p) => publicDataUri(p.screenshots.og)));
  const angles = [-6, 0, 6];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#F4F7F1", fontFamily: "Instrument Sans" }}>
        {/* faint skyline silhouette */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 340, display: "flex" }}>
          {TOWERS.map(([x, w, h], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                bottom: 0,
                width: w,
                height: h,
                background: "#E2EEE8",
                borderTopLeftRadius: i % 3 === 1 ? w / 2 : 12,
                borderTopRightRadius: i % 3 === 1 ? w / 2 : 12,
              }}
            />
          ))}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 46, background: "#D9EAD9" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 72px", width: 620, position: "relative" }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Fraunces", fontWeight: 600, fontSize: 76, lineHeight: 1, letterSpacing: -2, color: "#13221A" }}>
            <span>Websites that feel&nbsp;</span>
            <span style={{ fontStyle: "italic", color: "#2F7D4F" }}>alive</span>
            <span>.</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#4C6155" }}>Alhassan Alfarran — web design, 3D websites, AI tools</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 22, color: "#24663F", letterSpacing: 2 }}>11 LIVE 3D SITES INSIDE</div>
        </div>

        <div style={{ position: "absolute", right: 40, top: 120, width: 520, height: 360, display: "flex" }}>
          {picks.map((p, i) => (
            <div
              key={p.slug}
              style={{
                position: "absolute",
                left: i * 92,
                top: i === 1 ? 0 : 24,
                width: 330,
                height: 206,
                display: "flex",
                transform: `rotate(${angles[i]}deg)`,
                border: "4px solid #3C5A45",
                borderRadius: 14,
                overflow: "hidden",
                background: `linear-gradient(135deg, ${p.accent.swatch}, #F4F7F1)`,
                boxShadow: "0 24px 50px -20px rgba(19,34,26,0.45)",
              }}
            >
              {shots[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shots[i]!} width={330} height={206} alt="" style={{ objectFit: "cover", width: 330, height: 206 }} />
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", padding: 18, fontFamily: "Fraunces", fontWeight: 600, fontSize: 30, color: "#13221A" }}>
                  {p.name}
                </div>
              )}
            </div>
          ))}
          {/* the hummingbird's flight path */}
          <svg width="520" height="360" viewBox="0 0 520 360" style={{ position: "absolute", left: 0, top: 0 }}>
            <path d="M20 330 C 120 300, 160 250, 230 262 S 380 300, 470 236" fill="none" stroke="#F07A9A" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <g transform="translate(470 228) rotate(-18)">
              <ellipse cx="0" cy="0" rx="17" ry="9" fill="#2F7D4F" />
              <circle cx="13" cy="-8" r="7" fill="#2F7D4F" />
              <path d="M9-3 C13 1 17-1 19-6 Z" fill="#F07A9A" />
              <path d="M19 -9 L42 -10" stroke="#13221A" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M-4 -6 C-16 -26 -8 -42 6 -44 C18 -36 14 -18 2 -6 Z" fill="#8FD3E8" fillOpacity="0.6" />
            </g>
          </svg>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
