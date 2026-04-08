import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Find next available screenshot number
const existing = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outputPath = path.join(screenshotsDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Scroll through the page to trigger all intersection observers
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
const steps = Math.ceil(pageHeight / 600);
for (let i = 0; i <= steps; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * 600);
  await new Promise(r => setTimeout(r, 80));
}
// Force all reveals visible
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')));
// Scroll back to top
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 600));

await page.screenshot({ path: outputPath, fullPage: true });

await browser.close();
console.log(`Screenshot saved: ${outputPath}`);
