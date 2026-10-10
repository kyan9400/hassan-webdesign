import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Helpers for the OG images (server only, build time). Fonts are static OFL instances committed in
 * src/app/_og/ (Satori needs static fonts, not variable ones). If a file is missing the image still
 * renders with the built-in font, and a missing screenshot renders an accent card instead:
 * the build never fails because of a missing asset.
 */

type OgFont = { name: string; data: ArrayBuffer; weight: 500 | 600; style: "normal" | "italic" };

async function tryFont(file: string, name: string, weight: 500 | 600, style: "normal" | "italic"): Promise<OgFont | null> {
  try {
    const buf = await readFile(join(process.cwd(), "src", "app", "_og", file));
    return { name, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight, style };
  } catch {
    return null;
  }
}

export async function ogFonts(): Promise<OgFont[]> {
  const list = await Promise.all([
    tryFont("Fraunces_72pt-SemiBold.ttf", "Fraunces", 600, "normal"),
    tryFont("Fraunces_72pt-SemiBoldItalic.ttf", "Fraunces", 600, "italic"),
    tryFont("InstrumentSans-Medium.ttf", "Instrument Sans", 500, "normal"),
  ]);
  return list.filter((f): f is OgFont => f !== null);
}

/** A file in public/ as a data URI, or null when it is not there (yet). */
export async function publicDataUri(src: string, mime = "image/jpeg"): Promise<string | null> {
  try {
    const data = await readFile(join(process.cwd(), "public", src.replace(/^\//, "")), "base64");
    return `data:${mime};base64,${data}`;
  } catch {
    return null;
  }
}
