#!/usr/bin/env node

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function apiRequest(path, { method = 'GET', headers = {}, body } = {}, token) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || text || `HTTP ${response.status}`;
    const error = new Error(`${method} ${path} failed: ${message}`);
    error.response = { status: response.status, data };
    throw error;
  }

  return data;
}

async function login(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!result?.data?.token) {
    throw new Error('Login response missing token');
  }
  return result.data;
}

async function run() {
  const results = [];
  async function step(name, fn) {
    try {
      const value = await fn();
      results.push({ name, status: 'PASS' });
      return value;
    } catch (error) {
      results.push({
        name,
        status: 'FAIL',
        error: error.message,
      });
      throw error;
    }
  }

  console.log('🚀 Running LangkahKecil smoke tests against', API_BASE);

  await step('Health endpoint responds', async () => {
    const res = await apiRequest('/health');
    if (res?.status !== 'ok') throw new Error('Unexpected health payload');
  });

  // Admin flow
  const admin = await step('Admin login', () =>
    login('admin@langkahkecil.com', 'password123')
  );

  await step('Admin can list CMS content', () =>
    apiRequest('/cms/admin', {}, admin.token)
  );

  await step('Admin can list banners', () =>
    apiRequest('/banners/admin', {}, admin.token)
  );

  // Parent flow
  const parent = await step('Parent login', () =>
    login('parent@langkahkecil.com', 'password123')
  );

  const children = await step('Parent can list children', () =>
    apiRequest('/children', {}, parent.token)
  );

  if (!children?.data?.length) {
    throw new Error('Parent has no children to run tests against');
  }

  const child = children.data[0];

  await step('Parent can fetch reports', () =>
    apiRequest(`/reports/child/${child.id}`, {}, parent.token)
  );

  await step('Parent can create activity log', () =>
    apiRequest('/parent-logs', {
      method: 'POST',
      body: {
        child_id: child.id,
        log_date: new Date().toISOString(),
        skills_practiced: [
          { name: 'Eye Contact', rating: 4 },
          { name: 'Communication', rating: 3 },
        ],
        activities: 'Home practice session with AAC device.',
        rating: 4,
        behavior_notes: 'Engaged well, mild distraction halfway.',
      },
    }, parent.token)
  );

  // Therapist flow
  const therapist = await step('Therapist login', () =>
    login('therapist@langkahkecil.com', 'password123')
  );

  await step('Therapist can view assigned children', () =>
    apiRequest('/children', {}, therapist.token)
  );

  await step('Therapist can view sessions for assigned child', () =>
    apiRequest(`/sessions/child/${child.id}`, {}, therapist.token)
  );

  await step('Therapist can list goals', () =>
    apiRequest('/goals', {}, therapist.token)
  );

  console.log('\n✅ Smoke test summary:');
  for (const result of results) {
    if (result.status === 'PASS') {
      console.log(`  • ${result.name}: PASS`);
    } else {
      console.log(`  • ${result.name}: FAIL – ${result.error}`);
    }
  }
}

run().catch((error) => {
  console.error('\n❌ Smoke tests failed:', error.message);
  process.exit(1);
});

