/**
 * Comprehensive API tests for ABA Agent AI features + Initial Observation CMS.
 * Run: node backend/tests/aba-features-test.js
 */
import axios from 'axios';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const API = process.env.API_URL || 'http://localhost:5001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gradion.id';
const PARENT_EMAIL = process.env.PARENT_EMAIL || 'parent@gradion.id';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';
const TIMEOUT = 15000;

const client = axios.create({ timeout: TIMEOUT, validateStatus: () => true });

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function login(email) {
  const res = await client.post(`${API}/auth/login`, { email, password: PASSWORD });
  if (!res.data?.success || !res.data?.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.token;
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function resetParentAiTokens() {
  try {
    execSync(
      `docker compose exec -T postgres psql -U gradion_user -d gradion -c "UPDATE ai_token_wallets SET current_token_usage = 0, monthly_token_limit = GREATEST(monthly_token_limit, 200000) WHERE user_id = (SELECT id FROM users WHERE email = '${PARENT_EMAIL}');"`,
      { cwd: REPO_ROOT, stdio: 'pipe' }
    );
    pass('Reset parent AI token wallet for tests');
  } catch (e) {
    fail('Reset parent AI token wallet for tests', e.message);
  }
}

async function run() {
  console.log(`\nTesting API at ${API}\n`);

  resetParentAiTokens();

  let adminToken;
  let parentToken;
  try {
    adminToken = await login(ADMIN_EMAIL);
    pass('Admin login');
  } catch (e) {
    fail('Admin login', e.message);
    return summarize();
  }

  try {
    parentToken = await login(PARENT_EMAIL);
    pass('Parent login');
  } catch (e) {
    fail('Parent login', e.message);
    return summarize();
  }

  // --- Admin: autism cases ---
  {
    const list = await client.get(`${API}/admin/aba-autism-cases?take=50`, auth(adminToken));
    if (list.status === 200 && list.data.success) {
      pass('Admin list autism cases', `total=${list.data.data?.total ?? 0}`);
    } else fail('Admin list autism cases', list.data?.error || `status=${list.status}`);
  }

  {
    const seed = await client.post(`${API}/admin/aba-autism-cases/seed-mock`, {}, auth(adminToken));
    if (seed.status === 200 && seed.data.success) {
      pass('Admin seed mock autism cases', JSON.stringify(seed.data.data));
    } else fail('Admin seed mock autism cases', seed.data?.error || `status=${seed.status}`);
  }

  {
    const mockOnly = await client.get(`${API}/admin/aba-autism-cases?source=mock&take=25`, auth(adminToken));
    if (mockOnly.status === 200 && (mockOnly.data.data?.total ?? 0) >= 20) {
      pass('Admin filter mock autism cases', `mock=${mockOnly.data.data.total}`);
    } else fail('Admin filter mock autism cases', `total=${mockOnly.data.data?.total}`);
  }

  {
    const res = await client.get(`${API}/admin/aba-autism-cases?take=5`, auth(parentToken));
    if (res.status === 403) pass('Parent blocked from admin autism cases');
    else fail('Parent blocked from admin autism cases', `status=${res.status}`);
  }

  // --- Admin: master programs ---
  {
    const mp = await client.get(`${API}/admin/aba-master-programs?lang=id&take=10`, auth(adminToken));
    if (mp.status === 200 && mp.data.success) {
      pass('Admin list master programs', `total=${mp.data.data?.total ?? 0}`);
    } else fail('Admin list master programs', mp.data?.error);
  }

  // --- Parent: IO template active ---
  {
    const tpl = await client.get(`${API}/children/initial-observation-template/active`, auth(parentToken));
    if (tpl.status === 200 && tpl.data.success && tpl.data.data?.template_json?.sections?.length) {
      pass('Parent fetch active IO template', `sections=${tpl.data.data.template_json.sections.length}`);
    } else {
      fail('Parent fetch active IO template', tpl.data?.error || `status=${tpl.status}`);
    }
  }

  {
    const res = await client.get(`${API}/children/initial-observation-template/active`);
    if (res.status === 401) pass('Unauthenticated blocked from IO template');
    else fail('Unauthenticated blocked from IO template', `status=${res.status}`);
  }

  // --- Parent: create child with observation ---
  let childId;
  {
    const obs = buildMinimalObservation();
    const create = await client.post(
      `${API}/children`,
      {
        name: `Test Child ${Date.now()}`,
        monthly_quota: 12,
        lang: 'en',
        initial_observation: obs,
      },
      { ...auth(parentToken), timeout: 120000 }
    );
    if (create.status === 200 && create.data.success && create.data.data?.id) {
      childId = create.data.data.id;
      pass('Parent create child with initial observation', `childId=${childId}`);
    } else {
      fail('Parent create child with initial observation', create.data?.error || `status=${create.status}`);
    }
  }

  // --- Negative: invalid week_start ---
  if (childId) {
    const bad = await client.post(
      `${API}/aba-program/children/${childId}/weeks/generate`,
      { week_start: 'not-a-date', lang: 'en' },
      auth(parentToken)
    );
    if (bad.status === 400) pass('Generate ABA rejects invalid week_start');
    else fail('Generate ABA rejects invalid week_start', `status=${bad.status}`);
  }

  // --- Negative: missing week_start ---
  if (childId) {
    const bad = await client.post(
      `${API}/aba-program/children/${childId}/weeks/generate`,
      { lang: 'en' },
      auth(parentToken)
    );
    if (bad.status === 400) pass('Generate ABA rejects missing week_start');
    else fail('Generate ABA rejects missing week_start', `status=${bad.status}`);
  }

  // --- Positive: generate ABA when assessment exists (may take ~30-60s) ---
  if (childId) {
    const gen = await client.post(
      `${API}/aba-program/children/${childId}/weeks/generate`,
      { week_start: '2026-06-23', lang: 'en' },
      { ...auth(parentToken), timeout: 120000 }
    );
    if (gen.status === 200 && gen.data.success && gen.data.data?.week?.plan_json?.programs?.length) {
      pass(
        'Parent generate weekly ABA program',
        `programs=${gen.data.data.week.plan_json.programs.length}, tokens=${gen.data.data.tokens_used}`
      );
    } else {
      fail('Parent generate weekly ABA program', gen.data?.error || `status=${gen.status}`);
    }
  }

  // --- Verify generated autism case appears in admin library ---
  if (childId) {
    const cases = await client.get(`${API}/admin/aba-autism-cases?source=generated&take=50`, auth(adminToken));
    const rows = cases.data.data?.rows || [];
    const found = rows.some((r) => r.child_id === childId);
    if (found) pass('Generated autism case synced to admin library', `childId=${childId}`);
    else fail('Generated autism case synced to admin library', `childId=${childId} not found`);
  }

  // --- Admin IO template list ---
  {
    const templates = await client.get(`${API}/admin/initial-observation-templates`, auth(adminToken));
    if (templates.status === 200 && templates.data.success && (templates.data.data?.length ?? 0) > 0) {
      pass('Admin list IO templates', `count=${templates.data.data.length}`);
    } else fail('Admin list IO templates', templates.data?.error || 'empty');
  }

  // --- List ABA weeks for child ---
  if (childId) {
    const weeks = await client.get(`${API}/aba-program/children/${childId}/weeks`, auth(parentToken));
    if (weeks.status === 200 && weeks.data.success) {
      const count = weeks.data.data?.weeks?.length ?? 0;
      if (count > 0) pass('Parent list ABA program weeks', `weeks=${count}`);
      else fail('Parent list ABA program weeks', 'no weeks returned');
    } else fail('Parent list ABA program weeks', weeks.data?.error || `status=${weeks.status}`);
  }

  return summarize();
}

function buildMinimalObservation() {
  return {
    version: 1,
    completedAt: new Date().toISOString(),
    obs1: {
      behaviors: {
        tantrums: { f: 2, s: 2 },
        self_abuse: { f: 1, s: 1 },
        aggression: { f: 2, s: 2 },
        self_stim: { f: 3, s: 2 },
        other_major_1: { label: null, f: 1, s: 1 },
        other_major_2: { label: null, f: 1, s: 1 },
        leaves_work_area: { f: 2, s: 2 },
        hands_feet_restless: { f: 3, s: 2 },
      },
      attention_span_minutes: 5,
      eye_contact: { on_request_pct: 30, name_called_pct: 25, talking_listening_pct: 20 },
      looking_at_task_materials_pct: 40,
      follows_simple_directives_with_gestures_pct: 35,
      compliance_pct: {
        come_here_5ft: 50,
        come_from_across_room: 40,
        come_from_other_parts_house: 30,
        come_outside_close_confined: 20,
        come_outside_longer_distance: 10,
        sit_down: 60,
        stand_up: 55,
        hands_down: 45,
      },
    },
  };
}

function summarize() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
