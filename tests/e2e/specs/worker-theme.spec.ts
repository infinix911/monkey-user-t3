import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const assetsDirectory = resolve(".output/public");
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
let worker: Miniflare;
let failTheme = false;
const serverRequests: { path: string; cookie: string | null; authorization: string | null; origin: string | null }[] = [];
const scripts = [{ id: 3, title: "CMS tracker", script: "window.__cmsRuns=(window.__cmsRuns||0)+1;" }];
function apiBody(path: string): unknown {
  if (path === "/api/site/config/theme") return { identity: { documentTitle: "SSR brand", siteName: "SSR brand" }, content: { footer: "<p>CMS footer from SSR</p>" } };
  if (path === "/api/site/custom-scripts") return scripts;
  if (path === "/api/site/settings") return [{ key: "fixture", value: "public" }];
  if (path.includes("/auth/")) return null;
  return [];
}
async function intercept(page: Page) {
  const reads = { theme: 0, scripts: 0 };
  await page.routeWebSocket("**/*", (socket) => socket.close());
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "play.example.com") {
      const response = await worker.dispatchFetch(url.href, { method: request.method(), headers: request.headers() });
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
      return;
    }
    if (url.pathname === "/api/site/config/theme") reads.theme++;
    if (url.pathname === "/api/site/custom-scripts") reads.scripts++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiBody(url.pathname)), headers: { "access-control-allow-origin": request.headers().origin || "https://play.example.com", "access-control-allow-credentials": "true" } });
  });
  return reads;
}

test.describe("Generated public SSR Worker", () => {
  test.skip(!existsSync(resolve(".output/server/index.mjs")), "Run bun run build before this suite.");
  test.beforeAll(async () => {
    const bundle = await build({ entryPoints: ["index.js"], bundle: true, write: false, format: "esm", platform: "neutral", external: ["cloudflare:*", "node:*"] });
    worker = new Miniflare(convertV4MiniflareOptions({
      modules: true, script: bundle.outputFiles[0]!.text, compatibilityDate: "2026-09-01", compatibilityFlags: ["nodejs_compat"],
      outboundService: async (request) => {
        const path = new URL(request.url).pathname;
        serverRequests.push({ path, cookie: request.headers.get("Cookie"), authorization: request.headers.get("Authorization"), origin: request.headers.get("Origin") });
        if (failTheme && path === "/api/site/config/theme") return new Response("offline", { status: 503 });
        return Response.json(apiBody(path), { headers: path === "/api/site/config/theme" ? { "X-Userpage-Cache-Tag": "userpage-test-site:green" } : {} });
      },
      serviceBindings: { ASSETS: async (request) => {
        const path = resolve(assetsDirectory, `.${decodeURIComponent(new URL(request.url).pathname)}`);
        if (!path.startsWith(`${assetsDirectory}${sep}`)) return new Response(null, { status: 404 });
        try { return new Response(await readFile(path), { headers: { "Content-Type": types[extname(path)] ?? "application/octet-stream" } }); }
        catch { return new Response(null, { status: 404 }); }
      } },
    }));
  });
  test.afterAll(async () => { await worker?.dispose(); });
  test.beforeEach(() => { failTheme = false; serverRequests.length = 0; });

  test("returns CMS HTML before JavaScript without forwarding member credentials", async () => {
    const response = await worker.dispatchFetch("https://play.example.com/", { headers: { Cookie: "bn.session=private; ui_locale=ko" } });
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("<title>SSR brand</title>");
    expect(html).toContain("<p>CMS footer from SSR</p>");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("Cache-Tag")).toBe("userpage-test-site:green");
    expect(serverRequests.some((request) => request.path === "/api/site/config/theme")).toBe(true);
    expect(serverRequests.every((request) => !request.cookie && !request.authorization && request.origin === "https://play.example.com")).toBe(true);
    expect(serverRequests.some((request) => request.path.includes("/auth/"))).toBe(false);
    expect(html).not.toContain("bn.session=private");
  });

  test("hydrates without duplicate CMS requests and executes scripts once", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    const reads = await intercept(page);
    await page.goto("https://play.example.com/");
    await expect(page).toHaveTitle("SSR brand");
    await expect.poll(() => page.evaluate(() => (window as Window & { __cmsRuns?: number }).__cmsRuns)).toBe(1);
    await expect.poll(() => page.evaluate(() => !!(document.getElementById("__nuxt") as HTMLElement & { __vue_app__?: unknown })?.__vue_app__)).toBe(true);
    expect(reads).toEqual({ theme: 0, scripts: 0 });
    expect(browserErrors).toEqual([]);
  });

  test("preview uses the API without caching and failures never cache defaults", async () => {
    const preview = await worker.dispatchFetch("https://play.example.com/?themePreview=1");
    expect(preview.headers.get("Cache-Control")).toBe("no-store");
    failTheme = true;
    const failed = await worker.dispatchFetch("https://play.example.com/");
    expect(failed.headers.get("Cache-Control")).toBe("no-store");
    expect(failed.headers.has("Cache-Tag")).toBe(false);
  });
});
