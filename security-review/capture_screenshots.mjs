import { chromium } from 'playwright';
import path from 'path';

const BASE = 'http://localhost:5050';
const OUT_DIR = path.resolve(process.cwd(), 'screenshots');

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await screenshot(page, '01-landing-desktop');

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await screenshot(page, '02-login');

  // Login as admin (for CMS screenshots)
  await page.fill('input[type="email"]', 'admin@gradion.id');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await screenshot(page, '03-dashboard');

  await page.goto(`${BASE}/dashboard/landing-page`, { waitUntil: 'networkidle' });
  await screenshot(page, '04-landing-cms-index');

  await page.goto(`${BASE}/dashboard/landing-page/pricing/edit`, { waitUntil: 'networkidle' });
  await screenshot(page, '05-landing-cms-pricing-edit');

  await page.goto(`${BASE}/dashboard/landing-page/success-stories/edit`, { waitUntil: 'networkidle' });
  await screenshot(page, '06-landing-cms-testimonials-edit');

  await page.goto(`${BASE}/dashboard/landing-page/faq/edit`, { waitUntil: 'networkidle' });
  await screenshot(page, '07-landing-cms-faq-edit');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

