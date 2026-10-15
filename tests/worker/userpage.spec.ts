import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import worker, { Shell, bootstrapMarkup, normalizeHostname, purgeRequest, generateShell } from "../../worker/userpage";
import { extractScriptBodies, isUserpageBootstrap, isUserpageDomainRecord, type UserpageBootstrap } from "../../shared/utils/userpage-bootstrap";

vi.mock("cloudflare:workers", () => ({ WorkerEntrypoint: class { constructor(public ctx: unknown, public env: unknown) {} } }));

const snapshot = (siteCode = "luckylah"): UserpageBootstrap => ({
  version: "123", updatedAt: "2026-10-07T12:00:00.000Z", siteCode,
  theme: { identity: { documentTitle: `${siteCode} <title>`, siteName: "Name", favicon: "http://cdn.example/icon.png", appleTouchIcon: "/apple.png" } },
  customScripts: [{ id: 1, title: 'Trace "<>', script: '<script>window.first=1;</script><script>window.second=2;</script>' }, { id: 2, title: "Plain", script: 'window.third=3;' }],
});
const sourceHtml = '<!DOCTYPE html><html><head><title>Static</title><link rel="icon" href="/old.png"><script>window.prefetch=1;</script></head><body><div id="__nuxt"></div></body></html>';
let mf: Miniflare;

beforeAll(async () => {
  const bundle = await build({ entryPoints: ["index.js"], bundle: true, write: false, format: "esm", platform: "browser", external: ["cloudflare:workers"] });
  mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: bundle.outputFiles[0]!.text,
    compatibilityDate: "2026-09-01",
    kvNamespaces: ["USERPAGE_CONFIG"],
    bindings: { USERPAGE_CACHE_PURGE_SECRET: "test-secret-for-userpage-purge-123456" },
    serviceBindings: { ASSETS: (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/missing.js" || path === "/client.route" || path === "/client.route/nested") return new Response("missing", { status: 404 });
      return new Response(path === "/index.html" ? sourceHtml : "asset", { headers: { "Content-Type": path === "/index.html" ? "text/html" : "text/javascript", "ETag": "static" } });
    } },
  }));
  const kv = await mf.getKVNamespace("USERPAGE_CONFIG");
  await kv.put("domain:luckylah222.com", JSON.stringify({publisherId: "lucky-admin", siteCode: "luckylah"}));
  await kv.put("domain:greenxxxx.com", JSON.stringify({publisherId: "green-admin", siteCode: "green"}));
  await kv.put("bootstrap:luckylah", JSON.stringify(snapshot()));
  await kv.put("bootstrap:green", JSON.stringify(snapshot("green")));
});
afterAll(async () => { await mf?.dispose(); });

describe("public Worker shell using real HTMLRewriter", () => {
  it("prepends bootstrap and ordered inline scripts before static scripts", async () => {
    const response = await mf.dispatchFetch("https://luckylah222.com/");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('id="site-bootstrap"');
    expect(html.indexOf('id="site-bootstrap"')).toBeLessThan(html.indexOf("window.prefetch"));
    expect(html.indexOf("window.first=1")).toBeLessThan(html.indexOf("window.second=2"));
    expect(html.indexOf("window.second=2")).toBeLessThan(html.indexOf("window.third=3"));
    expect(html).toContain('data-cms-title="Trace &quot;&lt;&gt;"');
    expect(html).toContain('<title>luckylah &lt;title&gt;</title>');
    expect(html).toContain('href="https://cdn.example/icon.png"');
    expect(html).toContain('href="/apple.png"');
    expect(html).not.toContain('/old.png');
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe("public, max-age=300");
    expect(response.headers.get("Cache-Tag")).toBe("userpage-shell,userpage-site-luckylah");
    expect(response.headers.has("ETag")).toBe(false);
  });

  it("preserves CMS-only icons without inventing missing static fallback assets", async () => {
    const kv = await mf.getKVNamespace("USERPAGE_CONFIG");
    const fixture = snapshot("iconless");
    fixture.theme = null;
    await kv.put("domain:iconless.example.com", JSON.stringify({publisherId: "icons-admin", siteCode: "iconless"}));
    await kv.put("bootstrap:iconless", JSON.stringify(fixture));
    const html = await (await mf.dispatchFetch("https://iconless.example.com/")).text();
    expect(html).not.toContain('rel="icon"');
    expect(html).not.toContain('rel="apple-touch-icon"');
    expect(html).not.toContain('/favicon.png');
    expect(html).not.toContain('/apple-touch-icon.png');

    fixture.theme = {identity: {favicon: "https://cdn.example/favicon.png"}};
    await kv.put("bootstrap:iconless", JSON.stringify(fixture));
    const withIcon = await (await mf.dispatchFetch("https://iconless.example.com/")).text();
    expect(withIcon).toContain('rel="icon" type="image/png" href="https://cdn.example/favicon.png"');
    expect(withIcon).toContain('rel="apple-touch-icon" sizes="180x180" href="https://cdn.example/favicon.png"');
  });

  it("returns one tenant shell for Vue routes and isolates tenants", async () => {
    const a = await (await mf.dispatchFetch("https://luckylah222.com/casino?siteCode=green")).text();
    const b = await (await mf.dispatchFetch("https://greenxxxx.com/login")).text();
    expect(a).toContain('"siteCode":"luckylah"');
    expect(a).not.toContain('"siteCode":"green"');
    expect(b).toContain('"siteCode":"green"');
  });

  it("resolves the longest parent mapping only at a DNS label boundary", async () => {
    const kv = await mf.getKVNamespace("USERPAGE_CONFIG");
    await kv.put("domain:vip.luckylah222.com", JSON.stringify({publisherId: "green-admin", siteCode: "green"}));
    expect(await (await mf.dispatchFetch("https://play.vip.luckylah222.com/")).text()).toContain('"siteCode":"green"');
    expect(await (await mf.dispatchFetch("https://play.luckylah222.com/")).text()).toContain('"siteCode":"luckylah"');
    expect(await (await mf.dispatchFetch("https://evilluckylah222.com/")).text()).toBe(sourceHtml);
  });

  it.each(["https://unknown.com/", "https://luckylah222.com/?themePreview=1", "http://localhost/", "http://127.0.0.1/"])("returns uncached static fallback for %s", async (url) => {
    const response = await mf.dispatchFetch(url);
    expect(await response.text()).toBe(sourceHtml);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each(["/_nuxt/app.js", "/fonts/font.woff2", "/designs/image.webp"])("serves assets without bootstrap: %s", async (path) => {
    const response = await mf.dispatchFetch(`https://luckylah222.com${path}`);
    expect(await response.text()).toBe("asset");
  });

  it.each(["/missing.js", "/client.route", "/client.route/nested"])("preserves uncached static fallback for ASSETS 404: %s", async (path) => {
    const response = await mf.dispatchFetch(`https://luckylah222.com${path}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(sourceHtml);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("HEAD has the same shell headers and an empty body", async () => {
    const response = await mf.dispatchFetch("https://luckylah222.com/login", { method: "HEAD" });
    expect(response.headers.get("Cache-Tag")).toBe("userpage-shell,userpage-site-luckylah");
    expect(await response.text()).toBe("");
  });
});

describe("KV failure isolation and quota", () => {
  const assets = { fetch: vi.fn(async () => new Response(sourceHtml)) };
  const request = new Request("https://internal/index.html");
  it("uses at most the mapping and one group read, with built-in TTL", async () => {
    const get = vi.fn().mockResolvedValueOnce({publisherId: "lucky-admin", siteCode: "luckylah"}).mockResolvedValueOnce({ ...snapshot(), siteCode: "green" });
    const response = await generateShell(request, { ASSETS: assets, USERPAGE_CONFIG: { get } } as never, "luckylah222.com");
    expect(await response.text()).toBe(sourceHtml);
    expect(get.mock.calls).toEqual([["domain:luckylah222.com", { type: "json", cacheTtl: 60 }], ["bootstrap:luckylah", { type: "json", cacheTtl: 60 }]]);
  });
  it.each([null, {publisherId: "lucky-admin", siteCode: "../../secret"}, {publisherId: "../evil", siteCode: "luckylah"}, {}, []])("does not form arbitrary keys from malformed mapping %j", async (groups) => {
    const get = vi.fn().mockResolvedValue(groups);
    expect(await (await generateShell(request, { ASSETS: assets, USERPAGE_CONFIG: { get } } as never, "luckylah222.com")).text()).toBe(sourceHtml);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("inherits the nearest configured parent and never reads single-label or legacy keys", async () => {
    const get = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({publisherId: "green-admin", siteCode: "green"}).mockResolvedValueOnce(snapshot("green"));
    await generateShell(request, {ASSETS: assets, USERPAGE_CONFIG: {get}} as never, "play.vip.luckylah222.com");
    expect(get.mock.calls.map(([key]) => key)).toEqual(["domain:play.vip.luckylah222.com", "domain:vip.luckylah222.com", "bootstrap:green"]);
    const missing = vi.fn().mockResolvedValue(null);
    await generateShell(request, {ASSETS: assets, USERPAGE_CONFIG: {get: missing}} as never, "unknown.example.com");
    expect(missing.mock.calls.map(([key]) => key)).toEqual(["domain:unknown.example.com", "domain:example.com"]);
  });
  it("rejects malformed closer records without selecting a valid parent", async () => {
    const get = vi.fn().mockResolvedValueOnce({siteCode: "luckylah"}).mockResolvedValueOnce({publisherId: "green-admin", siteCode: "green"});
    expect(await (await generateShell(request, {ASSETS: assets, USERPAGE_CONFIG: {get}} as never, "play.luckylah222.com")).text()).toBe(sourceHtml);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("falls back when KV errors, binding is absent, or shell sets cookies", async () => {
    const get = vi.fn().mockRejectedValue(new Error("KV unavailable"));
    for (const env of [{ ASSETS: assets }, { ASSETS: assets, USERPAGE_CONFIG: { get } }, { ASSETS: { fetch: async () => new Response(sourceHtml, { headers: { "Set-Cookie": "private=1" } }) }, USERPAGE_CONFIG: { get } }]) {
      const response = await generateShell(request, env as never, "luckylah222.com");
      expect(await response.text()).toBe(sourceHtml);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });
  it("catches asynchronous rewriter failures and preserves the original static body", async () => {
    class FailingRewriter {
      on() { return this; }
      transform() { return new Response(new ReadableStream({ start(controller) { controller.error(new Error("rewriter stream failed")); } })); }
    }
    vi.stubGlobal("HTMLRewriter", FailingRewriter);
    const get = vi.fn().mockResolvedValueOnce({publisherId: "lucky-admin", siteCode: "luckylah"}).mockResolvedValueOnce(snapshot());
    const response = await generateShell(request, { ASSETS: assets, USERPAGE_CONFIG: { get } } as never, "luckylah222.com");
    expect(await response.text()).toBe(sourceHtml);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    vi.unstubAllGlobals();
  });
  it.each(["private", "no-store"])("does not cache a source with %s", async (directive) => {
    const get = vi.fn();
    const response = await generateShell(request, { ASSETS: { fetch: async () => new Response(sourceHtml, { headers: { "Cache-Control": directive } }) }, USERPAGE_CONFIG: { get } } as never, "luckylah222.com");
    expect(await response.text()).toBe(sourceHtml);
    expect(get).not.toHaveBeenCalled();
  });
});

describe("safe serialization and identical parsing", () => {
  it("escapes JSON breakout and trace attributes without changing snapshot data", () => {
    const data = snapshot();
    data.theme = { text: '</script><script>evil()</script>\u2028\u2029' };
    data.customScripts = [{ id: 1, title: '"><img onerror=bad()>', script: 'window.x="</script>";' }];
    const markup = bootstrapMarkup(data);
    const serialized = markup.match(/window\.__SITE_BOOTSTRAP__=([\s\S]*?);<\/script>/)![1]!;
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized).theme).toEqual(data.theme);
    expect(markup).not.toContain('<img onerror');
    expect(markup).toContain('window.x="<\\/script>";');
  });
  it("matches existing inline-only script semantics", () => {
    expect(extractScriptBodies('<script src="https://x"></script><script> a(); </script>')).toEqual(["a();"]);
    expect(extractScriptBodies(' plain(); ')).toEqual(["plain();"]);
    expect(extractScriptBodies('')).toEqual([]);
  });
  it("validates independently published hostname records", () => {
    expect(isUserpageDomainRecord({publisherId: "lucky-admin", siteCode: "luckylah"})).toBe(true);
    for (const value of [null, [], "luckylah", {}, {publisherId: "../admin", siteCode: "luckylah"}, {publisherId: "admin", siteCode: "UPPER"}]) expect(isUserpageDomainRecord(value)).toBe(false);
  });
  it("rejects malformed snapshots and recursively dangerous merge keys", () => {
    expect(isUserpageBootstrap({ ...snapshot(), theme: null })).toBe(true);
    expect(isUserpageBootstrap({ ...snapshot(), theme: [] })).toBe(false);
    expect(isUserpageBootstrap({ ...snapshot(), version: "" })).toBe(false);
    expect(isUserpageBootstrap({ ...snapshot(), theme: JSON.parse('{"identity":{"__proto__":{"polluted":true}}}') })).toBe(false);
  });
  it("normalizes hostnames without accepting headers, ports or paths", () => {
    expect(normalizeHostname("LUCKYLAH222.COM.")).toBe("luckylah222.com");
    for (const host of ["a.com,b.com", "a.com:443", "../a.com", "__proto__", "-a.com"]) expect(normalizeHostname(host)).toBeNull();
  });
});

describe("protected internal purge", () => {
  const env = { USERPAGE_CACHE_PURGE_SECRET: "test-secret-for-userpage-purge-123456" } as never;
  function request(body: unknown, token = "test-secret-for-userpage-purge-123456") {
    return new Request("https://luckylah222.com/__internal/userpage-cache/purge", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  }
  it.each(["", "wrong"])("rejects incorrect credentials %s without purging", async (token) => {
    const purge = vi.fn();
    expect((await purgeRequest(request({ all: true }, token), env, purge)).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });
  it.each([[{ siteCode: "luckylah" }, "userpage-site-luckylah"], [{ all: true }, "userpage-shell"]])("purges the expected tag %j", async (body, tag) => {
    const purge = vi.fn().mockResolvedValue(true);
    const response = await purgeRequest(request(body), env, purge);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(purge).toHaveBeenCalledWith([tag]);
  });
  it.each([{ siteCode: "../../x" }, { all: true, siteCode: "green" }, { all: false }, {}])("rejects invalid payload %j", async (body) => {
    const purge = vi.fn();
    expect((await purgeRequest(request(body), env, purge)).status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });
  it("reports purge failure", async () => {
    expect((await purgeRequest(request({ all: true }), env, vi.fn().mockResolvedValue(false))).status).toBe(503);
  });
  it("rejects missing secret, invalid JSON, other methods and oversized streamed input", async () => {
    const purge = vi.fn();
    expect((await purgeRequest(request({ all: true }), {} as never, purge)).status).toBe(401);
    expect((await purgeRequest(request({ all: true }, "short"), { USERPAGE_CACHE_PURGE_SECRET: "short" } as never, purge)).status).toBe(401);
    expect((await purgeRequest(new Request("https://site/purge"), env, purge)).status).toBe(405);
    expect((await purgeRequest(new Request("https://site/purge", { method: "POST", headers: { Authorization: "Bearer test-secret-for-userpage-purge-123456" }, body: "invalid" }), env, purge)).status).toBe(400);
    expect((await purgeRequest(request({ siteCode: "a".repeat(2048) }), env, purge)).status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });
  it("calls purge from the owning Shell entrypoint and checks acceptance", async () => {
    const purge = vi.fn().mockResolvedValue({ success: true });
    expect(await Shell.prototype.purge.call({ ctx: { cache: { purge } } } as never, ["userpage-site-luckylah"])).toBe(true);
    expect(purge).toHaveBeenCalledWith({ tags: ["userpage-site-luckylah"] });
    purge.mockResolvedValue({ success: false });
    expect(await Shell.prototype.purge.call({ ctx: { cache: { purge } } } as never, ["userpage-shell"])).toBe(false);
  });
});

describe("gateway dispatch", () => {
  it.each(["GET", "HEAD"])("returns ASSETS 404 static fallback with zero KV or Shell dispatch for %s", async (method) => {
    const get = vi.fn();
    const fetch = vi.fn().mockResolvedValueOnce(new Response("missing", { status: 404 })).mockResolvedValueOnce(new Response(sourceHtml));
    const shell = vi.fn();
    const response = await worker.fetch(new Request("https://luckylah222.com/client.route", { method }), { ASSETS: { fetch }, USERPAGE_CONFIG: { get } } as never, { exports: { Shell: shell } } as never);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(method === "HEAD" ? "" : sourceHtml);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(get).not.toHaveBeenCalled();
    expect(shell).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["GET", "HEAD"])("returns uncached static HTML after dispatch failure for %s", async (method) => {
    const fetch = vi.fn().mockRejectedValue(new Error("cache dispatch unavailable"));
    const assets = { fetch: vi.fn().mockResolvedValue(new Response(sourceHtml)) };
    const response = await worker.fetch(new Request("https://luckylah222.com/casino", { method }), { ASSETS: assets } as never, { exports: { Shell: vi.fn().mockReturnValue({ fetch }) } } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe(method === "HEAD" ? "" : sourceHtml);
  });
  it("uses normalized hostname props and one canonical shell URL with no browser headers", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("shell"));
    const shell = vi.fn().mockReturnValue({ fetch });
    await worker.fetch(new Request("https://LUCKYLAH222.COM/casino?token=private", { headers: { Cookie: "session=private", Authorization: "Bearer private" } }), {} as never, { exports: { Shell: shell } } as never);
    expect(shell).toHaveBeenCalledWith({ props: { hostname: "luckylah222.com" } });
    const forwarded: Request = fetch.mock.calls[0]![0];
    expect(forwarded.url).toBe("https://userpage.internal/index.html");
    expect([...forwarded.headers]).toEqual([]);
  });
  it("bypasses bootstrap for protocol upgrades", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("asset"));
    const shell = vi.fn();
    await worker.fetch(new Request("https://luckylah222.com/ws", { headers: { Upgrade: "websocket" } }), { ASSETS: { fetch } } as never, { exports: { Shell: shell } } as never);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(shell).not.toHaveBeenCalled();
  });
});
