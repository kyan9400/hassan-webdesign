import type { MetadataRoute } from "next";
import { seo } from "@/data/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: seo.siteName,
    short_name: "Hassan",
    description: seo.homeDescription,
    start_url: "/",
    display: "standalone",
    theme_color: "#F4F7F1",
    background_color: "#F4F7F1",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
