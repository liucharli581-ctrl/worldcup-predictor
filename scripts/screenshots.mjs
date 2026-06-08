import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "screenshots", "client-review");
const BASE = "http://localhost:3000";

const pages = [
  { route: "/", name: "01-首页" },
  { route: "/matches", name: "02-比赛列表" },
  { route: "/matches/cmq4sqoe9001ctw80jcedyf04", name: "03-比赛详情-已结束" },
  { route: "/matches/cmq4sqofr001stw80vwv0serw", name: "04-比赛详情-未开始" },
  { route: "/groups", name: "05-分组列表" },
  { route: "/groups/A", name: "06-分组详情" },
  { route: "/teams", name: "07-球队列表" },
  { route: "/teams/cmq4sqoco0010tw8012ht0cd4", name: "08-球队详情" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const { route, name } of pages) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      // Wait a bit for any animations
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(OUT, `${name}.png`),
        fullPage: true,
      });
      console.log(`✓ ${name}`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log("\nDone! All screenshots saved to:", OUT);
}

main();
