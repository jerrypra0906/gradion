// E2E proof-of-fix screenshot capture for the child creation / deletion flows.
// Usage: node scripts/e2e-proof-screenshots.mjs <output-dir>
// Requires the local Docker stack (frontend :5050, backend :5001) and seeded
// parent@gradion.id / admin@gradion.id users (password123).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'e2e-proof-screenshots';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5050';
const CHILD_NAME = 'Proof Test Child';

const shot = (page, name) =>
  page.screenshot({ path: join(OUT, name), fullPage: false });

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  // Pin the UI to English so text-based selectors are deterministic.
  await page.evaluate(() => {
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

async function logout(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

async function setRangeInputs(page, selectorFilter, value) {
  await page.evaluate(
    ({ filter, value }) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set;
      let n = 0;
      document.querySelectorAll('input[type="range"]').forEach((r) => {
        if (r.disabled) return;
        if (filter === 'percent' && r.max !== '100') return;
        if (filter === 'fs' && r.max !== '5') return;
        setter.call(r, String(value));
        r.dispatchEvent(new Event('input', { bubbles: true }));
        n += 1;
      });
      return n;
    },
    { filter: selectorFilter, value }
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ---------- Parent: create child flow ----------
await login(page, 'parent@gradion.id');

await page.goto(`${BASE}/dashboard/children/new`);
await page.waitForSelector('text=/mandatory|wajib/i', { timeout: 15000 });
// Discard any restored draft so the run starts clean.
const startOver = page.locator('text=/Start over|Mulai dari awal/i');
if (await startOver.count()) await startOver.first().click();
await page.fill('input[type="text"]', CHILD_NAME);
await shot(page, '01_step1_mandatory_optional_markers.png');

await page.click('button:has-text("Next")');
await page.waitForSelector('text=Behavior (F / S)', { timeout: 15000 });
await shot(page, '02_step2_fs_sliders_default_0.png');

// Create with mandatory fields still missing -> specific error, button enabled.
await page.waitForTimeout(1000); // let hydration settle before the click
await page.click('button:has-text("Create Child")');
await page.waitForSelector('text=/mandatory fields first to proceed/i', {
  timeout: 15000,
});
await page
  .locator('div.text-red-700', { hasText: /mandatory fields first/i })
  .first()
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
await shot(page, '03_specific_mandatory_field_error.png');

// Fill mandatory fields, then create (double-click to prove dedup).
await page.fill('input[type="number"]', '6');
await setRangeInputs(page, 'percent', 55);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /Create Child/i.test(b.textContent)
  );
  btn.click();
  btn.click(); // second click must be ignored (no duplicate child)
});
await page.waitForURL('**/dashboard/children/*', { timeout: 30000 });
await page.waitForSelector(`text=${CHILD_NAME}`, { timeout: 15000 });
await shot(page, '04_child_created_detail_page.png');
const childUrl = page.url();

// ---------- Parent: edit Behavior (OBS 1) ----------
const checklistHeader = page.locator(
  'button:has-text("Initial Observation Checklist")'
);
if (
  !(await page
    .locator('text=/Behavior \\(OBS 1\\)|Perilaku \\(OBS 1\\)/i')
    .count())
) {
  await checklistHeader.click();
}
await page.waitForSelector('button:has-text("Edit values")', { timeout: 10000 });
await page
  .locator('button:has-text("Edit values")')
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await shot(page, '05_behavior_obs1_edit_button.png');

await page.click('button:has-text("Edit values")');
await page.waitForSelector('button:has-text("Save values")', { timeout: 10000 });
// Tantrums F=4, S=3 via the first editable F/S sliders.
await page.evaluate(() => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  ).set;
  const sliders = [...document.querySelectorAll('input[type="range"]')].filter(
    (r) => !r.disabled && r.max === '5'
  );
  setter.call(sliders[0], '4');
  sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
  setter.call(sliders[1], '3');
  sliders[1].dispatchEvent(new Event('input', { bubbles: true }));
});
await page
  .locator('button:has-text("Save values")')
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await shot(page, '06_behavior_editor_open.png');
await page.click('button:has-text("Save values")');
await page.waitForSelector('text=/Behavior values saved|berhasil disimpan/i', {
  timeout: 15000,
});
await shot(page, '07_behavior_values_saved.png');

// ---------- Parent: delete child ----------
await page
  .locator('button:has-text("Delete child")')
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await page.click('button:has-text("Delete child")');
await page.waitForSelector('button:has-text("Yes, delete")', { timeout: 10000 });
await shot(page, '08_delete_confirmation.png');
await page.click('button:has-text("Yes, delete")');
await page.waitForURL('**/dashboard/children', { timeout: 20000 });
await page.waitForTimeout(1500);
await shot(page, '09_parent_children_after_delete.png');
const parentSeesDeleted = await page.locator(`text=${CHILD_NAME}`).count();

// ---------- Admin: deactivated badge + reactivate ----------
await logout(page);
await login(page, 'admin@gradion.id');
await page.goto(`${BASE}/dashboard/children`);
await page.waitForSelector('text=Deactivated', { timeout: 20000 });
await page
  .locator('text=Deactivated')
  .first()
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await shot(page, '10_admin_sees_deactivated_badge.png');

await page.goto(childUrl);
await page.waitForSelector('button:has-text("Reactivate")', { timeout: 20000 });
await shot(page, '11_admin_reactivate_banner.png');
await page.click('button:has-text("Reactivate")');
await page.waitForFunction(
  () => !document.body.textContent.includes('Reactivate'),
  { timeout: 20000 }
);
await shot(page, '12_admin_after_reactivation.png');

// ---------- Parent sees the child again ----------
await logout(page);
await login(page, 'parent@gradion.id');
await page.goto(`${BASE}/dashboard/children`);
await page.waitForSelector(`text=${CHILD_NAME}`, { timeout: 20000 });
await shot(page, '13_parent_sees_child_after_reactivation.png');

console.log(
  JSON.stringify({
    childUrl,
    parentSeesDeletedAfterDelete: parentSeesDeleted,
    out: OUT,
  })
);
await browser.close();
