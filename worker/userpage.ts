import { WorkerEntrypoint } from "cloudflare:workers";
import {
  enforceThemeHttps,
  extractScriptBodies,
  isRecord,
  isUserpageDomainRecord,
  isUserpageBootstrap,
  SITE_CODE_PATTERN,
  type UserpageBootstrap,
} from "../shared/utils/userpage-bootstrap";
import { escapeInlineScript, serializeJsonForHtml } from "../shared/utils/secure-serialization";

export interface Env {
  ASSETS: Fetcher;
  USERPAGE_CONFIG?: KVNamespace;
  USERPAGE_CACHE_PURGE_SECRET?: string;
}

interface ShellProps { hostname: string }
declare global {
  // Cloudflare's runtime uses this namespace to infer ctx.exports bindings.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface GlobalProps { mainModule: typeof import("./userpage") }
  }
}
export const PURGE_PATH = "/__internal/userpage-cache/purge";
const KV_CACHE_TTL = 60;
const SHELL_TTL = 300;

export function normalizeHostname(raw: string): string | null {
  const hostname = raw.toLowerCase().replace(/\.$/, "");
  if (hostname.length > 253 || !/^[a-z0-9.-]+$/.test(hostname)) return null;
  if (hostname.split(".").some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null;
  return hostname;
}

function noStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  headers.delete("Cache-Tag");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function reply(message: string, status: number): Response {
  return noStore(Response.json({ message }, { status }));
}

function isAssetPath(pathname: string): boolean {
  return pathname.includes(".") && pathname !== "/index.html"
    || /^\/(?:_nuxt|_fonts|fonts|designs|api|__internal)(?:\/|$)/.test(pathname);
}

async function staticShell(request: Request, env: Env): Promise<Response> {
  return noStore(await env.ASSETS.fetch(new Request(new URL("/index.html", request.url))));
}

/** Hash both inputs into equal-length buffers before comparing. Never log them. */
async function authorized(request: Request, secret?: string): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const value = request.headers.get("Authorization");
  if (!value?.startsWith("Bearer ") || value.length > 4096) return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(value.slice(7))),
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
  ]);
  const a = new Uint8Array(actual);
  const b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
  return difference === 0;
}

export async function purgeRequest(request: Request, env: Env, purge: (tags: string[]) => Promise<boolean>): Promise<Response> {
  if (request.method !== "POST") return reply("Method not allowed", 405);
  if (!await authorized(request, env.USERPAGE_CACHE_PURGE_SECRET)) return reply("Unauthorized", 401);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) {
          await reader.cancel();
          return reply("Invalid purge payload", 400);
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply("Invalid purge payload", 400);
  }
  try {
    if (!isRecord(body)) return reply("Invalid purge payload", 400);
    const keys = Object.keys(body);
    const tags = keys.length === 1 && body.all === true
      ? ["userpage-shell"]
      : keys.length === 1 && typeof body.siteCode === "string" && SITE_CODE_PATTERN.test(body.siteCode)
        ? [`userpage-site-${body.siteCode}`]
        : null;
    if (!tags) return reply("Invalid purge payload", 400);
    if (!await purge(tags)) return reply("Cache purge failed", 503);
    return noStore(Response.json({ success: true, message: "Cache purged" }));
  } catch {
    return reply("Cache purge failed", 503);
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Only the body-parsing behavior already supported by the browser is emitted. */
export function bootstrapMarkup(bootstrap: UserpageBootstrap): string {
  const snapshot = {
    siteCode: bootstrap.siteCode,
    version: bootstrap.version,
    updatedAt: bootstrap.updatedAt,
    theme: enforceThemeHttps(bootstrap.theme),
    customScripts: bootstrap.customScripts,
    customScriptsInjected: true,
  };
  const scripts = bootstrap.customScripts.flatMap((entry) => extractScriptBodies(entry.script).map((body) =>
    `<script type="text/javascript" data-cms-id="${entry.id}" data-cms-title="${escapeAttribute(entry.title)}">${escapeInlineScript(body)}</script>`));
  return `<script id="site-bootstrap">window.__SITE_BOOTSTRAP__=${serializeJsonForHtml(snapshot)};</script>${scripts.join("")}`;
}

/** Buffer the rewriter stream: failures must return a complete static shell. */
export async function renderShell(source: Response, bootstrap: UserpageBootstrap): Promise<Response> {
  const theme = enforceThemeHttps(bootstrap.theme);
  const identity = isRecord(theme) && isRecord(theme.identity) ? theme.identity : {};
  const title = typeof identity.documentTitle === "string" && identity.documentTitle
    || typeof identity.siteName === "string" && identity.siteName || "";
  const favicon = typeof identity.favicon === "string" ? identity.favicon : "";
  const appleIcon = (typeof identity.appleTouchIcon === "string" ? identity.appleTouchIcon : "") || favicon;
  let headSeen = false;
  let titleSeen = false;
  const rewriter = new HTMLRewriter()
    .on("head", {
      element(element) {
        headSeen = true;
        element.prepend(bootstrapMarkup(bootstrap), { html: true });
        element.onEndTag((end) => {
          const links = `${favicon ? `<link rel="icon" type="image/png" href="${escapeAttribute(favicon)}">` : ""}${appleIcon ? `<link rel="apple-touch-icon" sizes="180x180" href="${escapeAttribute(appleIcon)}">` : ""}`;
          end.before(links, { html: true });
          if (!titleSeen && title) end.before(`<title>${escapeAttribute(title)}</title>`, { html: true });
        });
      },
    })
    .on("title", { element(element) { titleSeen = true; element.setInnerContent(title); } })
    .on('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]', { element(element) { element.remove(); } });
  const html = await rewriter.transform(source).text();
  if (!headSeen) throw new Error("SPA shell has no head");
  const headers = new Headers(source.headers);
  for (const name of ["Content-Length", "Content-Encoding", "ETag", "Last-Modified"]) headers.delete(name);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  headers.set("Cloudflare-CDN-Cache-Control", `public, max-age=${SHELL_TTL}`);
  headers.set("Cache-Tag", `userpage-shell,userpage-site-${bootstrap.siteCode}`);
  return new Response(html, { status: 200, headers });
}

export async function generateShell(request: Request, env: Env, hostname: string): Promise<Response> {
  const source = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
  if (source.status !== 200 || source.headers.has("Set-Cookie") || /(?:^|,)\s*(?:private|no-store)\b/i.test(source.headers.get("Cache-Control") ?? "")) return noStore(source);
  try {
    if (!env.USERPAGE_CONFIG) return noStore(source);
    if (normalizeHostname(hostname) !== hostname) return noStore(source);
    let siteCode: string | undefined;
    const labels = hostname.split(".");
    for (let offset = 0; offset < labels.length - 1; offset++) {
      const domain = labels.slice(offset).join(".");
      const record: unknown = await env.USERPAGE_CONFIG.get(`domain:${domain}`, { type: "json", cacheTtl: KV_CACHE_TTL });
      if (record === null) continue;
      // An invalid closer mapping must not silently select a different design.
      if (!isUserpageDomainRecord(record)) return noStore(source);
      siteCode = record.siteCode;
      break;
    }
    if (!siteCode) return noStore(source);
    const bootstrap: unknown = await env.USERPAGE_CONFIG.get(`bootstrap:${siteCode}`, { type: "json", cacheTtl: KV_CACHE_TTL });
    if (!isUserpageBootstrap(bootstrap, siteCode)) return noStore(source);
    return await renderShell(source.clone(), bootstrap);
  } catch {
    console.warn(JSON.stringify({ event: "userpage_bootstrap_fallback", hostname }));
    return noStore(source);
  }
}

/** Cache is owned by this entrypoint; hostname props are part of its cache key. */
export class Shell extends WorkerEntrypoint<Env, ShellProps> {
  async fetch(request: Request): Promise<Response> {
    const hostname = this.ctx.props.hostname;
    if (!hostname || normalizeHostname(hostname) !== hostname) return staticShell(request, this.env);
    return generateShell(request, this.env, hostname);
  }

  async purge(tags: string[]): Promise<boolean> {
    if (!tags.length || tags.some((tag) => tag !== "userpage-shell" && !/^userpage-site-[a-z0-9][a-z0-9-]{0,63}$/.test(tag))) return false;
    if (!this.ctx.cache) return false;
    const result = await this.ctx.cache.purge({ tags });
    return result.success;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === PURGE_PATH) {
      return purgeRequest(request, env, (tags) => ctx.exports.Shell.purge(tags));
    }
    if (request.method !== "GET" && request.method !== "HEAD" || request.headers.has("Upgrade")) return env.ASSETS.fetch(request);
    if (isAssetPath(url.pathname)) {
      const asset = await env.ASSETS.fetch(request);
      // Preserve the original Worker fallback for missing files/dotted routes,
      // while keeping every asset request out of tenant bootstrap and KV.
      const response = asset.status === 404 ? await staticShell(request, env) : asset;
      return request.method === "HEAD" ? new Response(null, response) : response;
    }
    const hostname = normalizeHostname(url.hostname);
    if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || url.searchParams.get("themePreview") === "1") {
      const response = await staticShell(request, env);
      return request.method === "HEAD" ? new Response(null, response) : response;
    }
    const forwarded = new Request("https://userpage.internal/index.html");
    let response: Response;
    try {
      response = await ctx.exports.Shell({ props: { hostname } }).fetch(forwarded);
    } catch {
      console.warn(JSON.stringify({ event: "userpage_shell_dispatch_fallback", hostname }));
      response = await staticShell(request, env);
    }
    return request.method === "HEAD" ? new Response(null, response) : response;
  },
};
