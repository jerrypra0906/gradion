/**
 * Gradion regression suite.
 *
 * Two halves:
 *   1. A design-conformance sweep over every reachable page, at 390px and
 *      1440px, asserting the thresholds written into README "Interface Rules":
 *      WCAG contrast on rendered text, 44px touch targets, visible focus, no
 *      white-on-full-strength-teal, and no copy left over from the old design.
 *   2. End-to-end functional flows for parent and admin.
 *
 * Usage: node scripts/regression.mjs [output-dir]
 * Requires the local stack (frontend :5050, backend :5001) and the seeded
 * parent@gradion.id / admin@gradion.id accounts (password123).
 *
 * NOTE: the functional half runs a real guided session end to end, so each run
 * leaves one completed session and its synced parent log on the child it picks.
 * scripts/regression-cleanup.sql removes them.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'regression-out';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5050';
const API = 'http://localhost:5001/api';

const results = [];
let group = '';
const section = (name) => { group = name; console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 54 - name.length))}`); };
const check = (name, pass, detail = '') => {
  results.push({ group, name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

/* ------------------------------------------------------------------ probes */

/** Text contrast for every rendered text node, against its painted backdrop. */
const CONTRAST = `(() => {
  const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
  const parse=s=>{const m=s&&s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
  // null => an ancestor paints an image or gradient; contrast is not statically knowable.
  const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const bgOf=el=>{const layers=[];let n=el;
    while(n&&n!==document.documentElement){const cs=getComputedStyle(n);
      if(cs.backgroundImage&&cs.backgroundImage!=='none')return null;
      if(n.tagName==='IMG'||n.querySelector(':scope > img[aria-hidden="true"]'))return null;
      const c=parse(cs.backgroundColor);
      if(c&&c.a>0){ layers.push(c); if(c.a>=0.999) break; }
      n=n.parentElement;}
    let acc={r:255,g:255,b:255,a:1};
    for(let i=layers.length-1;i>=0;i--) acc=over(layers[i],acc);
    return acc;};
  const bad=[];
  for(const el of document.querySelectorAll('button,a,p,span,div,h1,h2,h3,h4,h5,li,label,legend,td,th,strong,em,summary')){
    if(el.offsetParent===null)continue;
    const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(''); if(!txt)continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||parseFloat(cs.opacity)<0.6)continue;
    const fg=parse(cs.color); if(!fg||fg.a<0.85)continue;
    const bg=bgOf(el); if(!bg)continue;
    const L1=lum(fg.r,fg.g,fg.b),L2=lum(bg.r,bg.g,bg.b);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const px=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight,10)>=700;
    const min=(px>=24||(px>=18.66&&bold))?3:4.5;
    if(ratio+0.05<min) bad.push(\`"\${txt.slice(0,24)}" \${ratio.toFixed(2)}:1 (needs \${min})\`);
  } return bad; })()`;

/**
 * Targets below the applicable floor: 44px where the pointer is coarse (the
 * README threshold), and WCAG 2.5.8's 24px for a mouse.
 */
const TAP_TARGETS = `(() => { const min = matchMedia('(pointer: coarse)').matches ? 44 : 24;
  return [...document.querySelectorAll('button')]
    .filter(e => e.offsetParent !== null && e.getBoundingClientRect().height > 0
              && e.getBoundingClientRect().height < min)
    .map(e => \`\${(e.textContent||e.getAttribute('aria-label')||'?').trim().slice(0,22)}@\${Math.round(e.getBoundingClientRect().height)}px\`); })()`;

/** The specific failure the design review found: white on full-strength teal. */
const WHITE_ON_TEAL = `(() => {
  const isTeal = c => /rgb\\(0,\\s*19[0-9],\\s*17[0-9]\\)/.test(c);
  const isWhite = c => /rgb\\(255,\\s*255,\\s*255\\)/.test(c);
  return [...document.querySelectorAll('*')].filter(e => e.offsetParent !== null)
    .filter(e => { const cs = getComputedStyle(e);
      return isTeal(cs.backgroundColor) && isWhite(cs.color)
        && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); })
    .map(e => (e.textContent||'').trim().slice(0,24)); })()`;

/**
 * English chrome on a page the reader set to Indonesian.
 *
 * Covers the public marketing pages too: their defaults are bilingual, and
 * admin-authored CMS copy is machine-translated both ways on read. Only the
 * legal page bodies are exempt — see LEGAL_BODY_PAGES.
 */
const ENGLISH_CHROME = [
  /\bAll rights reserved\b/,
  /\bSign In\b/,
  /\bPrivacy Policy\b/,
  /\bTerms of Service\b/,
  /\bContact Us\b/,
  /\bKnowledge Hub\b/,
];

/** Copy and controls that belong to the design the review replaced. */
const LEGACY = [
  { re: /Salah \(-\)/, what: 'trial button still reads "Salah (-)"' },
  { re: /Lainnya \(os\)/, what: 'trial button still reads "Lainnya (os)"' },
  { re: /F = Frekuensi \(jumlah\)/, what: 'old F/S slider hint' },
  { re: /F = Frequency \(count\)/, what: 'old F/S slider hint (en)' },
  { re: /Periode berakhir · masih aktif/, what: 'self-contradicting period badge' },
  { re: /lacak perkembangan, kolaborasi dengan tim klinis/, what: 'marketing paragraph in the welcome card' },
  { re: /nama dipanggil 10 kali/, what: 'help text asking the parent to do arithmetic' },
];

/** Legacy only where a parent would see it. */
const LEGACY_PARENT = [
  { re: /Dijalankan:/, what: 'raw run counter instead of sessions-left' },
];

async function auditPage(page, label, { parentView = false, allowSliders = false, publicPage = false } = {}) {
  const body = await page.locator('body').innerText();
  check(`${label} · renders`, body.length > 60 && !/Application error|Unhandled Runtime|500 -/i.test(body),
    `${body.length} chars`);

  const bad = await page.evaluate(CONTRAST);
  check(`${label} · contrast`, bad.length === 0, bad.slice(0, 3).join(' | '));

  const tiny = await page.evaluate(TAP_TARGETS);
  const floor = await page.evaluate(`matchMedia('(pointer: coarse)').matches ? 44 : 24`);
  check(`${label} · ${floor}px targets`, tiny.length === 0, tiny.slice(0, 4).join(', '));

  const wot = await page.evaluate(WHITE_ON_TEAL);
  check(`${label} · no white-on-teal`, wot.length === 0, wot.slice(0, 3).join(', '));

  const rules = parentView ? [...LEGACY, ...LEGACY_PARENT] : LEGACY;
  const hits = rules.filter((l) => l.re.test(body)).map((l) => l.what);
  check(`${label} · no legacy copy`, hits.length === 0, hits.join('; '));

  if (!allowSliders) {
    const sliders = await page.locator('input[type="range"]').count();
    check(`${label} · no range sliders`, sliders === 0, `${sliders} found`);
  }
  if (parentView) {
    check(`${label} · no developer output for parents`,
      !/Token AI anak ini/i.test(body) && !/\d{4}-\d{2}-\d{2}\s*(→|–)\s*\d{4}-\d{2}-\d{2}/.test(body));
  }

  // The whole sweep runs with the language set to Indonesian.
  if (!publicPage) {
    const english = ENGLISH_CHROME.filter((re) => re.test(body)).map((re) => String(re));
    check(`${label} · no English chrome`, english.length === 0, english.join(', '));
  }
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() =>
    localStorage.setItem('gradion-language-v2', JSON.stringify({ state: { language: 'id' }, version: 0 })));
  await page.reload();
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 25000 });
  await page.waitForTimeout(2500);
  const skip = page.locator('button:has-text("Lewati"), button:has-text("Selesai"), button:has-text("Skip")').first();
  if (await skip.count()) { await skip.click().catch(() => {}); await page.waitForTimeout(600); }
}

async function visit(page, path, ms = 2200) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(ms);
}

/* ------------------------------------------------------------------- suite */

const browser = await chromium.launch();
const pageErrors = [];

// ---------------------------------------------------------------- public
section('Public pages');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`public: ${String(e).slice(0, 100)}`));
  for (const [name, path] of [
    ['landing', '/'], ['login', '/login'], ['register', '/register'],
    ['forgot password', '/forgot-password'], ['resources', '/resources'],
    ['cms index', '/cms'], ['cms privacy', '/cms/privacy'], ['cms terms', '/cms/terms'],
    ['cms contact', '/cms/contact'],
  ]) {
    await visit(p, path);
    // The privacy and terms bodies are still the hard-coded English fallback:
    // they have no CMS row yet, and machine-translating legal text is a
    // decision for the product owner, not a default.
    const legalBody = path === '/cms/privacy' || path === '/cms/terms';
    await auditPage(p, `${name} (390)`, { publicPage: legalBody });
  }
  await ctx.close();
}

// ---------------------------------------------------------------- parent
section('Parent pages · 390px');
let childId = null;
let moduleKey = null;
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`parent: ${String(e).slice(0, 100)}`));
  await login(p, 'parent@gradion.id');

  await visit(p, '/dashboard');
  await auditPage(p, 'dashboard (390)', { parentView: true });
  check('dashboard · tour button not above the fold', !/Lihat tur lagi/.test(await p.locator('body').innerText()));

  await visit(p, '/dashboard/children', 2500);
  await auditPage(p, 'children (390)', { parentView: true });
  const hrefs = (await p.locator('a[href^="/dashboard/children/"]').evaluateAll((e) => e.map((x) => x.getAttribute('href'))))
    .filter((h) => /\/dashboard\/children\/\d+$/.test(h));
  for (const h of hrefs) {
    await visit(p, h, 3200);
    if (await p.locator('button:has-text("Mulai latihan hari ini"), button:has-text("Lanjutkan sesi")').count()) {
      childId = h.split('/').pop(); break;
    }
  }
  if (!childId) childId = hrefs[0]?.split('/').pop() ?? null;
  check('a child with a runnable program exists', Boolean(childId), `child ${childId}`);

  await visit(p, `/dashboard/children/${childId}`, 3500);
  await auditPage(p, 'child detail (390)', { parentView: true });

  await visit(p, `/dashboard/children/${childId}/program`, 3000);
  await auditPage(p, 'weekly program (390)', { parentView: true });

  await visit(p, '/dashboard/children/new', 2500);
  const startOver = p.locator('button:has-text("Mulai dari awal")').first();
  if (await startOver.count()) { await startOver.click(); await p.waitForTimeout(500); }
  await auditPage(p, 'add child step 1 (390)');
  await p.fill('input[type="text"]', 'Regression Probe');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1800);
  await auditPage(p, 'observation step 2 (390)');

  await visit(p, '/dashboard/modules', 2500);
  await auditPage(p, 'modules (390)');
  moduleKey = await p.locator('a[href^="/dashboard/modules/"]').first().getAttribute('href').catch(() => null);
  if (moduleKey) { await visit(p, moduleKey, 2500); await auditPage(p, 'module detail (390)'); }

  await visit(p, '/dashboard/profile', 2500);
  await auditPage(p, 'profile (390)');
  await visit(p, '/dashboard/reports', 2500);
  await auditPage(p, 'reports (390)');
  await visit(p, '/dashboard/logs', 2500);
  await auditPage(p, 'activity logs (390)');
  await visit(p, '/dashboard/goals', 2200);
  await auditPage(p, 'goals (390)');

  await ctx.close();
}

// ---------------------------------------------------------------- admin
section('Admin pages · 1440px');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`admin: ${String(e).slice(0, 100)}`));
  await login(p, 'admin@gradion.id');

  for (const [name, path] of [
    ['dashboard', '/dashboard'],
    ['children', '/dashboard/children'],
    ['AI content review', '/dashboard/admin/ai-content-review'],
    ['master programs', '/dashboard/admin/master-programs'],
    ['analytics', '/dashboard/admin/analytics'],
    ['users', '/dashboard/admin/users'],
    ['quota', '/dashboard/admin/quota'],
    ['autism cases', '/dashboard/admin/autism-cases'],
    ['learning modules', '/dashboard/admin/learning-modules'],
    ['observation template', '/dashboard/admin/initial-observation-template'],
    ['promotion codes', '/dashboard/admin/promotion-codes'],
    ['subscription plans', '/dashboard/admin/subscriptions/plans'],
    ['send email', '/dashboard/admin/send-email'],
    ['banners', '/dashboard/banners'],
    ['cms', '/dashboard/cms'],
    ['landing page', '/dashboard/landing-page'],
    ['sessions', '/dashboard/sessions'],
    ['video validation', '/dashboard/video-validation'],
    ['logs', '/dashboard/logs'],
    ['reports', '/dashboard/reports'],
    ['modules', '/dashboard/modules'],
    ['profile', '/dashboard/profile'],
  ]) {
    await visit(p, path, 2400);
    // The observation template editor legitimately still edits raw numbers.
    await auditPage(p, `${name} (1440)`, { allowSliders: path.includes('initial-observation-template') });
  }

  await visit(p, `/dashboard/children/${childId}`, 3500);
  await auditPage(p, `child detail as admin (1440)`, { allowSliders: true });
  const adminChild = await p.locator('body').innerText();
  check('admin still sees the AI token counter', /Token AI anak ini/i.test(adminChild));

  const userHref = await p.locator('a[href^="/dashboard/admin/users/"]').first().getAttribute('href').catch(() => null);
  if (userHref && /\d+$/.test(userHref)) { await visit(p, userHref, 2600); await auditPage(p, 'user detail (1440)'); }

  await ctx.close();
}

// ------------------------------------------------------- parent flows (fn)
section('Parent functional flows');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`flow: ${String(e).slice(0, 100)}`));
  await login(p, 'parent@gradion.id');

  // Close any session an earlier run left open.
  await visit(p, `/dashboard/children/${childId}/program`, 3000);
  if (await p.locator('button:has-text("Lanjutkan sesi")').count()) {
    await p.locator('button:has-text("Lanjutkan sesi")').first().click();
    await p.waitForURL('**/aba-program*', { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const fin = p.locator('button:has-text("Akhiri sesi & simpan hasil"), button:has-text("Kirim hasil")').first();
    if (await fin.count()) { await fin.click(); await p.waitForTimeout(3500); }
  }

  // Dashboard → weekly program → session, in two taps.
  await visit(p, '/dashboard', 2500);
  await p.locator('a:has-text("Mulai latihan")').first().click();
  await p.waitForURL('**/program', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2200);
  check('dashboard CTA opens the weekly program', /\/program$/.test(p.url()), p.url());

  await p.locator('button:has-text("Mulai latihan hari ini"), button:has-text("Lanjutkan sesi")').first().click();
  await p.waitForURL('**/aba-program*', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  check('one tap runs the guided session', p.url().includes('/aba-program'));
  const sessionUrl = p.url();

  const cont = p.locator('button:has-text("Lanjutkan trial")').first();
  if (await cont.count()) { await cont.click(); await p.waitForTimeout(700); }

  const before = (await p.locator('body').innerText()).match(/Trial (\d+) dari (\d+)/);
  await p.locator('button:has-text("Mandiri")').first().click();
  await p.waitForTimeout(800);
  const after = (await p.locator('body').innerText()).match(/Trial (\d+) dari (\d+)/);
  check('scoring records and advances in one tap',
    Boolean(before && after) && Number(after[1]) === Number(before[1]) + 1, `${before?.[1]} → ${after?.[1]}`);
  check('no keyboard field in the trial loop', (await p.locator('#phase-target').count()) === 0);

  await p.locator('button:has-text("Dibantu")').first().click();
  await p.waitForTimeout(1900);
  check('progress autosaves', /Tersimpan|Saved/.test(await p.locator('body').innerText()));

  await p.locator('button:has-text("Batalkan trial terakhir")').first().click();
  await p.waitForTimeout(600);
  const undone = (await p.locator('body').innerText()).match(/Trial (\d+) dari (\d+)/);
  check('undo removes the last trial', Boolean(after && undone) && Number(undone[1]) === Number(after[1]),
    `${after?.[1]} → ${undone?.[1]}`);

  await visit(p, '/dashboard', 1500);
  await visit(p, sessionUrl, 3200);
  check('an interrupted session resumes with its trials',
    /Sesi dilanjutkan/.test(await p.locator('body').innerText()));

  await p.locator('button:has-text("Akhiri sesi & simpan hasil")').first().click();
  await p.waitForTimeout(4000);
  check('ending early keeps the results', !p.url().includes('/aba-program'), p.url());

  // Observation validation.
  await visit(p, '/dashboard/children/new', 2500);
  const over = p.locator('button:has-text("Mulai dari awal")').first();
  if (await over.count()) { await over.click(); await p.waitForTimeout(500); }
  await p.fill('input[type="text"]', 'Regression Probe');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1600);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1600);
  const obs = await p.locator('body').innerText();
  check('observation blocks submit and counts the gaps', /kolom wajib yang belum diisi/.test(obs));
  check('gaps are marked at the field', (await p.locator('text=Belum diisi').count()) > 0);
  check('observation uses anchored choices, not percentages',
    /Hampir selalu/.test(obs) && /Seberapa sering/i.test(obs) && !/\(%\)/.test(obs));
  const neverBtn = p.locator('button:has-text("Tidak pernah")').first();
  await neverBtn.click(); await p.waitForTimeout(500);
  check('"Tidak pernah" answers severity too',
    (await p.locator('legend').filter({ hasText: /seberapa berat/i }).count()) <
    (await p.locator('legend').filter({ hasText: /seberapa sering/i }).count()));

  await ctx.close();
}

// -------------------------------------------------------- admin flows (fn)
section('Admin functional flows');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`adminflow: ${String(e).slice(0, 100)}`));
  await login(p, 'admin@gradion.id');

  await visit(p, '/dashboard/children', 2600);
  const searchBox = p.locator('input[placeholder*="ari"], input[type="search"]').first();
  if (await searchBox.count()) {
    await searchBox.fill('a'); await p.waitForTimeout(1200);
    check('children search responds', (await p.locator('body').innerText()).length > 200);
  } else check('children search present', false, 'no search input');

  await visit(p, '/dashboard/admin/ai-content-review', 2800);
  const review = await p.locator('body').innerText();
  check('AI content review lists items', review.length > 300);

  await visit(p, '/dashboard/admin/analytics', 3000);
  const analytics = await p.locator('body').innerText();
  check('analytics shows DAU / WAU / MAU',
    /harian|Daily/i.test(analytics) && /mingguan|Weekly/i.test(analytics) && /bulanan|Monthly/i.test(analytics));

  await visit(p, '/dashboard/admin/master-programs', 3000);
  check('master program library renders', (await p.locator('body').innerText()).length > 400);

  // Analytics date range drives every count on the page.
  await visit(p, '/dashboard/admin/analytics', 3200);
  const readCounts = async () => {
    const t = await p.locator('body').innerText();
    const grab = (re) => Number((t.match(re) || [])[1] ?? -1);
    return {
      users: grab(/(\d+)\s*\n\s*(?:Total Users|New users)/),
      aba: grab(/(\d+)\s*\n\s*(?:Have run the program|Ran it in this range)/),
      note: (t.match(/(Showing all time|Counting \d{4}-\d{2}-\d{2})/) || [])[1] ?? '',
    };
  };
  const allTime = await readCounts();
  check('analytics defaults to all time', allTime.note === 'Showing all time', JSON.stringify(allTime));

  await p.selectOption('select', '30');
  await p.waitForTimeout(3200);
  const ranged = await readCounts();
  check('analytics range narrows the counts',
    ranged.note.startsWith('Counting') && ranged.users <= allTime.users && ranged.users >= 0,
    `all-time ${allTime.users} → 30d ${ranged.users}`);
  check('analytics collapses the three active-user cards under a range',
    (await p.locator('text=Active users in range').count()) === 1,
    `${await p.locator('text=Active users in range').count()} cards`);

  // The ABA drill-down answers "how many times, what score, how long".
  const abaCard = p.locator('div.rounded-lg.border')
    .filter({ hasText: /Ran it in this range|Have run the program/ }).first();
  if (await abaCard.count()) {
    await abaCard.locator('button').first().click();
    await p.waitForTimeout(2500);
    const modal = await p.locator('body').innerText();
    check('ABA drill-down reports runs, average score and duration per child',
      /SESSIONS RUN/i.test(modal) && /AVG SCORE/i.test(modal) && /AVG DURATION/i.test(modal));
  } else {
    check('ABA drill-down reachable', false, 'no ABA metric card');
  }

  await ctx.close();
}

// ------------------------------------------------------------- backend API
section('Backend API');
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  // fetch() needs a real origin; about:blank has none.
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const token = await p.evaluate(async ({ api }) => {
    const r = await fetch(`${api}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'parent@gradion.id', password: 'password123' }),
    });
    const j = await r.json();
    return j?.data?.token || j?.token || null;
  }, { api: API });
  check('parent can authenticate against the API', Boolean(token));

  if (token) {
    const probe = async (path) => p.evaluate(async ({ api, path, token }) => {
      const r = await fetch(api + path, { headers: { Authorization: `Bearer ${token}` } });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, { api: API, path, token });

    const health = await p.evaluate(async ({ api }) => (await fetch(`${api}/health`)).status, { api: API });
    check('GET /health', health === 200, String(health));

    const kids = await probe('/children');
    check('GET /children', kids.status === 200 && Array.isArray(kids.body?.data), String(kids.status));

    const summary = await probe('/aba-program/summary');
    const row = summary.body?.data?.children?.[0];
    check('GET /aba-program/summary', summary.status === 200 && Boolean(row), String(summary.status));
    check('summary carries the new dashboard fields',
      row ? ('practice_days' in row && 'sessions_to_gate' in row && 'session_minutes' in row) : false,
      row ? Object.keys(row).filter((k) => ['practice_days', 'sessions_to_gate', 'session_minutes'].includes(k)).join(', ') : '');

    const weeks = await probe(`/aba-program/children/${childId}/weeks`);
    check(`GET /aba-program/children/${childId}/weeks`,
      weeks.status === 200 && Array.isArray(weeks.body?.data?.weeks), String(weeks.status));
  }
  await ctx.close();
}

section('Console health');
check('no uncaught page errors anywhere in the sweep', pageErrors.length === 0,
  [...new Set(pageErrors)].slice(0, 5).join(' | '));

await browser.close();

/* ------------------------------------------------------------------ report */
const failed = results.filter((r) => !r.pass);
console.log(`\n${'='.repeat(60)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`\n${failed.length} FAILED:`);
  for (const f of failed) console.log(`  [${f.group}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
  process.exit(1);
}
console.log('All green.');
