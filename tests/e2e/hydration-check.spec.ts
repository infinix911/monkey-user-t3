import { test } from "@playwright/test";

const ROUTES = ["/", "/casino", "/slots", "/sports", "/mini", "/fishing", "/promotions"];

interface HydrationIssue {
  route: string;
  text: string;
}

test("capture hydration mismatch console warnings", async ({ page }) => {
  const issues: HydrationIssue[] = [];
  let currentRoute = "";

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type !== "warning" && type !== "error") return;
    if (
      text.includes("Hydration") ||
      text.includes("hydration") ||
      text.includes("mismatch")
    ) {
      issues.push({ route: currentRoute, text });
    }
  });

  page.on("pageerror", (err) => {
    if (err.message.includes("Hydration") || err.message.includes("hydration")) {
      issues.push({ route: currentRoute, text: `PAGEERROR: ${err.message}` });
    }
  });

  for (const route of ROUTES) {
    currentRoute = route;
    try {
      await page.goto(`http://localhost:3000${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      await page.waitForTimeout(500);
    } catch (e) {
      issues.push({ route, text: `NAV_ERROR: ${(e as Error).message}` });
    }
  }

  console.log("\n===== HYDRATION ISSUES FOUND =====");
  console.log(`Total: ${issues.length}`);
  for (const { route, text } of issues) {
    console.log(`\n[${route}]`);
    console.log(text.substring(0, 800));
  }
  console.log("===== END =====\n");
});
