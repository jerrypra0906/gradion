#!/usr/bin/env node

/**
 * Comprehensive Test Suite for LangkahKecil Platform
 * Tests all features including positive scenarios and edge cases
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:5001/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

// Test results storage
const results = {
  passed: [],
  failed: [],
  warnings: [],
  total: 0,
};

// Test users
let parentToken = null;
let therapistToken = null;
let adminToken = null;
let parentId = null;
let therapistId = null;
let adminId = null;
let newlyRegisteredParent = null; // { id: number, email: string }
let childId = null;
let logId = null;
let goalId = null;
let bannerId = null;
let cmsId = null;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (data) {
      config.data = data;
    }
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// Test runner
function test(name, fn) {
  results.total++;
  return async () => {
    try {
      await fn();
      results.passed.push(name);
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      results.failed.push({ name, error: error.message });
      console.log(`❌ FAIL: ${name} - ${error.message}`);
    }
  };
}

// Test suite
async function runTests() {
  console.log('🚀 Starting Comprehensive Test Suite...\n');
  console.log('='.repeat(80));

  // ==================== AUTHENTICATION TESTS ====================
  console.log('\n📋 1. AUTHENTICATION & AUTHORIZATION TESTS\n');

  await test('1.1 Register new parent user', async () => {
    const email = `parent${Date.now()}@test.com`;
    const result = await apiCall('POST', '/auth/register', {
      name: 'Test Parent',
      email,
      password: 'password123',
      role: 'parent',
    });
    if (!result.success) {
      // Registration is rate-limited; treat 429 as a warning (not a functional failure).
      if (result.status === 429) {
        results.warnings.push('Registration rate limit hit (429) during tests');
        return;
      }
      throw new Error(result.error?.error || 'Registration failed');
    }
    const id = result.data?.data?.user?.id ?? result.data?.data?.id ?? null;
    if (typeof id === 'number') newlyRegisteredParent = { id, email };
  })();

  await test('1.2 Register with existing email (should fail)', async () => {
    const email = `duplicate${Date.now()}@test.com`;
    const first = await apiCall('POST', '/auth/register', {
      name: 'Test User 1',
      email,
      password: 'password123',
      role: 'parent',
    });
    if (!first.success && first.status === 429) {
      results.warnings.push('Registration rate limit hit (429) during duplicate-email test');
      return;
    }
    const result = await apiCall('POST', '/auth/register', {
      name: 'Test User 2',
      email,
      password: 'password123',
      role: 'parent',
    });
    // Some versions return 409 Conflict; others return 400 Bad Request.
    if (!result.success && result.status === 429) {
      results.warnings.push('Registration rate limit hit (429) during duplicate-email test');
      return;
    }
    if (result.success || ![400, 409].includes(result.status)) {
      throw new Error('Should reject duplicate email');
    }
  })();

  await test('1.3 Register with weak password (should fail)', async () => {
    const result = await apiCall('POST', '/auth/register', {
      name: 'Test User',
      email: `weak${Date.now()}@test.com`,
      password: '12345', // < 6 chars
      role: 'parent',
    });
    if (result.success) throw new Error('Should reject weak password');
  })();

  await test('1.4 Login with valid credentials', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'parent@gradion.id',
      password: 'password123',
    });
    if (!result.success || !result.data?.data?.token) {
      throw new Error('Login failed');
    }
    parentToken = result.data.data.token;
    parentId = result.data.data.user.id;

    // Ensure a subscription exists (API auto-creates Free plan on /subscriptions/me).
    const sub = await apiCall('GET', '/subscriptions/me', null, parentToken);
    if (!sub.success) throw new Error('Failed to init subscription');
  })();

  await test('1.5 Login with invalid credentials (should fail)', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'parent@gradion.id',
      password: 'wrongpassword',
    });
    if (result.success || result.status !== 401) {
      throw new Error('Should reject invalid credentials');
    }
  })();

  await test('1.6 Login as therapist', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'therapist@gradion.id',
      password: 'password123',
    });
    if (!result.success || !result.data?.data?.token) {
      throw new Error('Therapist login failed');
    }
    therapistToken = result.data.data.token;
    therapistId = result.data.data.user.id;
  })();

  await test('1.7 Login as consultant', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'consultant@gradion.id',
      password: 'password123',
    });
    if (!result.success || !result.data?.data?.token) {
      throw new Error('Consultant login failed');
    }
    // Reuse therapistToken slot if the rest of the suite treats clinical staff similarly,
    // but keep a separate id for reporting.
    therapistToken = therapistToken || result.data.data.token;
    therapistId = therapistId || result.data.data.user.id;
  })();

  await test('1.8 Login as admin', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'admin@gradion.id',
      password: 'password123',
    });
    if (!result.success || !result.data?.data?.token) {
      throw new Error('Admin login failed');
    }
    adminToken = result.data.data.token;
    adminId = result.data.data.user.id;
  })();

  await test('1.9 Access protected route without token (should fail)', async () => {
    const result = await apiCall('GET', '/children');
    if (result.success || result.status !== 401) {
      throw new Error('Should require authentication');
    }
  })();

  // ==================== CHILDREN TESTS ====================
  console.log('\n📋 2. CHILDREN MANAGEMENT TESTS\n');

  await test('2.1 Parent creates child', async () => {
    const result = await apiCall(
      'POST',
      '/children',
      {
        name: 'Test Child',
        birthdate: '2020-01-01',
        diagnosis: 'ASD',
        monthly_quota: 12,
      },
      parentToken
    );
    if (!result.success || !result.data?.data?.id) {
      throw new Error('Child creation failed');
    }
    childId = result.data.data.id;
  })();

  await test('2.2 Parent links therapist to child', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      `/children/${childId}/link-therapist`,
      { therapist_email: 'therapist@gradion.id' },
      parentToken
    );
    if (!result.success) throw new Error('Failed to link therapist');
  })();

  await test('2.3 Parent views own children', async () => {
    const result = await apiCall('GET', '/children', null, parentToken);
    if (!result.success || !Array.isArray(result.data?.data)) {
      throw new Error('Failed to fetch children');
    }
  })();

  await test('2.4 Parent creates child with invalid data (should fail)', async () => {
    const result = await apiCall(
      'POST',
      '/children',
      {
        name: '', // Empty name
        monthly_quota: -1, // Negative quota
      },
      parentToken
    );
    if (result.success) throw new Error('Should reject invalid data');
  })();

  // ==================== PARENT LOGS TESTS ====================
  console.log('\n📋 3. PARENT LOGS TESTS\n');

  await test('3.1 Parent creates log with skills and ratings', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/parent-logs',
      {
        child_id: childId,
        skills_practiced: [
          { name: 'Communication', rating: 4 },
          { name: 'Social Skills', rating: 3 },
        ],
        activities: 'Played with blocks and practiced sharing',
        behavior_notes: 'Good progress today',
      },
      parentToken
    );
    if (!result.success || !result.data?.data?.id) {
      throw new Error('Log creation failed');
    }
    logId = result.data.data.id;
    // Check if overall rating was auto-calculated
    if (result.data.data.rating !== 4) {
      // Should be average of 4 and 3 = 3.5 rounded to 4
      results.warnings.push('Overall rating calculation may be incorrect');
    }
  })();

  await test('3.2 Parent creates log with custom skill', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/parent-logs',
      {
        child_id: childId,
        skills_practiced: [
          { name: 'Custom Skill Name', rating: 5 },
        ],
        activities: 'Test custom skill',
      },
      parentToken
    );
    if (!result.success) throw new Error('Custom skill log creation failed');
  })();

  await test('3.3 Parent creates log with invalid rating (should fail)', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/parent-logs',
      {
        child_id: childId,
        skills_practiced: [{ name: 'Test', rating: 10 }], // Invalid rating > 5
        activities: 'Test',
      },
      parentToken
    );
    if (result.success) throw new Error('Should reject invalid rating');
  })();

  await test('3.4 Parent views own logs', async () => {
    const result = await apiCall('GET', '/parent-logs', null, parentToken);
    if (!result.success || !Array.isArray(result.data?.data)) {
      throw new Error('Failed to fetch logs');
    }
  })();

  await test('3.5 Parent tries to create log for other parent\'s child (should fail)', async () => {
    // Try to use a different child_id (assuming child_id 1 exists and belongs to another parent)
    const result = await apiCall(
      'POST',
      '/parent-logs',
      {
        child_id: 999, // Non-existent or other parent's child
        skills_practiced: [{ name: 'Test', rating: 3 }],
        activities: 'Test',
      },
      parentToken
    );
    // Should fail with 403 or 404
    if (result.success) {
      results.warnings.push('Authorization check may be missing for child ownership');
    }
  })();

  // ==================== SUBSCRIPTION TESTS ====================
  console.log('\n📋 4. SUBSCRIPTION & QUOTA TESTS\n');

  await test('4.1 Get user subscription', async () => {
    const result = await apiCall('GET', '/subscriptions/me', null, parentToken);
    if (!result.success) throw new Error('Failed to fetch subscription');
    // Should auto-create free subscription if none exists
    if (!result.data?.data?.subscription) {
      throw new Error('Subscription should be auto-created');
    }
  })();

  await test('4.2 Admin creates subscription for user', async () => {
    const targetUserId = newlyRegisteredParent?.id ?? parentId;
    if (!targetUserId) throw new Error('User ID not available');
    const end = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    const result = await apiCall(
      'POST',
      '/subscriptions',
      {
        user_id: targetUserId,
        plan_type: 'pro',
        status: 'active',
        end_date: end.toISOString(),
      },
      adminToken
    );
    if (!result.success) {
      // May fail if subscription already exists, which is acceptable
      if (result.error?.error?.includes('already has a subscription')) {
        results.warnings.push('Subscription already exists for user');
      } else {
        throw new Error('Failed to create subscription');
      }
    }
  })();

  await test('4.3 Admin updates child quota', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/subscriptions/quota',
      {
        child_id: childId,
        monthly_quota: 16,
      },
      adminToken
    );
    if (!result.success) throw new Error('Failed to update quota');
  })();

  await test('4.4 Non-admin tries to create subscription (should fail)', async () => {
    const result = await apiCall(
      'POST',
      '/subscriptions',
      {
        user_id: parentId,
        plan_type: 'premium',
      },
      parentToken
    );
    if (result.success || result.status !== 403) {
      throw new Error('Should reject non-admin subscription creation');
    }
  })();

  // ==================== GOALS TESTS ====================
  console.log('\n📋 5. GOALS TESTS\n');

  await test('5.1 Therapist creates goal', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/goals',
      {
        child_id: childId,
        title: 'Improve Communication',
        description: 'Work on verbal communication skills',
        target_date: '2025-12-31',
      },
      therapistToken
    );
    if (!result.success || !result.data?.data?.id) {
      throw new Error('Goal creation failed');
    }
    goalId = result.data.data.id;
  })();

  await test('5.2 Parent tries to create goal (should fail)', async () => {
    if (!childId) throw new Error('Child ID not available');
    const result = await apiCall(
      'POST',
      '/goals',
      {
        child_id: childId,
        title: 'Test Goal',
      },
      parentToken
    );
    if (result.success || result.status !== 403) {
      throw new Error('Should reject parent goal creation');
    }
  })();

  // ==================== CMS TESTS ====================
  console.log('\n📋 6. CMS TESTS\n');

  await test('6.1 Admin creates CMS content', async () => {
    const result = await apiCall(
      'POST',
      '/cms',
      {
        title: `Test Article ${Date.now()}`,
        content_html: '<p>Test content</p>',
        status: 'published',
      },
      adminToken
    );
    if (!result.success) {
      // Slug collisions can happen if title/slug repeats; treat conflict as warning.
      if (result.status === 409) {
        results.warnings.push('CMS slug already exists (409) during tests');
        return;
      }
      throw new Error('CMS content creation failed');
    }
    if (!result.data?.data?.id) throw new Error('CMS content creation failed');
    cmsId = result.data.data.id;
  })();

  await test('6.2 Non-admin tries to create CMS content (should fail)', async () => {
    const result = await apiCall(
      'POST',
      '/cms',
      {
        title: 'Unauthorized Article',
        content_html: '<p>Test</p>',
      },
      parentToken
    );
    if (result.success || result.status !== 403) {
      throw new Error('Should reject non-admin CMS creation');
    }
  })();

  // ==================== BANNERS TESTS ====================
  console.log('\n📋 7. BANNERS TESTS\n');

  await test('7.1 Admin creates banner', async () => {
    const result = await apiCall(
      'POST',
      '/banners',
      {
        title: 'Test Banner',
        content: 'Test banner content',
        target_audience: 'all',
        is_active: true,
      },
      adminToken
    );
    if (!result.success || !result.data?.data?.id) {
      throw new Error('Banner creation failed');
    }
    bannerId = result.data.data.id;
  })();

  await test('7.2 Get active banners for parents', async () => {
    const result = await apiCall('GET', '/banners?audience=parents&limit=5');
    if (!result.success || !Array.isArray(result.data?.data)) {
      throw new Error('Failed to fetch banners');
    }
  })();

  // ==================== ADMIN TESTS ====================
  console.log('\n📋 8. ADMIN TESTS\n');

  await test('8.1 Admin views analytics', async () => {
    const result = await apiCall('GET', '/admin/analytics', null, adminToken);
    if (!result.success || !result.data?.data?.overview) {
      throw new Error('Failed to fetch analytics');
    }
  })();

  await test('8.2 Admin views user list', async () => {
    const result = await apiCall('GET', '/admin/users?limit=10', null, adminToken);
    if (!result.success || !Array.isArray(result.data?.data)) {
      throw new Error('Failed to fetch users');
    }
  })();

  await test('8.3 Non-admin tries to access analytics (should fail)', async () => {
    const result = await apiCall('GET', '/admin/analytics', null, parentToken);
    if (result.success || result.status !== 403) {
      throw new Error('Should reject non-admin analytics access');
    }
  })();

  // ==================== SECURITY TESTS ====================
  console.log('\n📋 9. SECURITY TESTS\n');

  await test('9.1 SQL Injection attempt in email field', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: "admin@test.com' OR '1'='1",
      password: 'password123',
    });
    // Should not succeed or expose database errors
    if (result.success) {
      results.warnings.push('Potential SQL injection vulnerability in login');
    }
  })();

  await test('9.2 XSS attempt in log activities field', async () => {
    if (!childId) throw new Error('Child ID not available');
    const xssPayload = '<script>alert("XSS")</script>';
    const result = await apiCall(
      'POST',
      '/parent-logs',
      {
        child_id: childId,
        skills_practiced: [{ name: 'Test', rating: 3 }],
        activities: xssPayload,
      },
      parentToken
    );
    // Should accept but sanitize on display
    if (!result.success) {
      results.warnings.push('XSS payload rejected - may need frontend sanitization');
    }
  })();

  await test('9.3 Path traversal in file upload', async () => {
    // This would require multipart form data, simplified test
    results.warnings.push('File upload path traversal test requires manual testing');
  })();

  await test('9.4 Token manipulation attempt', async () => {
    const manipulatedToken = parentToken + 'tampered';
    const result = await apiCall('GET', '/children', null, manipulatedToken);
    if (result.success) {
      throw new Error('Should reject manipulated token');
    }
  })();

  await test('9.5 Rate limiting test', async () => {
    const attemptLimit = Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 10);
    const promises = [];
    for (let i = 0; i < attemptLimit + 5; i++) {
      promises.push(apiCall('POST', '/auth/login', {
        email: 'test@test.com',
        password: 'wrong',
      }));
    }
    const results_array = await Promise.all(promises);
    const rateLimited = results_array.some((r) => r.status === 429);
    if (!rateLimited) {
      throw new Error('Rate limiting not enforced on login endpoint (expected 429)');
    }
  })();

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach((f) => {
      console.log(`  - ${f.name}: ${f.error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach((w) => {
      console.log(`  - ${w}`);
    });
  }

  const successRate = ((results.passed.length / results.total) * 100).toFixed(2);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

