// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { r2PublicBase } from "../../shared/utils/r2-public-base";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("R2 public assets", () => {
  it("defaults to the public origin and trims a configured trailing slash", () => {
    expect(r2PublicBase()).toBe("https://assets.fr-7979.com");
    expect(r2PublicBase(" https://media.example.com/ ")).toBe("https://media.example.com");
  });

  it.each([
    "invalid", "http://media.example.com", "https://user:pass@media.example.com",
    "https://media.example.com/bucket", "https://media.example.com/?v=1",
    "https://media.example.com/#asset", "https://media.example.com/?",
  ])("rejects a non-origin public base: %s", (value) => {
    expect(() => r2PublicBase(value)).toThrow("R2_PUBLIC_BASE_URL");
  });

  it("uses the configured public origin without adding a bucket", async () => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://media.example.com/");
    const { cdn, sameOrigin } = await import("../../app/utils/assetUrl");
    const { getDefaultThemeConfig } = await import("../../app/composables/useDefaultThemeConfig");
    const defaults = getDefaultThemeConfig();
    expect(defaults.assets.images.gold).toBe("https://media.example.com/dragon/stones/gold.webp");
    expect(defaults.assets.transaction.bankBasePath).toBe("https://media.example.com/ocean/banks");
    expect(cdn("/designs/template-3/logo.webp")).toBe("https://media.example.com/designs/template-3/logo.webp");
    expect(cdn("/images/logo.webp")).toBe("/images/logo.webp");
    expect(cdn("https://other.example/designs/logo.webp")).toBe("https://other.example/designs/logo.webp");
    expect(cdn("")).toBe("");
    expect(sameOrigin("https://media.example.com/designs/logo.webp")).toBe("/designs/logo.webp");
    expect(sameOrigin("https://media.example.com")).toBe("/");
    expect(sameOrigin("https://media.example.com.evil.test/designs/logo.webp")).toBe("https://media.example.com.evil.test/designs/logo.webp");
    expect(sameOrigin("/designs/logo.webp")).toBe("/designs/logo.webp");
    expect(sameOrigin("")).toBe("");
  });
});
