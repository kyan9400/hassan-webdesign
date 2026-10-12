import type { NextConfig } from "next";

// GH_PAGES=1 builds the static GitHub Pages mirror (npm run build:pages); otherwise the normal Vercel build
const pages = process.env.GH_PAGES === "1";
const basePath = pages ? "/hassan-webdesign" : "";

const vercelConfig: NextConfig = {
  poweredByHeader: false,
  // "*.modal.tsx" files are the intercepted project panel (@modal); the Pages build leaves them out
  pageExtensions: ["tsx", "ts", "jsx", "js", "modal.tsx"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_GH_PAGES: pages ? "1" : "" },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // baseline security headers on every route
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // screenshots only: /work/[slug] pages and their RSC payloads keep Next's own caching
        source: "/work/:file([^/]+\.(?:webp|jpg))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

// static export: no server, so no headers, no image optimizer and no intercepted routes
const pagesConfig: NextConfig = {
  poweredByHeader: false,
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  env: vercelConfig.env,
  images: { unoptimized: true },
};

export default pages ? pagesConfig : vercelConfig;
