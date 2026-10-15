import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { runInNewContext } from "node:vm";
import { applySiteBootstrap } from "@/lib/site-bootstrap";
import { fetchSiteConfig } from "@/lib/siteConfig";
import { buildThemePrefetchScript } from "@/lib/theme-prefetch";
import { fetchCustomScripts, useCustomScripts } from "@/composables/useCustomScripts";
import { fetchThemeDoc } from "@/composables/useThemeDoc";
import { fetchSiteSettings } from "@/composables/useSiteSettings";
import { useSiteStore } from "@/stores/site";
import { mergeSiteConfig, useSiteConfig, useSiteConfigState } from "@/composables/useSiteConfig";
import type { WindowSiteBootstrap } from "~~/shared/utils/userpage-bootstrap";

const { states, api, publicFetch } = vi.hoisted(() => ({ states: new Map(), api: vi.fn(), publicFetch: vi.fn() }));
mockNuxtImport("useState", () => (key: string, init?: () => unknown) => {
  if (!states.has(key)) states.set(key, ref(init?.()));
  return states.get(key);
});
mockNuxtImport("$fetch", () => publicFetch);
vi.mock("@/composables/useApi", () => ({ useApi: () => api }));
vi.mock("@/lib/domain", () => ({ getApiBase: () => "https://uapi.example.com/api" }));

const bootstrap = (): WindowSiteBootstrap => ({
  version: "content-hash", updatedAt: "2026-10-07T12:00:00Z", siteCode: "luckylah",
  theme: { identity: { siteName: "Tenant", favicon: "http://cdn.example/icon.png" } },
  customScripts: [{ id: 1, title: "Counter", script: "window.executions++;" }],
  customScriptsInjected: true,
});

beforeEach(() => {
  states.clear();
  api.mockReset();
  publicFetch.mockReset();
  vi.stubGlobal("$fetch", publicFetch);
  setActivePinia(createPinia());
  window.history.replaceState(null, "", "/");
  delete window.__SITE_BOOTSTRAP__;
  localStorage.clear();
});

describe("early client bootstrap hydration", () => {
  it("synchronously seeds raw and effective theme, scripts and warm cache before rendering", async () => {
    window.__SITE_BOOTSTRAP__ = bootstrap();
    expect(applySiteBootstrap()).toBe(true);
    expect(states.get("userPageConfig").value.identity.siteName).toBe("Tenant");
    expect(useSiteConfig().identity.favicon).toBe("https://cdn.example/icon.png");
    expect(useSiteStore().customScriptsLoaded).toBe(true);
    expect(useSiteStore().customScripts).toEqual(bootstrap().customScripts);
    expect(JSON.parse(localStorage.getItem(`themeConfig.v2:${window.location.hostname}`)!).identity.siteName).toBe("Tenant");
    await fetchSiteConfig();
    expect(await fetchThemeDoc()).toBe(true);
    await fetchCustomScripts();
    expect(api).not.toHaveBeenCalled();
    expect(publicFetch).not.toHaveBeenCalled();
    expect(useCustomScripts().tags.value.script).toEqual([]);
  });

  it("treats a null published theme as loaded defaults and removes stale warm cache", async () => {
    const state = useSiteConfigState();
    expect(state.isReady.value).toBe(false);
    localStorage.setItem(`themeConfig.v2:${window.location.hostname}`, '{"identity":{"siteName":"Old"}}');
    window.__SITE_BOOTSTRAP__ = { ...bootstrap(), theme: null };
    expect(applySiteBootstrap()).toBe(true);
    expect(state.isReady.value).toBe(true);
    expect(useSiteConfig().identity.siteName).toBe("");
    expect(localStorage.getItem(`themeConfig.v2:${window.location.hostname}`)).toBeNull();
    expect(await fetchSiteConfig()).toBeNull();
    expect(await fetchThemeDoc()).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });

  it("preserves loaded/injected scripts and null-theme readiness when logout clears member site data", async () => {
    window.__SITE_BOOTSTRAP__ = { ...bootstrap(), theme: null };
    applySiteBootstrap();
    const store = useSiteStore();
    store.setSiteSettings({ "site:livechat": "enabled" });
    store.setBankAccounts([{ id: "1", account_name: "Member", bank: "Bank", account_number: "123" }]);
    store.clear();
    expect(store.bankAccounts).toEqual([]);
    expect(store.siteSettings).toBeNull();
    expect(store.customScriptsLoaded).toBe(true);
    expect(store.customScriptsInjected).toBe(true);
    expect(store.customScripts).toEqual(bootstrap().customScripts);
    expect(useSiteConfigState().isReady.value).toBe(true);
    await fetchCustomScripts();
    await fetchSiteConfig();
    expect(publicFetch).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
    expect(useCustomScripts().tags.value.script).toEqual([]);
  });

  it("preserves client-side site settings on a healthy bootstrap", async () => {
    window.__SITE_BOOTSTRAP__ = bootstrap();
    applySiteBootstrap();
    publicFetch.mockResolvedValue([{ key: "site:livechat", value: "enabled" }]);
    expect(await fetchSiteSettings()).toEqual({ "site:livechat": "enabled" });
    expect(publicFetch).toHaveBeenCalledWith("https://uapi.example.com/api/site/settings", { timeout: 10000 });
    expect("siteSettings" in window.__SITE_BOOTSTRAP__).toBe(false);
  });

  it("uses existing API and client script injection when bootstrap is absent", async () => {
    expect(applySiteBootstrap()).toBe(false);
    api.mockResolvedValue(bootstrap().theme);
    publicFetch.mockResolvedValue(bootstrap().customScripts);
    await fetchSiteConfig();
    expect(await fetchThemeDoc()).toBe(true);
    await fetchCustomScripts();
    expect(api).toHaveBeenCalledWith("/site/config/theme", { timeout: 10000 });
    expect(api).toHaveBeenCalledWith("/site/config/theme", { timeout: 5000 });
    expect(publicFetch).toHaveBeenCalledWith("https://uapi.example.com/api/site/custom-scripts", { timeout: 10000 });
    expect(useCustomScripts().tags.value.script).toHaveLength(1);
  });

  it("preloads data but lets the client inject scripts if they were not injected", () => {
    window.__SITE_BOOTSTRAP__ = { ...bootstrap(), customScriptsInjected: false };
    applySiteBootstrap();
    expect(useCustomScripts().tags.value.script).toHaveLength(1);
  });

  it("ignores live bootstrap in preview and requests domain=preview without warming cache", async () => {
    window.history.replaceState(null, "", "/?themePreview=1");
    window.__SITE_BOOTSTRAP__ = bootstrap();
    expect(applySiteBootstrap()).toBe(false);
    api.mockResolvedValue({ identity: { siteName: "Draft" } });
    await fetchSiteConfig();
    expect(await fetchThemeDoc()).toBe(true);
    expect(api).toHaveBeenCalledWith("/site/config/theme?domain=preview", { timeout: 10000 });
    expect(api).toHaveBeenCalledWith("/site/config/theme?domain=preview", { timeout: 5000 });
    expect(localStorage.length).toBe(0);
    expect(useSiteStore().customScriptsLoaded).toBe(false);
  });

  it("rejects malformed window snapshots and prevents prototype mutation", () => {
    window.__SITE_BOOTSTRAP__ = { ...bootstrap(), theme: JSON.parse('{"identity":{"__proto__":{"polluted":true}}}') };
    expect(applySiteBootstrap()).toBe(false);
    const merged = mergeSiteConfig({ identity: {} }, JSON.parse('{"identity":{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}}'));
    expect(Object.getPrototypeOf(merged.identity)).toBe(Object.prototype);
    expect((merged.identity as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("static HTML prefetch guard", () => {
  function prefetch(snapshot?: unknown, search = "") {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const target = { __SITE_BOOTSTRAP__: snapshot };
    runInNewContext(buildThemePrefetchScript("http://localhost:5003/api"), { window: target, location: { hostname: "luckylah222.com", search }, fetch, URLSearchParams });
    return fetch;
  }
  it("does not request the API with a healthy snapshot, including null theme", () => {
    expect(prefetch(bootstrap())).not.toHaveBeenCalled();
    expect(prefetch({ ...bootstrap(), theme: null })).not.toHaveBeenCalled();
  });
  it("preserves prefetch fallback when bootstrap is missing or malformed", () => {
    expect(prefetch()).toHaveBeenCalledTimes(1);
    expect(prefetch({ theme: {} })).toHaveBeenCalledTimes(1);
  });
  it("preserves preview bypass", () => {
    expect(prefetch(undefined, "?themePreview=1")).not.toHaveBeenCalled();
  });
});
