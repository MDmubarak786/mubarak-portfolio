import { chromium } from "playwright";
const URL = "https://mk-full-stack-developer.vercel.app/";
const out = ".impeccable/review/";
const browser = await chromium.launch();
async function page(viewport, mobile = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => sessionStorage.setItem("preloaded", "1"));
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  // scroll through so every reveal and count-up has fired, then return to top
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += viewport.height * 0.6) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(220); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1600);
  return { ctx, p };
}
// Desktop
{
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.screenshot({ path: out + "desktop.png", fullPage: true });
  await p.screenshot({ path: out + "desktop-first-viewport.png" });
  // hover preview frame
  const row = p.locator("[data-work] summary").first();
  await row.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const box = await row.boundingBox();
  await p.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2); await p.waitForTimeout(700);
  await p.screenshot({ path: out + "desktop-work-hover.png" });
  // open first work row and first experience row
  await row.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: out + "desktop-work-open.png" });
  const exp = p.locator("#experience details summary").first();
  await exp.scrollIntoViewIfNeeded(); await exp.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: out + "desktop-experience-open.png" });
  // preloader frame (fresh context without the session flag)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage(); await p2.goto(URL); await p2.waitForTimeout(500);
  await p2.screenshot({ path: out + "desktop-preloader.png" });
  await ctx2.close(); await ctx.close();
}
// Mobile
{
  const { ctx, p } = await page({ width: 390, height: 844 }, true);
  await p.screenshot({ path: out + "mobile.png", fullPage: true });
  await p.screenshot({ path: out + "mobile-first-viewport.png" });
  await p.locator("[data-menu-toggle]").click(); await p.waitForTimeout(400);
  await p.screenshot({ path: out + "mobile-menu-open.png" });
  await p.locator("[data-menu-toggle]").click();
  const exp = p.locator("#experience details summary").first();
  await exp.scrollIntoViewIfNeeded(); await exp.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: out + "mobile-experience-open.png" });
  await ctx.close();
}
await browser.close();
console.log("captured");
