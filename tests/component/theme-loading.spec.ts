import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { fetchSiteConfig } from "@/lib/siteConfig";
import { fetchThemeDoc } from "@/composables/useThemeDoc";
import { fetchCustomScripts, useCustomScripts } from "@/composables/useCustomScripts";
import { useSiteStore } from "@/stores/site";
import { extractScriptBodies, enforceThemeHttps } from "~~/shared/utils/theme-utils";
import { mergeSiteConfig } from "@/composables/useSiteConfig";

const { states, api, publicFetch  } = vi.hoisted(() => ({ states: new Map(), api: vi.fn(), publicFetch: vi.fn()  }));

mockNuxtImport("useState", () => (key: string, init?: () => unknown) => {
  if (!states.has(key)) states.set(key, ref(init?.()));
  return states.get(key);
});
mockNuxtImport("$fetch", () => publicFetch);
vi.mock("@/composables/useApi", () => ({ useApi: () => api }));
vi.mock("@/lib/domain", () => ({ getApiBase: () => "https://uapi.example.com/api" }));

const theme = { identity: { siteName: "Tenant", favicon: "http://cdn.example/icon.png" } };
const scripts = [{ id: 1, title: "Counter", script: "window.executions++;" }];

beforeEach(() => {
  states.clear();

  api.mockReset();
  publicFetch.mockReset();
  vi.stubGlobal("$fetch", publicFetch);
  setActivePinia(createPinia());
  window.history.replaceState(null, "", "/");
  localStorage.clear();
});

describe("API theme loading", () => {
  it("preserves script order and filters unsafe theme keys", () => {
    expect(extractScriptBodies('<script>first();</script><script src="external.js"></script><script>second();</script>')).toEqual(["first();", "second();"]);
    expect(extractScriptBodies("plain();")).toEqual(["plain();"]);
    const cleaned = enforceThemeHttps(JSON.parse('{"links":["http://cdn.example/a",null],"__proto__":{"polluted":true}}'));
    expect(cleaned).toEqual({ links: ["https://cdn.example/a", null] });
    expect(Object.getPrototypeOf(cleaned)).toBe(Object.prototype);
  });
  it("loads the theme and upgrades mixed-content URLs", async () => {
    api.mockResolvedValue(theme);
    expect(await fetchSiteConfig()).toEqual({ identity: { siteName: "Tenant", favicon: "https://cdn.example/icon.png" } });
    expect(api).toHaveBeenCalledWith("/site/config/theme", { timeout: 10000 });
    await fetchSiteConfig();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("treats a null SSR document as loaded defaults without a duplicate hydration read", async () => {
    api.mockResolvedValueOnce(null);
    expect(await fetchSiteConfig()).toBeNull();
    expect(states.get("siteConfigError").value).toBeNull();
    await fetchSiteConfig();
    expect(api).toHaveBeenCalledTimes(1);
    expect(states.get("userPageConfig").value).toBeNull();
  });

  it("recovers on a later fetch after a failed request", async () => {
    api.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(theme);
    expect(await fetchSiteConfig({ maxRetries: 1 })).toBeNull();
    expect(states.get("siteConfigError").value).toBeTruthy();
    await fetchSiteConfig({ maxRetries: 1 });
    expect(states.get("siteConfigError").value).toBeNull();
    expect(states.get("userPageConfig").value.identity.siteName).toBe("Tenant");
  });

  it("requests the preview document without warming the normal cache", async () => {
    window.history.replaceState(null, "", "/?themePreview=1");
    api.mockResolvedValue(theme);
    await fetchSiteConfig();
    expect(await fetchThemeDoc()).toBe(true);
    expect(api).toHaveBeenCalledWith("/site/config/theme?domain=preview", { timeout: 10000 });
    expect(api).toHaveBeenCalledWith("/site/config/theme?domain=preview", { timeout: 5000 });
    expect(localStorage.length).toBe(0);
  });

  it("loads scripts once and retains them across member-data clearing", async () => {
    api.mockResolvedValue(scripts);
    await fetchCustomScripts();
    const store = useSiteStore();
    store.clear();
    await fetchCustomScripts();
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith("/site/custom-scripts", { timeout: 10000 });
    expect(useCustomScripts().tags.value.script).toHaveLength(1);
    expect(store.customScripts).toEqual(scripts);
  });

  it("settles failed script loads without repeated requests", async () => {
    api.mockRejectedValue(new Error("offline"));
    expect(await fetchCustomScripts()).toEqual([]);
    expect(await fetchCustomScripts()).toEqual([]);
    expect(api).toHaveBeenCalledTimes(1);
    expect(useCustomScripts().tags.value.script).toEqual([]);
  });

  it("prevents prototype mutation while merging theme values", () => {
    const merged = mergeSiteConfig({ identity: {} }, JSON.parse('{"identity":{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}}'));
    expect(Object.getPrototypeOf(merged.identity)).toBe(Object.prototype);
    expect((merged.identity as Record<string, unknown>).polluted).toBeUndefined();
  });

});
