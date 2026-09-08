import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const moduleName = process.env.PLAYWRIGHT_CORE_MODULE || 'playwright-core';
const { chromium } = await import(moduleName.includes(':') ? pathToFileURL(moduleName).href : moduleName);

const base = process.env.ALIBI_URL || 'http://127.0.0.1:8787/';
const out = process.argv[2] || 'assets-source/library/motion/captures';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
if (!executablePath) throw new Error('Set CHROMIUM_EXECUTABLE to the tested local Chromium executable.');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
for (const size of [{ name: 'landscape', width: 1440, height: 900 }, { name: 'mobile', width: 430, height: 932 }]) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const route of ['realm', 'pets', 'garden']) {
    await page.goto(`${base}#/quiet/${route}`);
    await page.waitForFunction(() => window.AlibiActivities?.diagnostics().active);
    await page.waitForFunction((expected) => window.QWApp?.route === expected, route);
    await page.waitForTimeout(240);
    await page.screenshot({ path: `${out}/quiet-${route}-${size.name}.png`, fullPage: true });
  }
  await context.close();
}
await browser.close();
