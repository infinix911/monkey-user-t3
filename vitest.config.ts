import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";

const appDir = fileURLToPath(new URL("./app", import.meta.url));
const rootDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * Component test project — characterization tests under `tests/component/**`.
 * Uses the Nuxt environment via `defineVitestProject` so `@nuxt/test-utils`
 * `mountSuspended` resolves Nuxt auto-imports (useI18n, useState, etc.).
 *
 * Path aliases mirror the Nuxt `@/` and `~/` mappings to `app/`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": appDir,
      "~": appDir,
      "~~": rootDir,
      "@@": rootDir,
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    projects: [
      await defineVitestProject({
        test: {
          name: "component",
          environment: "nuxt",
          globals: true,
          include: ["tests/component/**/*.spec.ts"],
          setupFiles: ["tests/component/setup.ts"],
        },
      }),
    ],
  },
});
