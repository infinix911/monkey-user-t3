import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  proxyRequest,
  getRequestHost,
  getRequestProtocol,
  type H3Event,
} from "h3";

/**
 * Local override for GET /api/site/config/theme.
 *
 * This route is more specific than the catch-all REST proxy
 * (`server/routes/api/[...path].ts`), so Nitro matches it first and the theme
 * document is served from the local file `public/theme.json` instead of being
 * forwarded to NUXT_API_URL. This lets us pin the public site's theme without
 * touching the backend / CMS.
 *
 * The response is the raw parsed contents of `public/theme.json`. `useThemeDoc`
 * accepts either the bare theme document or a `{ data: <doc> }` envelope, so the
 * file may contain whichever shape the backend normally returns.
 *
 * Graceful fallback: while `public/theme.json` is empty, missing, or not valid
 * JSON, the request is transparently proxied to the real backend exactly as the
 * catch-all does — so the site keeps working until the file is populated.
 */

/**
 * Candidate absolute paths for `public/theme.json` across dev and the
 * node-server production output. The first readable, non-empty file wins.
 */
const THEME_FILE_CANDIDATES = [
  resolve(process.cwd(), "public/theme.json"),
  resolve(process.cwd(), ".output/public/theme.json"),
];

/**
 * Read and parse `public/theme.json`.
 *
 * @returns The parsed JSON value, or `null` when the file is absent, empty, or
 *   not valid JSON.
 */
async function readThemeFile(): Promise<unknown | null> {
  for (const path of THEME_FILE_CANDIDATES) {
    let contents: string;
    try {
      contents = await readFile(path, "utf8");
    } catch {
      continue; // Not at this candidate path — try the next.
    }
    const trimmed = contents.trim();
    if (!trimmed) return null; // Empty file — fall back to the proxy.
    try {
      return JSON.parse(trimmed);
    } catch {
      return null; // Malformed JSON — fall back to the proxy.
    }
  }
  return null;
}

/**
 * Forward the current request to the backend REST API, mirroring the catch-all
 * proxy in `server/routes/api/[...path].ts`. Used as the fallback while the
 * local theme file is not usable.
 */
function proxyToBackend(event: H3Event) {
  const cfg = useRuntimeConfig();
  const apiUrl = cfg.apiUrl as string | undefined;

  if (!apiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "NUXT_API_URL is not configured",
    });
  }

  const search = getRequestURL(event).search;
  const target = `${apiUrl.replace(/\/$/, "")}/site/config/theme${search}`;

  return proxyRequest(event, target, {
    sendStream: true,
    cookieDomainRewrite: { "*": "" },
    fetchOptions: { redirect: "manual" },
    headers: {
      "x-forwarded-host": getRequestHost(event, { xForwardedHost: true }),
      "x-forwarded-proto": getRequestProtocol(event, { xForwardedProto: true }),
    },
  });
}

export default defineEventHandler(async (event) => {
  const doc = await readThemeFile();
  if (doc !== null) return doc;
  return proxyToBackend(event);
});
