import type { MetadataRoute } from "next";
import { seo } from "@/data/site";
import { basePath, withBase } from "@/lib/pages";

// already static; the static export (GitHub Pages mirror) needs it said explicitly
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: seo.siteName,
    short_name: "Hassan",
    description: seo.homeDescription,
    start_url: withBase("/"),
    display: "standalone",
    theme_color: "#F4F7F1",
    background_color: "#F4F7F1",
    icons: [
      { src: withBase("/icon.svg"), sizes: "any", type: "image/svg+xml" },
      { src: `${basePath}/apple-icon`, sizes: "180x180", type: "image/png" },
    ],
  };
}
