import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

// already static; the static export (GitHub Pages mirror) needs it said explicitly
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
