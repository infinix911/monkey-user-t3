import { WorkerEntrypoint } from "cloudflare:workers";

export interface Env {
  ASSETS: Fetcher;
  USERPAGE_CACHE_PURGE_SECRET?: string;
  NUXT_ALLOWED_HOSTS?: string;
}
export interface Renderer {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
}
interface ShellProps { hostname: string; path: string; locale: string; mobile: boolean }
interface ShellBinding { fetch(request: Request): Promise<Response>; purge(tag: string): Promise<boolean> }
type ShellExport = ((options: { props: ShellProps }) => ShellBinding) & Pick<ShellBinding, "purge">;
const shellExport = (ctx: ExecutionContext) => (ctx.exports as unknown as { Shell: ShellExport }).Shell;
export const PURGE_PATH = "/__internal/userpage-cache/purge";
const CACHE_TAG = /^userpage-[a-z0-9][a-z0-9-]{0,62}:[a-z0-9][a-z0-9-]{0,63}$/;
const PUBLIC_PATHS = new Set(["/", "/hot", "/slots", "/casino", "/sports", "/mini", "/fishing", "/virtual", "/promotions", "/activity"]);

export function validHostname(host: string): boolean {
  return host.length <= 253 && host.includes(".") && !/^[\d.]+$/.test(host)
    && host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

/** Every input that changes public SSR output is part of the entrypoint cache key. */
export function cacheProps(request: Request): ShellProps | null {
  const url = new URL(request.url);
  if (!validHostname(url.hostname) || request.headers.has("Authorization")) return null;
  if (!PUBLIC_PATHS.has(url.pathname) && !/^\/lobbies\/[^/]{1,128}\/games$/.test(url.pathname)) return null;
  const entries = [...url.searchParams];
  if (entries.length > 1 || entries.some(([key]) => key !== "page")) return null;
  const page = url.searchParams.get("page");
  if (page !== null && (!/^[1-9][0-9]{0,5}$/.test(page) || url.pathname !== "/hot" && !url.pathname.startsWith("/lobbies/"))) return null;
  return {
    hostname: url.hostname,
    path: url.pathname + (page && page !== "1" ? `?page=${page}` : ""),
    locale: request.headers.get("Cookie")?.match(/(?:^|;\s*)ui_locale=(en|ko)(?:;|$)/)?.[1] || "",
    mobile: /Mobi|Android|iPhone|iPad|iPod/i.test(request.headers.get("User-Agent") || ""),
  };
}

function noStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  headers.delete("Cache-Tag");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function unavailable(): Response {
  return noStore(new Response("Temporarily unavailable. Please reload to try again.", { status: 503 }));
}

function renderRequest(url: URL, locale: string, mobile: boolean): Request {
  const headers = new Headers({ Host: url.host, "X-Forwarded-Proto": url.protocol.slice(0, -1), Accept: "text/html", "User-Agent": mobile ? "Mobile" : "Desktop" });
  if (locale) headers.set("Cookie", `ui_locale=${locale}`);
  return new Request(url, { headers });
}

/** Stream only a bounded purge payload; never log the bearer secret. */
async function purgeRequest(request: Request, env: Env, purge: (tag: string) => Promise<boolean>): Promise<Response> {
  const reply = (message: string, status: number) => noStore(Response.json({ message }, { status }));
  if (request.method !== "POST") return reply("Method not allowed", 405);
  const secret = env.USERPAGE_CACHE_PURGE_SECRET;
  const bearer = request.headers.get("Authorization") || "";
  if (!secret || secret.length < 32 || !bearer.startsWith("Bearer ") || bearer.length > 4096) return reply("Unauthorized", 401);
  const digest = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [actual, expected] = await Promise.all([digest(bearer.slice(7)), digest(secret)]);
  const a = new Uint8Array(actual), b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
  if (difference) return reply("Unauthorized", 401);
  try {
    const reader = request.body?.getReader();
    let text = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024) { await reader.cancel(); return reply("Invalid purge payload", 400); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !("tag" in body) || typeof body.tag !== "string" || !CACHE_TAG.test(body.tag)) return reply("Invalid purge payload", 400);
    if (!await purge(body.tag)) return reply("Cache purge failed", 503);
    return noStore(Response.json({ success: true }));
  } catch { return reply("Cache purge failed", 503); }
}

/** The renderer is shared code; every tenant value stays in request-scoped props. */
export function createUserpageWorker(renderer: Renderer) {
  class Shell extends WorkerEntrypoint<Env, ShellProps> {
    async fetch(): Promise<Response> {
      const props = this.ctx.props;
      if (!props || !validHostname(props.hostname) || !props.path.startsWith("/") || props.path.startsWith("//")) return unavailable();
      try {
        const response = await renderer.fetch(renderRequest(new URL(`https://${props.hostname}${props.path}`), props.locale, props.mobile), this.env, this.ctx);
        const tag = response.headers.get("X-Userpage-Cache-Tag") || "";
        if (response.status !== 200 || !response.headers.get("Content-Type")?.includes("text/html") || !CACHE_TAG.test(tag) || response.headers.has("Set-Cookie") || response.headers.has("X-Userpage-SSR-Degraded") || /(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get("Cache-Control") || "")) return noStore(response);
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "public, max-age=600");
        headers.delete("Cloudflare-CDN-Cache-Control");
        headers.set("Cache-Tag", tag);
        return new Response(response.body, { status: response.status, headers });
      } catch { return unavailable(); }
    }
    async purge(tag: string): Promise<boolean> {
      return CACHE_TAG.test(tag) && !!this.ctx.cache && (await this.ctx.cache.purge({ tags: [tag] })).success;
    }
  }

  return {
    Shell,
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === PURGE_PATH) return purgeRequest(request, env, (tag) => shellExport(ctx).purge(tag));
      if (!["GET", "HEAD"].includes(request.method) || request.headers.has("Upgrade") || (url.pathname.includes(".") || /^\/(?:_nuxt|_fonts|fonts|designs|api|__internal)(?:\/|$)/.test(url.pathname)) && !url.pathname.startsWith("/_i18n/")) return env.ASSETS.fetch(request);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (!local && !validHostname(url.hostname)) return unavailable();
      const allowed = (env.NUXT_ALLOWED_HOSTS || "").split(",").map((host) => host.trim()).filter(Boolean);
      if (!local && allowed.length && !allowed.includes(url.host)) return noStore(new Response("Unknown host", { status: 403 }));
      let response: Response;
      try {
        const props = cacheProps(request);
        response = props
          ? await shellExport(ctx)({ props }).fetch(new Request(`https://userpage.internal/ssr-v1${props.path}`))
          : noStore(await renderer.fetch(renderRequest(url, request.headers.get("Cookie")?.match(/(?:^|;\s*)ui_locale=(en|ko)(?:;|$)/)?.[1] || "", /Mobi|Android|iPhone|iPad|iPod/i.test(request.headers.get("User-Agent") || "")), env, ctx));
      } catch { return unavailable(); }
      const headers = new Headers(response.headers);
      if (headers.get("Cache-Control") === "public, max-age=600") headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      headers.delete("X-Userpage-Cache-Tag");
      headers.delete("X-Userpage-SSR-Degraded");
      return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers });
    },
  };
}
