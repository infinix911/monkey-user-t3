import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheProps, createUserpageWorker, PURGE_PATH } from "../../worker/userpage";
vi.mock("cloudflare:workers", () => ({ WorkerEntrypoint: class {
  constructor(public ctx: unknown, public env: unknown) {}
} }));

const tag = "userpage-test-site:green";
const secret = "test-only-cache-secret-at-least-32-characters";
const render = vi.fn(async (_request: Request) => new Response("<html>Tenant theme</html>", { headers: { "Content-Type": "text/html", "X-Userpage-Cache-Tag": tag } }));
const purge = vi.fn(async () => ({ success: true }));
const assets = vi.fn(async () => new Response("asset", { status: 200 }));
const worker = createUserpageWorker({ fetch: render });
const env = { ASSETS: { fetch: assets }, USERPAGE_CACHE_PURGE_SECRET: secret };
let props: unknown;
const shell = Object.assign((options: { props: unknown }) => {
  props = options.props;
  return { fetch: () => new worker.Shell({ props, cache: { purge } } as never, env as never).fetch() };
}, { purge: (value: string) => new worker.Shell({ cache: { purge } } as never, env as never).purge(value) });
const ctx = { exports: { Shell: shell } } as unknown as ExecutionContext;
const request = (path = "/", headers?: HeadersInit, method = "GET") => new Request(`https://play.example.com${path}`, { headers, method });
beforeEach(() => { render.mockClear(); purge.mockClear(); assets.mockClear(); });

describe("public SSR caching", () => {
  it("caches HTML internally for 600 seconds and makes browsers revalidate", async () => {
    const response = await worker.fetch(request("/casino", { Cookie: "bn.session=private; ui_locale=ko", "User-Agent": "Mobile" }), env as never, ctx);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("Cache-Tag")).toBe(tag);
    expect(await response.text()).toContain("Tenant theme");
    const forwarded = render.mock.calls[0]![0] as unknown as Request;
    expect(forwarded.headers.get("Cookie")).toBe("ui_locale=ko");
    expect(forwarded.headers.has("Authorization")).toBe(false);
    expect(props).toEqual({ hostname: "play.example.com", path: "/casino", locale: "ko", mobile: true });
    const inner = await new worker.Shell({ props, cache: { purge } } as never, env as never).fetch();
    expect(inner.headers.get("Cache-Control")).toBe("public, max-age=600");
  });
  it("separates host, route, pagination, locale and device variants", () => {
    const first = cacheProps(request("/hot?page=2"));
    expect(first?.path).toBe("/hot?page=2");
    expect(cacheProps(new Request("https://other.example.com/hot?page=2"))?.hostname).not.toBe(first?.hostname);
    expect(cacheProps(request("/hot?page=1"))?.path).toBe("/hot");
  });
  it.each(["/?themePreview=1", "/?ref=private", "/slot/GAME_123", "/hot?page=0", "/hot?page=2&page=3"])("bypasses cache for %s", (path) => expect(cacheProps(request(path))).toBeNull());
  it("bypasses cache with Authorization", () => expect(cacheProps(request("/", { Authorization: "Bearer private" }))).toBeNull());
  it.each(["Set-Cookie", "X-Userpage-SSR-Degraded"])("does not cache responses containing %s", async (header) => {
    render.mockResolvedValueOnce(new Response("degraded", { headers: { "Content-Type": "text/html", "X-Userpage-Cache-Tag": tag, [header]: "1" } }));
    expect((await worker.fetch(request(), env as never, ctx)).headers.get("Cache-Control")).toBe("no-store");
  });
  it("does not cache unknown tenants, private responses or errors", async () => {
    for (const response of [new Response("unknown", { headers: { "Content-Type": "text/html" } }), new Response("private", { headers: { "Content-Type": "text/html", "X-Userpage-Cache-Tag": tag, "Cache-Control": "private" } }), new Response("error", { status: 503 })]) {
      render.mockResolvedValueOnce(response);
      expect((await worker.fetch(request(), env as never, ctx)).headers.get("Cache-Control")).toBe("no-store");
    }
  });
  it("preserves assets and HEAD behavior", async () => {
    expect(await (await worker.fetch(request("/_nuxt/app.js"), env as never, ctx)).text()).toBe("asset");
    expect(await (await worker.fetch(request("/casino", undefined, "HEAD"), env as never, ctx)).text()).toBe("");
  });
  it("purges tags in the cache-owning entrypoint only with the bearer secret", async () => {
    const body = JSON.stringify({ tag });
    const make = (authorization: string) => new Request(`https://play.example.com${PURGE_PATH}`, { method: "POST", headers: { Authorization: authorization }, body });
    expect((await worker.fetch(make("Bearer wrong"), env as never, ctx)).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
    expect(await (await worker.fetch(make(`Bearer ${secret}`), env as never, ctx)).json()).toEqual({ success: true });
    expect(purge).toHaveBeenCalledWith({ tags: [tag] });
  });
  it("rejects oversized and invalid purge payloads", async () => {
    for (const body of [JSON.stringify({ tag, extra: true }), "x".repeat(1025)]) {
      const response = await worker.fetch(new Request(`https://play.example.com${PURGE_PATH}`, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body }), env as never, ctx);
      expect(response.status).toBe(400);
    }
    expect(purge).not.toHaveBeenCalled();
  });
});
