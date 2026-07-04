// Proof screenshots for the round-2 enhancements (pending-gating, admin
// parity, revert-to-pending, parent identity, per-child tokens).
// Usage: node scripts/e2e-enhancement-screenshots.mjs <output-dir> <childId>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'e2e-enhancement-screenshots';
const CHILD_ID = process.argv[3] || '26';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5050';
const shot = (page, name) => page.screenshot({ path: join(OUT, name) });

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gradion-language-v2',
      JSON.stringify({ state: { language: 'en' }, version: 0 })
    );
  });
  await page.reload();
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ---------- Parent: pending gating + editable behavior + token card ----------
await login(page, 'parent@gradion.id');
await page.goto(`${BASE}/dashboard/children/${CHILD_ID}`);
await page.waitForSelector('text=/awaiting admin review/i', { timeout: 20000 });
await shot(page, '14_parent_pending_banners_with_token_card.png');

const editBtn = page.locator('button:has-text("Edit values")');
await editBtn.first().waitFor({ timeout: 15000 });
await editBtn.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
await shot(page, '15_parent_edit_values_despite_pending.png');

// ---------- Admin: same gated view ----------
await login(page, 'admin@gradion.id');
await page.goto(`${BASE}/dashboard/children/${CHILD_ID}`);
await page.waitForSelector('text=/awaiting admin review/i', { timeout: 20000 });
await shot(page, '16_admin_same_pending_gating.png');

// ---------- Admin: children list with parent identity + per-child tokens ----------
await page.goto(`${BASE}/dashboard/children`);
await page.waitForSelector('text=Enhance Test Child', { timeout: 20000 });
await shot(page, '17_admin_children_parent_identity_tokens.png');

// ---------- Admin: dashboard recent children with parent line ----------
await page.goto(`${BASE}/dashboard`);
await page.waitForSelector('text=/Parent:/', { timeout: 20000 });
await shot(page, '18_admin_dashboard_parent_identity.png');

// ---------- Admin: AI content review with Set pending ----------
await page.goto(`${BASE}/dashboard/admin/ai-content-review`);
await page.waitForSelector('text=AI Content Review', { timeout: 20000 });
await page.waitForSelector('button:has-text("Set pending")', { timeout: 20000 });
await shot(page, '19_ai_review_set_pending_available.png');

// Approve the assessment, then set it back to pending to prove the cycle.
const approveBtn = page
  .locator('li', { hasText: 'Enhance Test Child' })
  .locator('button:has-text("Approve")')
  .first();
await approveBtn.click();
await page.waitForSelector('text=/Assessment approved/i', { timeout: 15000 });
// switch filter to approved to find it again
await page.selectOption('select', 'approved');
await page.waitForSelector('text=Enhance Test Child', { timeout: 15000 });
const setPendingBtn = page
  .locator('li', { hasText: 'Enhance Test Child' })
  .locator('button:has-text("Set pending")')
  .first();
await setPendingBtn.click();
await page.waitForSelector('text=/set back to pending/i', { timeout: 15000 });
await shot(page, '20_ai_review_reverted_to_pending.png');

console.log(JSON.stringify({ out: OUT, childId: CHILD_ID }));
await browser.close();
