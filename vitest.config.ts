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
          /**
           * `@nuxt/test-utils` boots a real Nuxt app in a `beforeAll` the first
           * time a spec mounts a component. That boot regularly exceeds the 10s
           * default on a cold cache and fails the whole file before any test
           * runs, so the hook — not the tests — gets the long budget.
           */
          hookTimeout: 120_000,
          testTimeout: 30_000,
        },
      }),
    ],
  },
});
