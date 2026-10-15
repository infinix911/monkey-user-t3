import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import type { UserpageBootstrap } from "../../../shared/utils/userpage-bootstrap";

const assetsDirectory = resolve(".output/public");
const hosts = { "luckylah222.com": "luckylah", "greenxxxx.com": "green" };
const types: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".woff2": "font/woff2",
};
let worker: Miniflare;

function snapshot(siteCode: string, theme: UserpageBootstrap["theme"] = {
  identity: { documentTitle: `Bootstrap ${siteCode}`, siteName: siteCode },
}): UserpageBootstrap {
  return {
    version: "browser-fixture", updatedAt: "2026-10-07T12:00:00.000Z", siteCode, theme,
    customScripts: [
      { id: 1, title: "Wrapped", script: '<script>window.__cmsRuns=window.__cmsRuns||[];window.__cmsRuns.push("first");</script><script>window.__cmsRuns.push("second");</script>' },
      { id: 2, title: "Plain", script: 'window.__cmsRuns.push("plain");' },
    ],
  };
}

async function intercept(page: Page) {
  const reads = { theme: 0, scripts: 0, settings: 0 };
  await page.routeWebSocket("**/*", (socket) => socket.close());
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (Object.hasOwn(hosts, url.hostname) || url.hostname === "play.luckylah222.com" || url.hostname === "unknown.example.com") {
      const response = await worker.dispatchFetch(url.href, { method: request.method() });
      await route.fulfill({
        status: response.status, headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
      return;
    }
    // Every non-shell request is intercepted: this suite never calls live APIs.
    let body: unknown = [];
    if (url.pathname === "/api/site/config/theme") {
      reads.theme++;
      body = { identity: { documentTitle: "API fallback" } };
    } else if (url.pathname === "/api/site/custom-scripts") {
      reads.scripts++;
      body = [{ id: 3, title: "Fallback", script: "window.__fallbackRuns=(window.__fallbackRuns||0)+1;" }];
    } else if (url.pathname === "/api/site/settings") {
      reads.settings++;
      body = [{ key: "fixture", value: "client-only" }];
    } else if (url.pathname.includes("/auth/")) body = null;
    await route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(body),
      headers: {
        "access-control-allow-origin": request.headers().origin ?? "https://luckylah222.com",
        "access-control-allow-credentials": "true",
      },
    });
  });
  return reads;
}

async function renderedConfig(page: Page) {
  return page.evaluate(() => {
    const root = document.getElementById("__nuxt") as HTMLElement & {
      __vue_app__?: { config: { globalProperties: {
        $nuxt?: { payload: { state: Record<string, unknown> } };
      } } };
    };
    const state = root?.__vue_app__?.config.globalProperties.$nuxt?.payload.state;
    return state && Object.fromEntries(Object.entries(state).map(([key, value]) => [key.replace(/^\$s/, ""), value]));
  });
}

test.describe("Generated Worker shell browser bootstrap", () => {
  test.skip(!existsSync(resolve(assetsDirectory, "index.html")), "Run bun run generate before the generated-shell suite.");

  test.beforeAll(async () => {
    const assetHeaders = await readFile("public/_headers", "utf8");
    const csp = assetHeaders.match(/Content-Security-Policy:\s*([^\n\r]+)/)?.[1];
    const bundle = await build({
      entryPoints: ["index.js"], bundle: true, write: false,
      format: "esm", platform: "browser", external: ["cloudflare:workers"],
    });
    worker = new Miniflare(convertV4MiniflareOptions({
      modules: true, script: bundle.outputFiles[0]!.text,
      compatibilityDate: "2026-09-01", kvNamespaces: ["USERPAGE_CONFIG"],
      serviceBindings: { ASSETS: async (request) => {
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        const file = resolve(assetsDirectory, `.${pathname}`);
        if (!file.startsWith(`${assetsDirectory}${sep}`)) return new Response(null, { status: 404 });
        try {
          return new Response(await readFile(file), {
            headers: {
              "Content-Type": types[extname(file)] ?? "application/octet-stream",
              ...(csp ? { "Content-Security-Policy": csp } : {}),
            },
          });
        } catch { return new Response(null, { status: 404 }); }
      } },
    }));
    const kv = await worker.getKVNamespace("USERPAGE_CONFIG");
    for (const [hostname, siteCode] of Object.entries(hosts)) {
      await kv.put(`domain:${hostname}`, JSON.stringify({publisherId: `${siteCode}-admin`, siteCode}));
    }
    // A stale legacy map must have no influence after cutover.
    await kv.put("site-groups", JSON.stringify({"luckylah222.com": "green"}));
    await kv.put("bootstrap:luckylah", JSON.stringify(snapshot("luckylah")));
    await kv.put("bootstrap:green", JSON.stringify(snapshot("green", null)));
  });
  test.afterAll(async () => { await worker?.dispose(); });

  test("tenant theme reaches first render, scripts run once, and only settings fetches", async ({ page }) => {
    const reads = await intercept(page);
    await page.goto("https://luckylah222.com/");
    await expect(page.locator("header")).toBeVisible();
    await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
    await expect(page).toHaveTitle("Bootstrap luckylah");
    const state = await renderedConfig(page);
    expect((state?.userPageConfig as { identity: { documentTitle: string } }).identity.documentTitle).toBe("Bootstrap luckylah");
    expect(reads).toEqual({ theme: 0, scripts: 0, settings: 1 });
    expect(await page.evaluate(() => (window as Window & { __cmsRuns: string[] }).__cmsRuns)).toEqual(["first", "second", "plain"]);

    await page.evaluate(async () => {
      const root = document.getElementById("__nuxt") as HTMLElement & {
        __vue_app__: { config: { globalProperties: {
          $nuxt: { $router: { push(path: string): Promise<unknown> } };
        } } };
      };
      await root.__vue_app__.config.globalProperties.$nuxt.$router.push("/casino");
    });
    await expect(page).toHaveURL(/\/casino/);
    expect(await page.evaluate(() => (window as Window & { __cmsRuns: string[] }).__cmsRuns)).toEqual(["first", "second", "plain"]);
    await page.evaluate(() => {
      const root = document.getElementById("__nuxt") as HTMLElement & {
        __vue_app__: { config: { globalProperties: {
          $nuxt: { $pinia: { _s: Map<string, { clear(): void }> } };
        } } };
      };
      root.__vue_app__.config.globalProperties.$nuxt.$pinia._s.get("site")!.clear();
    });
    expect(await page.evaluate(() => (window as Window & { __cmsRuns: string[] }).__cmsRuns)).toEqual(["first", "second", "plain"]);
    expect(reads).toEqual({ theme: 0, scripts: 0, settings: 1 });
  });

  test("a published null theme settles without theme or script API requests", async ({ page }) => {
    const reads = await intercept(page);
    await page.goto("https://greenxxxx.com/casino");
    await expect(page.locator("header")).toBeVisible();
    await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
    expect((await renderedConfig(page))?.userPageConfig).toBeNull();
    expect(reads).toEqual({ theme: 0, scripts: 0, settings: 1 });
    expect(await page.evaluate(() => (window as Window & { __cmsRuns: string[] }).__cmsRuns)).toEqual(["first", "second", "plain"]);
  });

  test("another publisher serves a distinct design without client CMS requests", async ({ page }) => {
    const kv = await worker.getKVNamespace("USERPAGE_CONFIG");
    await kv.put("bootstrap:green", JSON.stringify(snapshot("green", {identity: {documentTitle: "Green design", siteName: "Green"}})));
    try {
      const reads = await intercept(page);
      await page.goto("https://greenxxxx.com/");
      await expect(page.locator("header")).toBeVisible();
      await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
      await expect(page).toHaveTitle("Green design");
      expect(reads).toEqual({theme: 0, scripts: 0, settings: 1});
      expect(await page.evaluate(() => window.__SITE_BOOTSTRAP__?.siteCode)).toBe("green");
    } finally {await kv.put("bootstrap:green", JSON.stringify(snapshot("green", null)));}
  });

  test("an unlisted subdomain inherits its parent design without CMS requests", async ({ page }) => {
    const reads = await intercept(page);
    await page.goto("https://play.luckylah222.com/");
    await expect(page.locator("header")).toBeVisible();
    await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
    await expect(page).toHaveTitle("Bootstrap luckylah");
    expect(reads).toEqual({theme: 0, scripts: 0, settings: 1});
  });

  test("preview bypasses live Worker scripts and uses the client fallback endpoints", async ({ page }) => {
    const reads = await intercept(page);
    const themeRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/site/config/theme") themeRequests.push(request.url());
    });
    await page.goto("https://luckylah222.com/?themePreview=1");
    await expect(page.locator("header")).toBeVisible();
    await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
    await expect(page).toHaveTitle("API fallback");
    expect(reads).toEqual({ theme: 1, scripts: 1, settings: 1 });
    expect(await page.evaluate(() => (window as Window & { __cmsRuns?: string[] }).__cmsRuns)).toBeUndefined();
    await expect.poll(() => page.evaluate(() => (window as Window & { __fallbackRuns?: number }).__fallbackRuns)).toBe(1);
    expect(await page.evaluate(() => window.__SITE_BOOTSTRAP__)).toBeUndefined();
    expect(themeRequests).toHaveLength(1);
    expect(new URL(themeRequests[0]!).searchParams.get("domain")).toBe("preview");
  });

  test("an unmapped hostname retains theme, script and settings API fallback", async ({ page }) => {
    const reads = await intercept(page);
    await page.goto("https://unknown.example.com/");
    await expect(page.locator("header")).toBeVisible();
    await expect.poll(async () => (await renderedConfig(page))?.siteConfigBootstrapReady).toBe(true);
    await expect(page).toHaveTitle("API fallback");
    expect(reads).toEqual({ theme: 1, scripts: 1, settings: 1 });
    await expect.poll(() => page.evaluate(() => (window as Window & { __fallbackRuns?: number }).__fallbackRuns)).toBe(1);
    expect(await page.evaluate(() => window.__SITE_BOOTSTRAP__)).toBeUndefined();
  });
});
