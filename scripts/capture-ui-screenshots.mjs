/**
 * Capture Gradion UI screenshots for documentation.
 * Usage: node scripts/capture-ui-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../docs/ui-screenshots');
const BASE = process.env.UI_BASE_URL || 'http://localhost:5050';
const EMAIL = process.env.UI_TEST_EMAIL || 'parent@gradion.id';
const PASSWORD = process.env.UI_TEST_PASSWORD || 'password123';

const captures = [
  { id: '01-landing-page', title: '1. Landing Page', url: '/', auth: false },
  { id: '02-register-page', title: '2. Registration Page (Onboarding)', url: '/register', auth: false },
  { id: '03-login-page', title: '3. Login Page (Onboarding)', url: '/login', auth: false },
  { id: '04-dashboard', title: '4. Dashboard', url: '/dashboard', auth: true },
  { id: '05-children-list', title: '5. Children Page', url: '/dashboard/children', auth: true },
  {
    id: '06-add-child-flow',
    title: '6. Add Child Flow',
    auth: true,
    custom: 'add-child-flow',
    steps: [
      {
        id: '06a-add-child-step1-basic-info',
        title: '6a. Add Child — Step 1: Basic Information',
        url: '/dashboard/children/new',
      },
      {
        id: '06b-add-child-step2-initial-observation',
        title: '6b. Add Child — Step 2: Initial Observation Checklist',
        url: '/dashboard/children/new#step-2',
      },
    ],
  },
  { id: '07-child-detail', title: '7. Child Detail Page', url: null, auth: true, dynamic: 'child' },
  { id: '08-reports', title: '8. Reports Page', url: '/dashboard/reports', auth: true },
  { id: '09-my-logs', title: '9. My Logs Page', url: '/dashboard/logs', auth: true },
  { id: '10-goals', title: '10. Goals Page', url: '/dashboard/goals', auth: true },
  { id: '11-modules', title: '11. Modules Page', url: '/dashboard/modules', auth: true },
  { id: '12-profile', title: '12. Profile Page', url: '/dashboard/profile', auth: true },
];

async function waitForStable(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  await waitForStable(page);
}

async function getFirstChildId() {
  const apiBase = BASE.replace(':5050', ':5001');
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = await res.json();
  const token = loginJson?.data?.token;
  if (!token) return null;
  const childrenRes = await fetch(`${apiBase}/api/children`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const childrenJson = await childrenRes.json();
  return childrenJson?.data?.[0]?.id ?? null;
}

async function resolveChildDetailUrl(page) {
  await page.goto(`${BASE}/dashboard/children`, { waitUntil: 'networkidle' });
  await waitForStable(page);
  const link = page.locator('a[href^="/dashboard/children/"]:not([href$="/new"])').first();
  if ((await link.count()) > 0) {
    const href = await link.getAttribute('href');
    return href?.startsWith('http') ? href : `${BASE}${href}`;
  }
  const childId = await getFirstChildId();
  if (childId) return `${BASE}/dashboard/children/${childId}`;
  return `${BASE}/dashboard/children`;
}

async function screenshot(page, filePath, fullPage = true) {
  await page.screenshot({ path: filePath, fullPage, animations: 'disabled' });
}

async function captureAddChildFlow(page, cap, manifest) {
  const sample = {
    name: 'Alex Sample',
    birthdate: '2020-06-15',
    weeklyHours: '3',
    environment: 'Home with parents; structured play area in living room.',
  };

  await page.goto(`${BASE}/dashboard/children/new`, { waitUntil: 'networkidle' });
  await waitForStable(page);

  // Step 1 — basic info (filled for documentation)
  const textInputs = page.locator('form input[type="text"]');
  await textInputs.first().fill(sample.name);
  await page.locator('input[type="date"]').fill(sample.birthdate);
  await page.locator('form input[type="number"]').fill(sample.weeklyHours);
  await page.locator('textarea').fill(sample.environment);
  await waitForStable(page);

  const step1 = cap.steps[0];
  const step1Path = path.join(OUT_DIR, `${step1.id}.png`);
  console.log(`Capturing: ${step1.title}`);
  await screenshot(page, step1Path);
  manifest.push({
    id: step1.id,
    title: step1.title,
    url: `${BASE}${step1.url}`,
    file: `${step1.id}.png`,
    path: step1Path,
  });

  // Step 2 — initial observation checklist (full scrollable page)
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("OBS 1")').waitFor({ state: 'visible', timeout: 15000 });
  await waitForStable(page);

  const step2 = cap.steps[1];
  const step2Path = path.join(OUT_DIR, `${step2.id}.png`);
  console.log(`Capturing: ${step2.title} (full page)`);
  await screenshot(page, step2Path, true);
  manifest.push({
    id: step2.id,
    title: step2.title,
    url: `${BASE}/dashboard/children/new`,
    file: `${step2.id}.png`,
    path: step2Path,
  });

  // Remove legacy single-frame capture if present
  const legacy = path.join(OUT_DIR, '06-add-child.png');
  if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  let loggedIn = false;
  const manifest = [];

  for (const cap of captures) {
    if (cap.auth && !loggedIn) {
      await login(page);
      loggedIn = true;
    }

    if (cap.custom === 'add-child-flow') {
      await captureAddChildFlow(page, cap, manifest);
      continue;
    }

    const fileName = `${cap.id}.png`;
    const filePath = path.join(OUT_DIR, fileName);

    let url = cap.url;
    if (cap.dynamic === 'child') {
      url = (await resolveChildDetailUrl(page)).replace(BASE, '');
    }

    console.log(`Capturing: ${cap.title} -> ${url || cap.url}`);
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await waitForStable(page);
    await screenshot(page, filePath);

    manifest.push({
      id: cap.id,
      title: cap.title,
      url: `${BASE}${url}`,
      file: fileName,
      path: filePath,
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nSaved ${manifest.length} screenshots to ${OUT_DIR}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
