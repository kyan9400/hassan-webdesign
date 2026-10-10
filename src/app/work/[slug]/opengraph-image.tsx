import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProject, pad2, PROJECT_COUNT, projects } from "@/data/projects";
import { ogFonts, publicDataUri } from "@/lib/og";

export const alt = "A live 3D website by Alhassan Alfarran";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const [fonts, shot] = await Promise.all([ogFonts(), publicDataUri(p.screenshots.og)]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#F4F7F1", fontFamily: "Instrument Sans", padding: 40 }}>
        {/* the screenshot in a leaf-radius frame on the left 62 % */}
        <div
          style={{
            width: 744,
            height: 465,
            display: "flex",
            overflow: "hidden",
            borderTopLeftRadius: 40,
            borderBottomRightRadius: 40,
            borderTopRightRadius: 10,
            borderBottomLeftRadius: 10,
            border: "4px solid #3C5A45",
            background: `linear-gradient(135deg, ${p.accent.swatch}, #F4F7F1)`,
          }}
        >
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} width={744} height={465} alt="" style={{ width: 744, height: 465, objectFit: "cover", objectPosition: "top" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", padding: 32, fontFamily: "Fraunces", fontWeight: 600, fontSize: 56, color: "#13221A" }}>
              {p.name}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 40, width: 336 }}>
          <div style={{ display: "flex", width: 72, height: 8, borderRadius: 4, background: p.accent.swatch }} />
          <div style={{ display: "flex", marginTop: 24, fontSize: 24, color: "#4C6155", letterSpacing: 2 }}>{`${pad2(p.order)} / ${pad2(PROJECT_COUNT)}`}</div>
          <div style={{ display: "flex", marginTop: 12, fontFamily: "Fraunces", fontWeight: 600, fontSize: 54, lineHeight: 1.04, color: "#13221A" }}>{p.name}</div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 28, color: "#4C6155" }}>{p.sectorLabel}</div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 22, color: "#24663F" }}>A live 3D website by Alhassan Alfarran</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
