import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// No automatic provisioning: the publisher and Worker must target one namespace.
const namespaceId = process.env.CLOUDFLARE_USERPAGE_KV_NAMESPACE_ID?.trim();
if (!namespaceId || !/^[a-f0-9]{32}$/i.test(namespaceId)) {
  throw new Error("Set CLOUDFLARE_USERPAGE_KV_NAMESPACE_ID to the existing userpage CMS KV namespace ID used by monkey-admin-api before deployment.");
}
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
config.kv_namespaces = [{ binding: "USERPAGE_CONFIG", id: namespaceId }];
config.main = resolve(config.main);
config.assets.directory = resolve(config.assets.directory);
const generatedPath = resolve(".wrangler/userpage-deploy.json");
await mkdir(resolve(".wrangler"), { recursive: true });
await writeFile(generatedPath, JSON.stringify(config, null, 2));
try {
  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), "deploy", "--config", generatedPath, ...process.argv.slice(2)], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolveExit(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await rm(generatedPath, { force: true });
}
