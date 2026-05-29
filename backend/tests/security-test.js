#!/usr/bin/env node

/**
 * Security Testing Suite for LangkahKecil Platform
 * Tests for common security vulnerabilities
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:5001/api';

const securityResults = {
  vulnerabilities: [],
  warnings: [],
  passed: [],
  total: 0,
};

async function apiCall(method, endpoint, data = null, token = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (data) {
      config.data = data;
    }
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status, headers: response.headers };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      headers: error.response?.headers || {},
    };
  }
}

function test(name, fn) {
  securityResults.total++;
  return async () => {
    try {
      await fn();
      securityResults.passed.push(name);
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      securityResults.vulnerabilities.push({ name, error: error.message, severity: 'HIGH' });
      console.log(`❌ VULNERABILITY: ${name} - ${error.message}`);
    }
  };
}

function warn(name, message) {
  securityResults.warnings.push({ name, message });
  console.log(`⚠️  WARNING: ${name} - ${message}`);
}

async function runSecurityTests() {
  console.log('🔒 Starting Security Testing Suite...\n');
  console.log('='.repeat(80));

  // Get test tokens
  let parentToken = null;
  let adminToken = null;
  
  try {
    const loginResult = await apiCall('POST', '/auth/login', {
      email: 'parent@gradion.id',
      password: 'password123',
    });
    if (loginResult.success) {
      parentToken = loginResult.data.data.token;
    }
  } catch (e) {
    warn('Security Tests', 'Could not get test tokens - some tests may fail');
  }

  // Ensure subscription exists so parent-log endpoints can be exercised without hitting "No subscription found".
  if (parentToken) {
    await apiCall('GET', '/subscriptions/me', null, parentToken);
  }

  try {
    const adminLogin = await apiCall('POST', '/auth/login', {
      email: 'admin@gradion.id',
      password: 'password123',
    });
    if (adminLogin.success) {
      adminToken = adminLogin.data.data.token;
    }
  } catch (e) {
    // Ignore
  }

  // ==================== SQL INJECTION TESTS ====================
  console.log('\n📋 SQL INJECTION TESTS\n');

  await test('SQL Injection in login email', async () => {
    const payloads = [
      "admin@test.com' OR '1'='1",
      "admin@test.com' OR '1'='1' --",
      "admin@test.com'; DROP TABLE users; --",
    ];
    for (const payload of payloads) {
      const result = await apiCall('POST', '/auth/login', {
        email: payload,
        password: 'password123',
      });
      if (result.success) {
        throw new Error(`SQL injection successful with payload: ${payload}`);
      }
    }
  })();

  await test('SQL Injection in search parameter', async () => {
    if (!adminToken) throw new Error('Admin token required');
    const payload = "test' OR '1'='1";
    const result = await apiCall('GET', `/admin/users?search=${encodeURIComponent(payload)}`, null, adminToken);
    // Should not crash or expose database errors
    if (result.error && result.error.toString().includes('syntax error')) {
      throw new Error('SQL syntax error exposed');
    }
  })();

  // ==================== XSS TESTS ====================
  console.log('\n📋 XSS (CROSS-SITE SCRIPTING) TESTS\n');

  await test('XSS in parent log activities', async () => {
    if (!parentToken) throw new Error('Parent token required');
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
    ];
    // These should be accepted but sanitized on display
    // If they cause errors, that's also acceptable
    for (const payload of xssPayloads) {
      const result = await apiCall('POST', '/parent-logs', {
        child_id: 1,
        skills_practiced: [{ name: 'Test', rating: 3 }],
        activities: payload,
      }, parentToken);
      // Should not crash the server
      if (result.status >= 500) {
        throw new Error(`XSS payload caused server error: ${payload}`);
      }
    }
  })();

  // ==================== AUTHORIZATION TESTS ====================
  console.log('\n📋 AUTHORIZATION TESTS\n');

  await test('Unauthenticated access to protected route', async () => {
    const result = await apiCall('GET', '/children');
    if (result.success || result.status !== 401) {
      throw new Error('Protected route accessible without authentication');
    }
  })();

  await test('Parent accessing admin route', async () => {
    if (!parentToken) throw new Error('Parent token required');
    const result = await apiCall('GET', '/admin/analytics', null, parentToken);
    if (result.success || result.status !== 403) {
      throw new Error('Parent can access admin route');
    }
  })();

  await test('Token manipulation', async () => {
    if (!parentToken) throw new Error('Parent token required');
    const tamperedToken = parentToken.slice(0, -5) + 'XXXXX';
    const result = await apiCall('GET', '/children', null, tamperedToken);
    if (result.success) {
      throw new Error('Tampered token accepted');
    }
  })();

  await test('Expired token handling', async () => {
    // Create a token with past expiration
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6InBhcmVudCIsImlhdCI6MTYwOTQ1NjgwMCwiZXhwIjoxNjA5NDU2ODAwfQ.invalid';
    const result = await apiCall('GET', '/children', null, expiredToken);
    if (result.success) {
      throw new Error('Expired token accepted');
    }
  })();

  // ==================== IDOR TESTS ====================
  console.log('\n📋 IDOR (INSECURE DIRECT OBJECT REFERENCE) TESTS\n');

  await test('Parent accessing other parent\'s child', async () => {
    if (!parentToken) throw new Error('Parent token required');
    // Try to access child with ID that doesn't belong to this parent
    const result = await apiCall('GET', '/children/999', null, parentToken);
    // Should return 403 or 404, not the child data
    if (result.success && result.data?.data) {
      throw new Error('IDOR vulnerability: Parent can access other parent\'s child');
    }
  })();

  await test('Parent creating log for other parent\'s child', async () => {
    if (!parentToken) throw new Error('Parent token required');
    const result = await apiCall('POST', '/parent-logs', {
      child_id: 999, // Assuming this doesn't belong to the parent
      skills_practiced: [{ name: 'Test', rating: 3 }],
      activities: 'Test',
    }, parentToken);
    if (result.success) {
      throw new Error('IDOR vulnerability: Parent can create log for other parent\'s child');
    }
  })();

  // ==================== RATE LIMITING TESTS ====================
  console.log('\n📋 RATE LIMITING TESTS\n');

  await test('Rate limiting on login', async () => {
    const attemptLimit = Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 10);
    const promises = [];
    for (let i = 0; i < attemptLimit + 5; i++) {
      promises.push(apiCall('POST', '/auth/login', {
        email: 'test@test.com',
        password: 'wrongpassword',
      }));
    }
    const results = await Promise.all(promises);
    const rateLimited = results.some((r) => r.status === 429);
    if (!rateLimited) {
      throw new Error('Rate limiting not enforced on login endpoint (expected 429 after repeated attempts)');
    }
  })();

  // ==================== CORS TESTS ====================
  console.log('\n📋 CORS TESTS\n');

  await test('CORS configuration', async () => {
    const result = await apiCall('OPTIONS', '/children', null, null, {
      'Origin': 'https://malicious-site.com',
      'Access-Control-Request-Method': 'GET',
    });
    // Should not allow arbitrary origins
    if (result.headers['access-control-allow-origin'] === 'https://malicious-site.com') {
      throw new Error('CORS misconfiguration: Allows arbitrary origins');
    }
  })();

  // ==================== INFORMATION DISCLOSURE TESTS ====================
  console.log('\n📋 INFORMATION DISCLOSURE TESTS\n');

  await test('Error message information disclosure', async () => {
    const result = await apiCall('POST', '/auth/login', {
      email: 'nonexistent@test.com',
      password: 'wrong',
    });
    // Error should not reveal if user exists
    if (result.error?.error?.includes('user') || result.error?.error?.includes('database')) {
      warn('Information Disclosure', 'Error messages may reveal system information');
    }
  })();

  await test('Stack trace exposure', async () => {
    // Try to trigger an error
    const result = await apiCall('POST', '/auth/login', {
      email: null, // Invalid input
      password: null,
    });
    if (result.error && (result.error.toString().includes('stack') || result.error.toString().includes('at '))) {
      throw new Error('Stack traces exposed in error messages');
    }
  })();

  // ==================== FILE UPLOAD TESTS ====================
  console.log('\n📋 FILE UPLOAD SECURITY TESTS\n');

  await test('File type validation', async () => {
    if (!adminToken) {
      warn('File Upload', 'Admin token required for file upload tests');
      return;
    }
    // This would require multipart form data
    warn('File Upload', 'File upload security requires manual testing with actual files');
  })();

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n🔒 SECURITY TEST SUMMARY\n');
  console.log(`Total Tests: ${securityResults.total}`);
  console.log(`✅ Passed: ${securityResults.passed.length}`);
  console.log(`❌ Vulnerabilities Found: ${securityResults.vulnerabilities.length}`);
  console.log(`⚠️  Warnings: ${securityResults.warnings.length}`);

  if (securityResults.vulnerabilities.length > 0) {
    console.log('\n❌ VULNERABILITIES:');
    securityResults.vulnerabilities.forEach((v) => {
      console.log(`  [${v.severity}] ${v.name}: ${v.error}`);
    });
  }

  if (securityResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    securityResults.warnings.forEach((w) => {
      console.log(`  - ${w.name}: ${w.message}`);
    });
  }

  const securityScore = ((securityResults.passed.length / securityResults.total) * 100).toFixed(2);
  console.log(`\n📈 Security Score: ${securityScore}%`);

  if (securityResults.vulnerabilities.length > 0) {
    console.log('\n⚠️  CRITICAL: Security vulnerabilities found!');
    process.exit(1);
  }
}

runSecurityTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

