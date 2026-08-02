// E2E test for biometric (WebAuthn passkey) sign-in using Chrome's virtual
// authenticator, so no real Face ID / fingerprint hardware is needed.
// Usage: node scripts/e2e-biometric-login.mjs [outputDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'biometric-proof';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5050';
const EMAIL = 'parent@gradion.id';
const PASSWORD = 'password123';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Attach a virtual platform authenticator with user verification (biometrics).
const cdp = await context.newCDPSession(page);
await cdp.send('WebAuthn.enable');
const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});

const shot = (name) => page.screenshot({ path: join(OUT, name) });

// ---------- 1. Password login ----------
await page.goto(`${BASE}/login`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 20000 });

// ---------- 2. Enable biometric in profile ----------
await page.goto(`${BASE}/dashboard/profile`);
await page.waitForSelector('text=Login Biometrik', { timeout: 20000 });
await page.locator('button:has-text("Aktifkan di perangkat ini")').waitFor({ timeout: 20000 });
await page
  .locator('text=Login Biometrik')
  .first()
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await shot('b1_profile_biometric_section.png');

await page.click('button:has-text("Aktifkan di perangkat ini")');
await page.waitForSelector('text=/Login biometrik aktif di perangkat ini/i', { timeout: 25000 });
await page.waitForSelector('text=Perangkat terdaftar', { timeout: 10000 });
await page
  .locator('text=Perangkat terdaftar')
  .evaluate((el) => el.scrollIntoView({ block: 'center' }));
await shot('b2_biometric_enabled.png');
const deviceCount = await page.locator('li:has-text("Didaftarkan")').count();

// Credential really exists in the virtual authenticator.
const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });

// ---------- 3. Sign out, then sign in with biometrics only ----------
await page.evaluate(() => {
  const email = localStorage.getItem('gradion-biometric-last-email');
  localStorage.clear();
  if (email) localStorage.setItem('gradion-biometric-last-email', email);
});
await page.goto(`${BASE}/login`);
await page.waitForSelector('button:has-text("Masuk dengan biometrik")', { timeout: 20000 });
await shot('b3_login_biometric_button.png');

await page.click('button:has-text("Masuk dengan biometrik")');
await page.waitForURL('**/dashboard', { timeout: 25000 });
await page.waitForTimeout(1500);
await shot('b4_signed_in_with_biometric.png');

const signedInUser = await page.evaluate(() => {
  try {
    return JSON.parse(localStorage.getItem('gradion-auth') || '{}')?.state?.user?.email || null;
  } catch {
    return null;
  }
});

// ---------- 4. Remove the device ----------
await page.goto(`${BASE}/dashboard/profile`);
await page.waitForSelector('button:has-text("Hapus")', { timeout: 20000 });
await page.click('button:has-text("Hapus")');
await page.waitForSelector('text=/Perangkat biometrik dihapus/i', { timeout: 15000 });
const remaining = await page.locator('li:has-text("Didaftarkan")').count();

console.log(
  JSON.stringify({
    devicesAfterEnable: deviceCount,
    virtualCredentials: credentials.length,
    signedInUser,
    devicesAfterRemove: remaining,
  })
);

await browser.close();
