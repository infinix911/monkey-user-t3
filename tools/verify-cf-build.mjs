import { stat } from "node:fs/promises";

for (const path of [".output/server/index.mjs", ".output/public"]) {
  const info = await stat(path).catch(() => null);
  if (!info || (path.endsWith(".mjs") ? !info.isFile() || info.size === 0 : !info.isDirectory())) {
    throw new Error(`Cloudflare SSR build is missing ${path}. Run bun run build first.`);
  }
}
console.log("Cloudflare SSR renderer and public assets verified.");
