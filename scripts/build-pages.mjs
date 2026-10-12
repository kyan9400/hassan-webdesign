// Static GitHub Pages build: runs `next build` with GH_PAGES=1 and writes out/ (+ .nojekyll).
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const res = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, GH_PAGES: "1" },
});
if (res.status !== 0) process.exit(res.status ?? 1);

const out = join(process.cwd(), "out");
if (!existsSync(out)) {
  console.error("build:pages: out/ was not created");
  process.exit(1);
}
// keep Jekyll from hiding the _next/ folder
writeFileSync(join(out, ".nojekyll"), "");
console.log("build:pages: out/ ready for GitHub Pages");
