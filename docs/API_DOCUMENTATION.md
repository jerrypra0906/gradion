# LangkahKecil API Documentation

This document reflects the **Fastify** backend in `backend/src`. All JSON APIs are served under the `/api` prefix unless noted.

## Base URL

Set **`PUBLIC_API_URL`** in the backend environment (see `backend/.env.example`). Typical values:

| Environment | Base URL |
|-------------|----------|
| Docker Compose (default) | `http://localhost:5001/api` — host port `BACKEND_PORT` maps to container `PORT` `3000` |
| Local `npm run dev` | `http://localhost:<PORT>/api` — `<PORT>` defaults to **`3000`** via `backend/src/config/env.ts` |

The frontend uses **`NEXT_PUBLIC_API_URL`** (for example `http://localhost:5001/api`) to call the API.

## Authentication

Protected routes expect a JWT in the header:

```http
Authorization: Bearer <token>
```

Tokens are issued by **`POST /api/auth/login`**, **`POST /api/auth/google`**, and related auth routes. Payload includes `id`, `email`, and `role`.

---

## Response shape

Success:

```json
{ "success": true, "data": { ... } }
```

or, for some routes, `message` at the top level.

Errors:

```json
{ "success": false, "error": "Human-readable message" }
```

In **development** only, unhandled errors may include a `stack` field. Production 5xx responses use a generic message.

---

## HTTP status codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created (e.g. registration) |
| `400` | Validation or bad input |
| `401` | Missing or invalid token |
| `403` | Forbidden (role, subscription, quota, etc.) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email) |
| `429` | Too many requests (rate limit or registration throttling) |
| `500` | Server error |
| `503` | Service unavailable (e.g. Google OAuth not configured, support email missing) |

---

## Route index

### Health & utilities

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | No |
| POST | `/api/health/test-email` | No — sends a test email via Resend |
| GET | `/api/sitemap.xml` | No — XML sitemap for SEO |
| POST | `/api/contact` | No — contact form (requires `SUPPORT_EMAIL`) |

### Auth (`/api/auth`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/register` | No | Optional `phone_number`, `referral_code`. Rate-limited per IP. Returns **201**. |
| POST | `/login` | No | Email/password; **403** if email not verified; **400** if account is Google-only |
| POST | `/verify-email` | No | Body: `{ "token" }` |
| POST | `/resend-verification` | No | Body: `{ "email" }` |
| POST | `/google` | No | Body: `{ "credential" }` — Google ID token |
| POST | `/forgot-password` | No | Body: `{ "email" }` |
| POST | `/reset-password` | No | Body: `{ "token", "newPassword" }` |
| GET | `/me` | Yes | Current user (subset of fields; includes `points`) |

### Profile (`/api/profile`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/me` | Yes — `phone_number`, `referral_code`, `points`, etc. |
| PUT | `/me` | Yes — optional `email`, `phone_number` |

### Children (`/api/children`)

| Method | Path | Auth | Roles |
|--------|------|------|--------|
| GET | `/` | Yes | Parent: own children; Therapist: assigned; Admin: all |
| GET | `/:id` | Yes | Parent / assigned therapist / admin |
| POST | `/` | Yes | **Parent** or **Admin** — optional `parent_id` for admin |
| PUT | `/:id` | Yes | Parent (own) or admin; **`monthly_quota`** only for **admin** |
| POST | `/:id/link-therapist` | Yes | **Parent** or **Admin** — body `{ "therapist_email" }`; links existing therapist or sends invitation |

### Therapy sessions (`/api/sessions`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/` | Therapist, Admin | Creates session; checks child **monthly quota** (`used_sessions` vs `monthly_quota`); optional `date` |
| GET | `/` | Yes | Therapist: own sessions; Parent: children’s sessions; Admin: all (max **100**) |
| GET | `/child/:childId` | Yes | Therapist sees own sessions for child; parent/admin see all for child |
| GET | `/:id` | Yes | Single session |
| POST | `/:id/review` | Parent, Admin | Body: `{ "comment", "status": "approved" \| "flagged" }` |

### Parent activity logs (`/api/parent-logs`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/` | Parent, Therapist, Admin | Requires **parent’s subscription** active; increments child `used_sessions` |
| GET | `/` | Yes | Query: `child_id`, `status` — role-filtered |
| GET | `/:id` | Yes | Single log |
| PUT | `/:id` | Parent, Therapist, Admin | Edit if **pending**; subscription rules apply |
| POST | `/:id/review` | Parent, Therapist, Admin | Parent-created logs reviewed by therapist; therapist-created by parent |
| DELETE | `/:id` | Parent, Admin | Pending logs |

### Goals (`/api/goals`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/` | Therapist, Admin |
| GET | `/` | Yes — query `child_id`, `status` |
| GET | `/:id` | Yes |
| PUT | `/:id` | Therapist, Admin |
| DELETE | `/:id` | Therapist, Admin |

### Reports & AI summaries (`/api/reports`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/child/:childId` | Yes | Query: `range` (days, 7–180), or `startDate` / `endDate` (ISO), optional `lang`: `en` \| `id` — aggregates logs, sessions, goals; may include cached **AI summary** |
| POST | `/child/:childId/ai-summary` | Yes | Generates or stores AI report; requires AI access and token quota |

### CMS (`/api/cms`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin` | Admin — query `status`, `search` |
| GET | `/admin/:id` | Admin |
| GET | `/` | Public — published list; query `limit` |
| GET | `/:slug` | Public — published page by slug |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Banners (`/api/banners`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin` | Admin |
| GET | `/admin/:id` | Admin |
| GET | `/` | Public — query `audience`, `limit` |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### File uploads (`/api/uploads`)

Multipart file upload; **admin** only.

| Method | Path | Notes |
|--------|------|--------|
| POST | `/banner` | Banner image; resized (e.g. 1200×300); Supabase or local `/uploads/banners/` |
| POST | `/cms` | CMS images |

Static files are also served at **`/uploads/...`** from the backend when stored locally.

### Subscriptions (`/api/subscriptions`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/payment-status` | Admin | Midtrans configuration diagnostics |
| GET | `/plans` | Public | Plan map from `subscription_plan_configs` |
| GET | `/plans/configs` | Admin | Full plan rows |
| PUT | `/plans/:planType` | Admin | `planType`: `free`, `pro`, `premium`, `therapist` |
| POST | `/request` | Yes | Start upgrade / payment; optional `promotion_code`, `points_to_use`, `payment_method` |
| GET | `/me` | Yes | Current subscription + AI wallet + plan config |
| GET | `/user/:userId` | Admin | |
| POST | `/` | Admin | Create subscription for a user |
| PUT | `/:subscriptionId` | Admin | |
| POST | `/quota` | Admin | Body: `{ "child_id", "monthly_quota" }` |
| GET | `/` | Admin | Query `status`, `plan_type` |
| POST | `/reset-quotas` | Admin | Resets child `used_sessions` and eligible AI wallets |
| GET | `/webhook/midtrans` | No | Webhook probe |
| POST | `/webhook/midtrans` | No | **Midtrans** payment notifications |

### AI token wallet (`/api/ai-tokens`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/wallet` | Yes — creates/refreshes wallet from subscription plan |
| POST | `/check` | Yes — body `{ "tokens_needed" }` |
| POST | `/use` | Yes — body `{ "tokens_used" }` |

### Promotion codes (`/api/promotion-codes`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Admin |
| GET | `/:id` | Admin |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |
| POST | `/validate` | Yes — validate before checkout |

### Admin (`/api/admin`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/analytics` | Admin — DAU/MAU, subscriptions, AI usage, growth |
| GET | `/users` | Admin — query `role`, `search`, `page`, `limit` |
| POST | `/send-email` | Admin — broadcast or targeted HTML email |

---

## Example requests

### Register

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret12","role":"parent"}'
```

Success (**201**):

```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account before logging in."
  }
}
```

### Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"secret12"}'
```

### Authenticated call

```bash
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## Role-based access (summary)

- **Parent:** Own children, logs, goals (read), sessions for their children, reports, subscription checkout, profile.
- **Therapist:** Assigned children, sessions, goals (CRUD where assigned), logs for assigned children, reports.
- **Admin:** Full management — users, subscriptions, quotas, CMS, banners, uploads, promotion codes, analytics, broadcast email.

---

## Security & operations

- **Helmet** CSP is configured for analytics/AdSense where applicable (`backend/src/index.ts`).
- **CORS** uses `CORS_ORIGIN` (comma-separated allowed origins).
- **Rate limiting** uses `@fastify/rate-limit` (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`); health checks are excluded from aggressive limiting.
- **AI** features honor `ENABLE_AI_FEATURES`, token wallets, and `OPENAI_*` / spend limits in `backend/src/config/env.ts`.

For database structure, see `backend/prisma/schema.prisma`. For environment variables, see `backend/.env.example` and the root `docker-compose.yml`.

---

**Last updated:** April 2026 — aligned with the LangkahKecil backend codebase.
