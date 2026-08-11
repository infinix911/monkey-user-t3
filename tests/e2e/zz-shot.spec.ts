import { test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("diagnose", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  const res = await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  console.log("STATUS " + res?.status());
  await page.waitForTimeout(4000);
  const btns = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim()).slice(0, 12));
  console.log("BUTTONS " + JSON.stringify(btns));
  console.log("ERRORS " + JSON.stringify(errors.slice(0, 5)));
});
