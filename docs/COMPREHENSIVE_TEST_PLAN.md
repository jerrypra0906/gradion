# Comprehensive Test Plan - LangkahKecil Platform

## Test Coverage Overview

This document covers all implemented features with positive scenarios, edge cases, and security testing.

---

## 1. Authentication & Authorization

### 1.1 User Registration
**Positive Scenarios:**
- ✅ Register with valid email and password
- ✅ Register with Google OAuth
- ✅ Email verification flow
- ✅ Resend verification email

**Edge Cases:**
- ❌ Register with existing email (should fail)
- ❌ Register with invalid email format
- ❌ Register with weak password (< 6 chars)
- ❌ Register with empty fields
- ❌ Register with SQL injection attempt in email
- ❌ Register with XSS attempt in name field
- ❌ Rate limiting on registration (multiple rapid attempts)

### 1.2 User Login
**Positive Scenarios:**
- ✅ Login with valid credentials
- ✅ Login with Google OAuth
- ✅ JWT token generation and validation
- ✅ Token refresh mechanism

**Edge Cases:**
- ❌ Login with invalid email
- ❌ Login with wrong password
- ❌ Login with non-existent user
- ❌ Login with unverified email
- ❌ Login with SQL injection in email
- ❌ Rate limiting on login attempts
- ❌ Token expiration handling
- ❌ Token tampering attempts

### 1.3 Authorization
**Positive Scenarios:**
- ✅ Parent can access parent-only routes
- ✅ Therapist can access therapist-only routes
- ✅ Admin can access admin-only routes

**Edge Cases:**
- ❌ Parent trying to access therapist routes
- ❌ Therapist trying to access admin routes
- ❌ Unauthenticated user trying to access protected routes
- ❌ Token manipulation to escalate privileges
- ❌ Accessing other user's data by ID manipulation

---

## 2. Parent Logs System

### 2.1 Create Parent Log
**Positive Scenarios:**
- ✅ Create log with valid data
- ✅ Create log with multiple skills and ratings
- ✅ Create log with custom skills
- ✅ Auto-calculate overall rating from skill ratings
- ✅ Create log with behavior notes
- ✅ Create log with future date (if allowed)

**Edge Cases:**
- ❌ Create log without required fields
- ❌ Create log with invalid child_id (not owned by parent)
- ❌ Create log with invalid skill ratings (outside 1-5)
- ❌ Create log exceeding monthly quota
- ❌ Create log with XSS in activities field
- ❌ Create log with SQL injection in notes
- ❌ Create log with extremely long text (>10KB)
- ❌ Create log with special characters/emoji
- ❌ Create log when subscription expired

### 2.2 View Parent Logs
**Positive Scenarios:**
- ✅ Parent views own logs
- ✅ Therapist views assigned children's logs
- ✅ Admin views all logs
- ✅ Filter logs by status (pending/approved/flagged)
- ✅ Filter logs by date range
- ✅ Pagination works correctly

**Edge Cases:**
- ❌ Parent trying to view other parent's logs
- ❌ Therapist trying to view unassigned child's logs
- ❌ Access logs with invalid pagination (negative page)
- ❌ Access logs with extremely large page number
- ❌ SQL injection in filter parameters

### 2.3 Update Parent Log
**Positive Scenarios:**
- ✅ Update log with valid data
- ✅ Update skills and ratings
- ✅ Update activities and notes

**Edge Cases:**
- ❌ Update log owned by another parent
- ❌ Update log that's already approved
- ❌ Update with invalid data
- ❌ Update with XSS payload

### 2.4 Review Parent Log (Therapist)
**Positive Scenarios:**
- ✅ Therapist approves log
- ✅ Therapist flags log with comment
- ✅ Therapist adds comment to log

**Edge Cases:**
- ❌ Therapist reviewing unassigned child's log
- ❌ Therapist reviewing already reviewed log
- ❌ XSS in therapist comment
- ❌ SQL injection in comment

---

## 3. Goals & Programs System

### 3.1 Create Goal
**Positive Scenarios:**
- ✅ Therapist creates goal for assigned child
- ✅ Set target date
- ✅ Add description and progress notes
- ✅ Admin creates goal for any child

**Edge Cases:**
- ❌ Therapist creating goal for unassigned child
- ❌ Parent trying to create goal
- ❌ Create goal with past target date
- ❌ Create goal with invalid child_id
- ❌ XSS in goal description
- ❌ SQL injection in goal title

### 3.2 View Goals
**Positive Scenarios:**
- ✅ Parent views goals for their children
- ✅ Therapist views goals for assigned children
- ✅ Filter by status (active/completed/paused/cancelled)
- ✅ Filter by child

**Edge Cases:**
- ❌ Parent viewing goals for other children
- ❌ Therapist viewing goals for unassigned children
- ❌ SQL injection in filter parameters

### 3.3 Update Goal
**Positive Scenarios:**
- ✅ Update goal status
- ✅ Update progress notes
- ✅ Update target date

**Edge Cases:**
- ❌ Update goal owned by another therapist
- ❌ Update with invalid status
- ❌ XSS in progress notes

---

## 4. Reports & Charts

### 4.1 Generate Reports
**Positive Scenarios:**
- ✅ Generate report for valid child
- ✅ Generate report with date range
- ✅ View skills frequency chart
- ✅ View progress over time
- ✅ Export report data

**Edge Cases:**
- ❌ Generate report for child not owned by parent
- ❌ Generate report with invalid date range
- ❌ Generate report with SQL injection in parameters
- ❌ Generate report for child with no data
- ❌ Extremely large date range causing performance issues

---

## 5. CMS (Content Management System)

### 5.1 Create CMS Content
**Positive Scenarios:**
- ✅ Admin creates content with HTML
- ✅ Auto-generate slug from title
- ✅ Set publish/unpublish dates
- ✅ Link content to banner
- ✅ Set status (draft/published/scheduled/archived)

**Edge Cases:**
- ❌ Non-admin trying to create content
- ❌ Create content with duplicate slug
- ❌ Create content with invalid HTML
- ❌ XSS in HTML content
- ❌ SQL injection in title
- ❌ Extremely long content (>1MB)
- ❌ Invalid date ranges (unpublish before publish)

### 5.2 View CMS Content
**Positive Scenarios:**
- ✅ Public view of published content
- ✅ View content by slug
- ✅ List all published content
- ✅ Admin preview of draft content

**Edge Cases:**
- ❌ Accessing non-existent content
- ❌ Accessing draft content as public user
- ❌ SQL injection in slug parameter
- ❌ Path traversal in slug

### 5.3 Update/Delete CMS Content
**Positive Scenarios:**
- ✅ Admin updates content
- ✅ Admin deletes content
- ✅ Update slug (if allowed)

**Edge Cases:**
- ❌ Non-admin trying to update/delete
- ❌ Update with invalid data
- ❌ Delete published content (should handle gracefully)

---

## 6. Running Banners System

### 6.1 Create Banner
**Positive Scenarios:**
- ✅ Admin creates banner with image upload
- ✅ Set target audience (parents/therapists/all)
- ✅ Set start/end dates
- ✅ Set priority
- ✅ Upload valid image (JPEG/PNG/GIF/WebP)

**Edge Cases:**
- ❌ Non-admin trying to create banner
- ❌ Upload invalid file type
- ❌ Upload file exceeding size limit (10MB)
- ❌ Upload malicious file (script, executable)
- ❌ Set end date before start date
- ❌ XSS in banner title/content
- ❌ Path traversal in image filename
- ❌ Upload extremely large image causing DoS

### 6.2 View Banners
**Positive Scenarios:**
- ✅ View active banners for user role
- ✅ Banners rotate correctly
- ✅ Expired banners don't show
- ✅ Future-dated banners don't show

**Edge Cases:**
- ❌ Viewing banners with expired end_date
- ❌ Viewing banners with future start_date
- ❌ SQL injection in audience parameter
- ❌ Accessing banner images with path traversal

### 6.3 Update/Delete Banner
**Positive Scenarios:**
- ✅ Admin updates banner
- ✅ Admin deletes banner
- ✅ Update image

**Edge Cases:**
- ❌ Non-admin trying to update/delete
- ❌ Update with invalid data

---

## 7. Subscription & Quota Management

### 7.1 Subscription Management
**Positive Scenarios:**
- ✅ User gets default free subscription
- ✅ Admin creates subscription for user
- ✅ Admin updates subscription plan
- ✅ Admin updates quota
- ✅ View subscription details

**Edge Cases:**
- ❌ Non-admin trying to create subscription
- ❌ Create subscription for non-existent user
- ❌ Update subscription with invalid plan type
- ❌ Update quota to negative number
- ❌ SQL injection in user_id
- ❌ Create duplicate subscription for same user

### 7.2 Quota Enforcement
**Positive Scenarios:**
- ✅ Parent log creation respects quota
- ✅ Quota resets at month boundary
- ✅ Quota check before log creation

**Edge Cases:**
- ❌ Create log when quota exceeded
- ❌ Quota reset timing edge cases (timezone issues)
- ❌ Race condition in quota checking
- ❌ Bypass quota by manipulating API calls

### 7.3 AI Token Management
**Positive Scenarios:**
- ✅ Check token availability
- ✅ Use tokens for AI requests
- ✅ Token wallet auto-creation
- ✅ Token renewal at month boundary

**Edge Cases:**
- ❌ Use tokens when quota exceeded
- ❌ Negative token usage
- ❌ Token renewal timing edge cases
- ❌ Race condition in token usage

---

## 8. Admin Dashboard & Analytics

### 8.1 View Analytics
**Positive Scenarios:**
- ✅ Admin views dashboard analytics
- ✅ View DAU/MAU metrics
- ✅ View subscription breakdown
- ✅ View AI usage statistics
- ✅ View growth metrics

**Edge Cases:**
- ❌ Non-admin trying to access analytics
- ❌ SQL injection in date range parameters
- ❌ Extremely large date range causing performance issues

### 8.2 User Management
**Positive Scenarios:**
- ✅ Admin views user list
- ✅ Search users by name/email
- ✅ Filter users by role
- ✅ Pagination works
- ✅ View user subscription details

**Edge Cases:**
- ❌ Non-admin accessing user list
- ❌ SQL injection in search parameter
- ❌ XSS in search results
- ❌ Invalid pagination parameters
- ❌ Accessing other user's subscription by ID manipulation

### 8.3 Quota Management
**Positive Scenarios:**
- ✅ Admin views all children quotas
- ✅ Admin updates child quota
- ✅ Admin resets all quotas

**Edge Cases:**
- ❌ Non-admin accessing quota management
- ❌ Update quota with invalid values
- ❌ SQL injection in child_id
- ❌ Update quota for non-existent child

---

## 9. Children Management

### 9.1 Create Child
**Positive Scenarios:**
- ✅ Parent creates child profile
- ✅ Set birthdate and diagnosis
- ✅ Set monthly quota

**Edge Cases:**
- ❌ Non-parent trying to create child
- ❌ Create child with invalid data
- ❌ XSS in child name/diagnosis
- ❌ SQL injection in fields
- ❌ Future birthdate
- ❌ Extremely long text fields

### 9.2 View Children
**Positive Scenarios:**
- ✅ Parent views own children
- ✅ Therapist views assigned children
- ✅ Admin views all children

**Edge Cases:**
- ❌ Parent viewing other parent's children
- ❌ Therapist viewing unassigned children
- ❌ SQL injection in filter parameters

---

## 10. Sessions Management

### 10.1 Create Session
**Positive Scenarios:**
- ✅ Therapist creates session for assigned child
- ✅ Set duration and goals
- ✅ Add notes
- ✅ Session respects child quota

**Edge Cases:**
- ❌ Therapist creating session for unassigned child
- ❌ Create session when quota exceeded
- ❌ Create session with invalid child_id
- ❌ XSS in session notes
- ❌ SQL injection in goals
- ❌ Negative duration
- ❌ Future-dated session

### 10.2 View Sessions
**Positive Scenarios:**
- ✅ View sessions for child
- ✅ Filter by date range
- ✅ Pagination works

**Edge Cases:**
- ❌ Viewing sessions for unauthorized child
- ❌ SQL injection in filter parameters
- ❌ Invalid date ranges

---

## 11. Security Testing Scenarios

### 11.1 Authentication Security
- ❌ JWT token manipulation
- ❌ Session fixation
- ❌ Brute force login attempts
- ❌ Password policy bypass
- ❌ OAuth redirect manipulation

### 11.2 Authorization Security
- ❌ Privilege escalation
- ❌ IDOR (Insecure Direct Object Reference)
- ❌ Horizontal privilege escalation
- ❌ Vertical privilege escalation

### 11.3 Input Validation
- ❌ SQL injection in all input fields
- ❌ XSS (Cross-Site Scripting) in all text fields
- ❌ Command injection
- ❌ Path traversal
- ❌ File upload vulnerabilities

### 11.4 API Security
- ❌ Missing rate limiting
- ❌ CORS misconfiguration
- ❌ Missing CSRF protection
- ❌ Information disclosure in error messages
- ❌ API endpoint enumeration

### 11.5 Data Security
- ❌ Sensitive data in logs
- ❌ Password storage (should be hashed)
- ❌ Token storage (should be secure)
- ❌ PII exposure

---

## 12. Performance Testing

### 12.1 Load Testing
- ✅ Handle 100 concurrent users
- ✅ Handle 1000 concurrent users
- ✅ Database query performance
- ✅ File upload performance

### 12.2 Stress Testing
- ❌ Extremely large payloads
- ❌ Extremely long text fields
- ❌ Many concurrent requests
- ❌ Database connection exhaustion

---

## Test Execution Priority

1. **Critical Path Tests** (Must Pass):
   - Authentication & Authorization
   - Parent Log creation with quota
   - Subscription management
   - Admin access controls

2. **High Priority Tests** (Should Pass):
   - All CRUD operations
   - Quota enforcement
   - File uploads
   - Security tests

3. **Medium Priority Tests** (Nice to Have):
   - Edge cases
   - Performance tests
   - UI/UX edge cases

---

## Test Data Requirements

- Test users: parent, therapist, admin
- Test children: multiple children per parent
- Test subscriptions: free, pro, premium, therapist plans
- Test logs: various statuses and dates
- Test goals: various statuses
- Test CMS content: published, draft, scheduled
- Test banners: active, expired, future-dated

---

## Expected Test Results Format

For each test:
- Test ID
- Test Name
- Category
- Priority
- Status: ✅ PASS / ❌ FAIL / ⚠️ WARN
- Notes
- Screenshot/Evidence (if applicable)

