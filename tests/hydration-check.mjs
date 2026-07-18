import { chromium } from "@playwright/test";

const ROUTES = ["/"];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 800 },
];

const issues = [];

const browser = await chromium.launch({ headless: true });

for (const viewport of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  // Capture a stack trace each time console.warn is called so we can trace
  // "Set operation on key 'value' failed: target is readonly" to source code.
  await ctx.addInitScript(() => {
    const origWarn = console.warn;
    console.warn = function (...args) {
      const first = args[0];
      if (typeof first === "string" && first.includes("target is readonly")) {
        const stack = new Error("trace").stack || "";
        origWarn.call(console, first + "\n__STACK__\n" + stack);
        return;
      }
      return origWarn.apply(console, args);
    };
  });
  const page = await ctx.newPage();
  let currentRoute = "";

  page.on("console", async (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type !== "warning" && type !== "error") return;
    if (
      text.includes("[Vue warn]") ||
      text.includes("Hydration") ||
      text.includes("hydration") ||
      text.includes("mismatch") ||
      text.includes("SSR / Client")
    ) {
      const loc = msg.location();
      issues.push({
        viewport: viewport.name,
        route: currentRoute,
        type,
        text,
        location: `${loc.url}:${loc.lineNumber}:${loc.columnNumber}`,
      });
    }
  });

  for (const route of ROUTES) {
    currentRoute = route;
    try {
      await page.goto(`http://localhost:3000${route}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });
      // Wait long enough for banner popup (gated by `ready` in onMounted) to appear
      await page.waitForTimeout(2500);
      // Verify popup rendered
      const popupCount = await page.locator('[data-test-banner-card], .fixed.inset-0.z-\\[10000\\]').count();
      console.log(`[${viewport.name}] ${route} — popup elements present: ${popupCount}`);
    } catch (e) {
      issues.push({ viewport: viewport.name, route, text: `NAV_ERROR: ${e.message}` });
    }
  }

  await ctx.close();
}

await browser.close();

console.log("\n===== HYDRATION / MISMATCH WARNINGS =====");
console.log(`Total: ${issues.length}`);
for (const { viewport, route, text, location } of issues) {
  console.log(`\n[${viewport}] [${route}]  @ ${location || "?"}`);
  console.log(text.substring(0, 1200));
}
console.log("\n===== END =====\n");

process.exit(0);
