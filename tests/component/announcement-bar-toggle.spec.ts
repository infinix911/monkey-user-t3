/**
 * Announcement-bar visibility site-config contract.
 *
 * The bar is switched on/off from the admin CMS through the site-config
 * document at `theme.announcement.enabled` — it travels with the rest of the
 * announcement group (text/colours/icon), there is no dedicated endpoint.
 * `useSiteConfig()` deep-merges the CMS payload onto `getDefaultThemeConfig()`
 * and SILENTLY DROPS paths the typed default does not declare, so a rename on
 * either side turns the toggle into a no-op with no error in either repo.
 *
 * These tests pin that contract, the default-when-absent behaviour (visible —
 * every deployment that predates the flag must keep its bar), and the fact that
 * the layout removes the bar with `v-if` rather than hiding it, so nothing of
 * its height is left behind.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDefaultThemeConfig } from "@/composables/useDefaultThemeConfig";
import { mergeSiteConfig } from "@/composables/useSiteConfig";

const defaultLayout = readFileSync(
  resolve(__dirname, "../../app/layouts/default.vue"),
  "utf8",
);

describe("announcement bar visibility site-config contract", () => {
  it("declares theme.announcement.enabled in the bundled default", () => {
    const config = getDefaultThemeConfig();
    expect(config.theme.announcement.enabled).toBe(true);
  });

  it("keeps the path spelled exactly as the admin writes it", () => {
    // The admin saves the theme document with `theme.announcement.enabled`
    // overlaid. Any rename here must be made in monkey-admin's theme schema too.
    expect(Object.keys(getDefaultThemeConfig().theme.announcement)).toContain(
      "enabled",
    );
  });

  it("stays visible for a config document saved before the flag existed", () => {
    // Absent key → the bundled default (true) wins, i.e. current behaviour.
    const merged = mergeSiteConfig(getDefaultThemeConfig(), {
      theme: { announcement: { text: "hello" } },
    });
    expect(merged.theme.announcement.enabled).toBe(true);
    expect(merged.theme.announcement.text).toBe("hello");
  });

  it("lets the CMS switch the bar off without touching its content", () => {
    const merged = mergeSiteConfig(getDefaultThemeConfig(), {
      theme: { announcement: { enabled: false } },
    });
    expect(merged.theme.announcement.enabled).toBe(false);
    // Styling/content fields are untouched by the toggle.
    expect(merged.theme.announcement.desktopGradient).toBe(
      getDefaultThemeConfig().theme.announcement.desktopGradient,
    );
  });

  it("gates both bars on the same computed, treating only false as off", () => {
    // `!== false` (not a truthy read) is what makes an absent key mean visible.
    expect(defaultLayout).toContain(
      "brandSiteConfig.theme?.announcement?.enabled !== false",
    );
  });

  it("unmounts the bars rather than hiding them", () => {
    // v-if on BOTH surfaces (desktop band + mobile bar): a v-show/opacity gate
    // would leave the bar's min-height in the flow as an empty strip.
    const gated = defaultLayout.match(/v-if="showAnnouncementBar"/g) ?? [];
    expect(gated).toHaveLength(2);
    expect(defaultLayout).not.toContain('v-show="showAnnouncementBar"');
  });
});
