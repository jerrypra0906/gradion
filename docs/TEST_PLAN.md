# LangkahKecil Comprehensive Test Plan

The goal of this plan is to validate the production-critical flows implemented so far (authentication, role-based dashboards, Parent Logs, Goals, Reports, CMS, and Running Banners). Each scenario is mapped to the API endpoints that power the corresponding UI components. The automated smoke test (`scripts/smokeTests.mjs`) exercises the same flows against a running Docker stack.

## Prerequisites

1. Docker services running via `docker-compose up -d`.
2. Database seeded (`cd backend && npm run prisma:seed`) so the default accounts exist:
   - Admin: `admin@langkahkecil.com` / `password123`
   - Therapist: `therapist@langkahkecil.com` / `password123`
   - Parent: `parent@langkahkecil.com` / `password123`
3. Users flagged as verified (seed script does this; run `UPDATE users SET is_email_verified = true;` if needed).

## Scenario Matrix

| Persona     | Scenario                                                                                     | API Coverage                                                                                         | Expected Result |
|-------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|-----------------|
| Global      | Service health                                                                               | `GET /api/health`                                                                                      | HTTP 200 with status `ok` |
| Admin       | Authenticate                                                                                 | `POST /api/auth/login`                                                                                 | Token + user profile |
| Admin       | Manage CMS entries (list)                                                                    | `GET /api/cms/admin`                                                                                   | 200 + data array |
| Admin       | Manage banners (list)                                                                        | `GET /api/banners/admin`                                                                               | 200 + data array |
| Parent      | Authenticate                                                                                 | `POST /api/auth/login`                                                                                 | Token + user profile |
| Parent      | View assigned children                                                                       | `GET /api/children`                                                                                    | ≥1 child returned |
| Parent      | Fetch progress report                                                                        | `GET /api/reports/child/:childId`                                                                      | 200 + report payload |
| Parent      | Submit daily/weekly Parent Log                                                               | `POST /api/parent-logs`                                                                                | 200 + created log |
| Therapist   | Authenticate                                                                                 | `POST /api/auth/login`                                                                                 | Token + user profile |
| Therapist   | View assigned children                                                                       | `GET /api/children`                                                                                    | 200 + filtered list |
| Therapist   | View session history for assigned child                                                      | `GET /api/sessions/child/:childId`                                                                     | 200 + sessions array |
| Therapist   | Review goals/programs                                                                        | `GET /api/goals`                                                                                       | 200 + goals array |

## Automated Smoke Test

Run this script from the repository root to exercise the scenarios above:

```bash
node scripts/smokeTests.mjs
```

The script:

1. Calls the health endpoint.
2. Logs in as admin, parent, and therapist (using seeded credentials).
3. Hits each role-specific endpoint (CMS, banners, children, reports, parent logs, sessions, goals).
4. Fails fast with descriptive errors if any step does not return HTTP 200.

## Latest Execution (2025-11-28)

```
🚀 Running LangkahKecil smoke tests against http://localhost:5001/api

✅ Smoke test summary:
  • Health endpoint responds: PASS
  • Admin login: PASS
  • Admin can list CMS content: PASS
  • Admin can list banners: PASS
  • Parent login: PASS
  • Parent can list children: PASS
  • Parent can fetch reports: PASS
  • Parent can create activity log: PASS
  • Therapist login: PASS
  • Therapist can view assigned children: PASS
  • Therapist can view sessions for assigned child: PASS
  • Therapist can list goals: PASS
```

All test cases passed against the Dockerized environment with the latest backend image and the healthcheck update targeting `/api/health`.

