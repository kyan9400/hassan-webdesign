/**
 * The GitHub Pages mirror (npm run build:pages): a static export served under a base path, for
 * visitors whose providers block vercel.app. In the normal build `ghPages` is false, `basePath` is
 * empty and every helper here returns its input unchanged.
 */

export const ghPages = process.env.NEXT_PUBLIC_GH_PAGES === "1";
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The project panel is an intercepted route, which needs a server: the mirror opens plain case pages. */
export const hasProjectPanel = !ghPages;

/**
 * A root-relative URL ("/work/x", "/#contact", "/work/x.webp") with the base path added, plus the
 * export's trailing slash on page paths. Other URLs (external, "#hash", "mailto:") are unchanged.
 */
export function withBase(url: string): string {
  if (!basePath || !url.startsWith("/") || url.startsWith("//")) return url;
  const cut = url.search(/[?#]/);
  let path = cut < 0 ? url : url.slice(0, cut);
  const rest = cut < 0 ? "" : url.slice(cut);
  if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path += "/";
  return basePath + path + rest;
}
