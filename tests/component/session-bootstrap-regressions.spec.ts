import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "../..");
const sessionPlugin = readFileSync(
  resolve(projectRoot, "app/plugins/session-verify.client.ts"),
  "utf8",
);
const nuxtConfig = readFileSync(resolve(projectRoot, "nuxt.config.ts"), "utf8");
const cloudflareHeaders = readFileSync(
  resolve(projectRoot, "public/_headers"),
  "utf8",
);

describe("session bootstrap regressions", () => {
  it("loads authenticated notifications without calling useI18n outside setup", () => {
    expect(sessionPlugin).not.toMatch(/void\s+useNotifications\(\)\./);
    expect(sessionPlugin).toContain("useMemberInboxStore()");
    expect(sessionPlugin).toContain(
      "inbox.loadNotifications(nuxtApp.$i18n.locale.value)",
    );
  });

  it("allows the dynamic blob PWA manifest in both CSP sources", () => {
    expect(nuxtConfig).toContain('"manifest-src": ["\'self\'", "blob:"]');
    expect(cloudflareHeaders).toContain("manifest-src 'self' blob:");
  });
});
