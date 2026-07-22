/**
 * Custom Scripts
 *
 * Fetches /api/site/custom-scripts (admin CMS — page='customScripts',
 * section='customScripts') and injects each entry's `script` payload into
 * the document <head> on page load.
 *
 * Trust model: admins are trusted; the `script` field is raw HTML that may
 * contain <script>...</script>, inline event handlers, or whatever the admin
 * pastes. We do NOT sandbox or sanitize — same risk profile as a CMS-managed
 * GTM/GA tag. Any restriction belongs in the admin save path, not here.
 *
 * Each entry can be either:
 *   - A full snippet wrapped in <script>…</script> (or multiple tags).
 *     We extract each <script> block and inject its inner JS via Unhead's
 *     `script[].innerHTML` so it actually executes (innerHTML inside a
 *     useHead `style`/`noscript`/raw <div> would not run).
 *   - Plain JS with no tag wrapper. We inject it as innerHTML directly.
 *
 * Lives on its own endpoint (not bundled with /config/userpage) so the
 * payload caches and invalidates independently. Called from app.vue
 * alongside the userpage fetch with useAsyncData so the SSR HTML carries
 * the validated tags on first paint.
 */

import { getApiBase, getHostname, forwardHostHeaders } from "@/lib/domain";
import { withServerCache } from "@/lib/serverCache";
import { escapeInlineScript } from "~~/shared/utils/secure-serialization";
import type { ResolvableScript } from "@unhead/vue";

export interface CustomScriptEntry {
  id: number;
  title: string;
  script: string;
}

/**
 * Splits a raw HTML payload into the JS that should run. Pulls inner JS out
 * of any <script>...</script> wrappers and concatenates them; if the payload
 * has no script tags at all, it's treated as plain JS.
 *
 * Note: this is a best-effort regex parse. Admins who paste `<script src=...>`
 * external tags will not have those scripts injected — only inline content
 * is honored. Add an `external` branch later if the admin UI exposes that.
 */
function extractScriptBodies(raw: string): string[] {
  if (!raw) return [];
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  const bodies: string[] = [];
  let match: RegExpExecArray | null;
  let foundAny = false;
  while ((match = pattern.exec(raw)) !== null) {
    foundAny = true;
    const inner = (match[1] ?? "").trim();
    if (inner) bodies.push(inner);
  }
  if (!foundAny) {
    const trimmed = raw.trim();
    if (trimmed) bodies.push(trimmed);
  }
  return bodies;
}

/** Fetches the raw payload — call from useAsyncData in app.vue. */
export async function fetchCustomScripts(): Promise<CustomScriptEntry[]> {
  const cached = useState<CustomScriptEntry[]>("customScripts", () => []);
  if (cached.value && cached.value.length) return cached.value;

  const apiBase = getApiBase();
  // Forward the visitor's host so the multi-tenant backend returns THIS site's
  // scripts on SSR (direct fetch bypasses the host-setting Nitro proxy).
  const hostHeaders = forwardHostHeaders();
  try {
    // Per-isolate cache (60 s) — see PLAN-PER-ISOLATE-SSR-CACHE.md.
    // Raw $fetch (no cookie forwarded) so the cached response is independent
    // of any user context; this endpoint is public CMS data.
    const list = await withServerCache(
      `custom-scripts:${getHostname()}`,
      60 * 1000,
      async () => {
        const res = await $fetch<
          CustomScriptEntry[] | { data: CustomScriptEntry[] }
        >(`${apiBase}/site/custom-scripts`, {
          timeout: import.meta.server ? 3000 : 10000,
          headers: hostHeaders,
        });
        return Array.isArray(res)
          ? res
          : ((res as { data?: CustomScriptEntry[] })?.data ?? []);
      },
    );
    cached.value = Array.isArray(list) ? list : [];
    return cached.value;
  } catch (err) {
    console.error("[customScripts] fetch failed:", err);
    return [];
  }
}

/** Reactive consumer — returns Unhead-ready script entries. */
export function useCustomScripts() {
  const cached = useState<CustomScriptEntry[]>("customScripts", () => []);

  const tags = computed<{ script: ResolvableScript[] }>(() => {
    const out: { script: ResolvableScript[] } = { script: [] };
    if (!Array.isArray(cached.value)) return out;

    for (const entry of cached.value) {
      if (!entry || !entry.script) continue;
      const bodies = extractScriptBodies(entry.script);
      for (const body of bodies) {
        out.script.push({
          type: "text/javascript",
          innerHTML: escapeInlineScript(body),
          tagPosition: "head",
          // Title is for traceability in DevTools when admins inspect the
          // rendered page; it isn't a real <script> attribute, so namespace
          // it under `data-` to keep validators happy.
          "data-cms-title": entry.title,
          "data-cms-id": String(entry.id),
        });
      }
    }

    return out;
  });

  return { tags };
}
