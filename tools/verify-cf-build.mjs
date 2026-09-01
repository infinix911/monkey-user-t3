import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const assetDirectory = resolve(".output/public");
const indexFile = resolve(assetDirectory, "index.html");

try {
  await access(assetDirectory, constants.R_OK);
  const indexStats = await stat(indexFile);

  if (!indexStats.isFile() || indexStats.size === 0) {
    throw new Error("index.html is missing or empty");
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Cloudflare deploy preflight failed: ${indexFile} must be a non-empty file. Run \`bun run generate\` before deploying. (${reason})`,
  );
}

console.log(`Cloudflare deploy preflight passed: ${indexFile}`);
