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
 * Scripts are loaded through the public CMS endpoint once per app session.
 */

import { logger } from "~/utils/logger";
import { useApi } from "@/composables/useApi";
import { useSiteStore, type CustomScriptEntry } from "@/stores/site";
import { escapeInlineScript } from "~~/shared/utils/secure-serialization";
import { extractScriptBodies } from "~~/shared/utils/theme-utils";
import type { ResolvableScript } from "@unhead/vue";

/** Load once after mount. */
export async function fetchCustomScripts(): Promise<CustomScriptEntry[]> {
  const siteStore = useSiteStore();
  if (siteStore.customScriptsLoaded) return siteStore.customScripts;

  const api = useApi();
  try {
    const res = await api<CustomScriptEntry[] | { data: CustomScriptEntry[] }>(
      "/site/custom-scripts",
      { timeout: 10000 },
    );
    const list = Array.isArray(res)
      ? res
      : ((res as { data?: CustomScriptEntry[] })?.data ?? []);
    siteStore.setCustomScripts(Array.isArray(list) ? list : []);
    return siteStore.customScripts;
  } catch (err) {
    logger.error("[customScripts] fetch failed:", err);
    // A failed CMS request is still settled; without this app navigation would
    // retry indefinitely and duplicate error noise.
    siteStore.setCustomScripts([]);
    return [];
  }
}

/** Reactive consumer — returns Unhead-ready script entries. */
export function useCustomScripts() {
  const siteStore = useSiteStore();

  const tags = computed<{ script: ResolvableScript[] }>(() => {
    const out: { script: ResolvableScript[] } = { script: [] };
    if (!Array.isArray(siteStore.customScripts)) return out;

    for (const entry of siteStore.customScripts) {
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
