/**
 * Capture child #19 detail + ABA program interaction flow.
 * Usage: node scripts/capture-child-19-aba-flow.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../docs/ui-screenshots/child-19');
const BASE = process.env.UI_BASE_URL || 'http://localhost:5050';
const API = BASE.replace(':5050', ':5001');
const CHILD_ID = process.env.CHILD_ID || '19';
const EMAIL = process.env.UI_TEST_EMAIL || 'parent@gradion.id';
const PASSWORD = process.env.UI_TEST_PASSWORD || 'password123';

const captures = [];

function mondayYmd(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const mon = new Date(d);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() - diff);
  return mon.toISOString().slice(0, 10);
}

async function apiLogin() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = await res.json();
  return json?.data?.token;
}

async function ensureCurrentWeekProgram(token) {
  const weekStart = mondayYmd();
  const weeksRes = await fetch(`${API}/api/aba-program/children/${CHILD_ID}/weeks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const weeksJson = await weeksRes.json();
  const weeks = weeksJson?.data?.weeks || [];
  const hasCurrent = weeks.some((w) => w.week_start.slice(0, 10) === weekStart);
  if (hasCurrent) return;

  await fetch(`${API}/api/aba-program/children/${CHILD_ID}/weeks/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ week_start: weekStart, lang: 'id' }),
  });
}

async function waitForStable(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function shot(page, id, title, fullPage = true) {
  const file = `${id}.png`;
  const filePath = path.join(OUT_DIR, file);
  await page.screenshot({ path: filePath, fullPage, animations: 'disabled' });
  captures.push({ id, title, file, url: page.url() });
  console.log(`Captured: ${title}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$|^masuk$/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
}

async function scrollToAbaSection(page) {
  const heading = page.getByText(/Program rumah mingguan|Weekly home program/i).first();
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

async function expandFirstProgram(page) {
  const programButton = page
    .locator('ul.space-y-2 > li.rounded-md button[type="button"]')
    .first();
  await programButton.waitFor({ state: 'visible', timeout: 15000 });
  await programButton.click();
  await page.waitForTimeout(600);
}

async function clickStartThisTask(page) {
  const btn = page.getByRole('button', { name: /mulai tugas ini|start this task/i });
  await btn.first().click();
  await page.waitForSelector('text=/Panduan di website|Guided on website|Panduan/i', { timeout: 10000 });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await apiLogin();
  if (!token) throw new Error('Login failed');
  await ensureCurrentWeekProgram(token);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await login(page);
  await page.goto(`${BASE}/dashboard/children/${CHILD_ID}`, { waitUntil: 'networkidle' });
  await waitForStable(page);
  await shot(page, '01-child-detail', `Child ${CHILD_ID} — Detail Page`);

  await scrollToAbaSection(page);
  await shot(page, '02-aba-program-section', `Child ${CHILD_ID} — Weekly ABA Program Section`, false);

  await expandFirstProgram(page);
  await shot(page, '03-program-expanded', `Child ${CHILD_ID} — Program Expanded`, false);

  await clickStartThisTask(page);
  await shot(page, '04-start-task-modal', `Child ${CHILD_ID} — Start Task Modal (choose mode)`, false);

  await page
    .locator('.fixed.inset-0')
    .getByRole('button', { name: /^panduan di website|^guided on website/i })
    .click();
  await page.waitForURL('**/aba-program**', { timeout: 15000 });
  await waitForStable(page);
  await shot(page, '05-guided-session', `Child ${CHILD_ID} — Panduan di website (Guided Session)`);

  await page.goto(`${BASE}/dashboard/children/${CHILD_ID}`, { waitUntil: 'networkidle' });
  await waitForStable(page);
  await scrollToAbaSection(page);
  await expandFirstProgram(page);
  await clickStartThisTask(page);
  await page
    .locator('.fixed.inset-0')
    .getByRole('button', { name: /^cetak.*unggah|^print.*upload/i })
    .click();
  await page.waitForTimeout(800);
  await page.locator('text=/Unduh formulir|Download form/i').waitFor({ timeout: 10000 });
  await shot(page, '06-upload-mode', `Child ${CHILD_ID} — Cetak & unggah (Print & Upload)`, false);

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(captures, null, 2));
  console.log(`\nSaved ${captures.length} screenshots to ${OUT_DIR}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
