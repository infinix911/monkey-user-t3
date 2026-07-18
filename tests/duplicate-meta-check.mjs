import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });

const counts = await page.$$eval("head meta", (metas) => {
  const out = {};
  for (const m of metas) {
    const name = m.getAttribute("name");
    const property = m.getAttribute("property");
    const k = name ? `name:${name}` : property ? `prop:${property}` : null;
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
});

console.log("===== DOM meta counts (sorted) =====");
const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
for (const [k, c] of rows) {
  console.log(`${c}x  ${k}`);
}

await ctx.close();
await browser.close();
process.exit(0);
