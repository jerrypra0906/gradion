# LangkahKecil Documentation

Welcome to the LangkahKecil project documentation. This repository contains all necessary documents to understand and contribute to the project.

## Table of Contents

- [Overview](#overview)
- [Documentation Files](#documentation-files)
- [Product Overview](#product-overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Database Schema](#database-schema)
- [API Specifications](#api-specifications)
- [Subscription & Quota System](#subscription--quota-system)
- [AI Token Management](#ai-token-management)
- [Infrastructure & Costs](#infrastructure--costs)

**API reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) (generated from the current Fastify routes in `backend/src`).

---

## Overview

**LangkahKecil** (Autism Progress Tracker) is a lightweight SaaS web platform designed for parents and therapists to track daily/weekly progress of children with Autism Spectrum Disorder (ASD). The platform enables structured communication between parents and therapists, generates progress reports, and provides AI-assisted note summarization and recommendations.

**Version:** 1.0 (MVP)  
**Prepared by:** Jerry

### Production-Ready & Cloud Deployment

⚠️ **Important:** This project is built with **production-ready** standards in mind and will be deployed to the cloud for **external internet access**. The application will be containerized using **Docker** for consistent deployment across environments.

**Deployment Strategy:**
- **Containerization:** Docker containers for all services
- **Cloud Hosting:** Production deployment on cloud infrastructure
- **External Access:** Publicly accessible via internet
- **Scalability:** Designed to handle production workloads
- **Security:** Production-grade security measures implemented

---

## Documentation Files

**In-repo (kept in sync with code):**

1. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** — REST API: routes, auth, and examples (matches `backend/src`).
2. **[TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md)** — Seeded test users and reset notes.

**Legacy / external:**

3. **PRD LangkahKecil.docx** — Product requirements (historical).
4. **TD LangkahKecil.docx** — Technical design (historical).
5. **Technical Spec.docx** — Infrastructure and cost notes (historical).

---

## Product Overview

### Target Users

#### Primary Users
1. **Parents**
   - Track child development
   - Submit daily/weekly activity logs
   - Review therapist updates
   - View progress charts

2. **Therapists**
   - Assign goals & programs
   - Review parents' logs
   - Record therapy sessions (ABA sessions)
   - Generate progress notes

#### Secondary Users
3. **Admin**
   - Manage subscriptions
   - Monitor quota usage
   - Access analytics
   - Manage content (CMS)
   - Manage running banners

### Product Goals

- 🎯 Help parents and therapists track progress easily
- 🎯 Create structured evidence of child development
- 🎯 Enable therapist-parent collaboration
- 🎯 Offer affordable SaaS with upgrade potential

---

## System Architecture

### High-Level Architecture

The repository ships as a **monorepo**: one **Next.js** frontend (`frontend/`) and a **Fastify** API (`backend/`). Parents, therapists, and admins use the **same app** with **role-based** dashboards and routes—not three separate frontends.

```
┌─────────────────────────────────────────┐
│  Next.js frontend (Vercel / Docker)      │
│  Landing, auth, dashboards by role       │
└──────────────────┬──────────────────────┘
                   │ HTTPS / JSON  (JWT)
                   ▼
┌─────────────────────────────────────────┐
│  Backend API — Fastify (Node.js)         │
│  REST under /api; Prisma ORM             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  PostgreSQL                               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Optional: Supabase Storage (uploads),    │
│  Resend (email), Midtrans (payments),     │
│  OpenAI (reports / AI summaries)        │
└─────────────────────────────────────────┘
```

### Frontend modules (single Next.js app)

- **Public:** Landing, CMS pages by slug, legal pages, contact (when configured), registration/login, password reset, email verification.
- **Parent / therapist / admin:** Shared dashboard shell; features gated by **role** (children, activity logs, ABA sessions, goals, progress reports, banners, subscriptions/checkout, admin analytics, CMS/banner tools, promotion codes, broadcast email, quota overrides).

See `frontend/src/app` for route structure.

---

## Technology Stack

### Frontend
- **Framework:** Next.js (App Router, React)
- **Hosting:** Vercel or Docker (see root `docker-compose.yml`)
- **i18n / UX:** Client-side language switching and CMS-driven content where implemented

### Backend
- **Runtime:** Node.js (ESM)
- **Framework:** **Fastify** — plugins: CORS, Helmet, rate limiting, multipart uploads, static `/uploads`
- **ORM:** **Prisma** — schema in `backend/prisma/schema.prisma`
- **Hosting:** Any Node host or Docker; compose maps **`BACKEND_PORT`** (default **5001**) to container port **3000**

### Database
- **Primary:** **PostgreSQL** (local, Docker, or managed)

### Additional Services (as wired in code)
- **Email:** Resend (`backend/src/services/email.service.ts`)
- **Payments:** **Midtrans** Snap + webhooks (`backend/src/services/payment.service.ts`, `backend/src/routes/subscriptions.ts`)
- **File storage:** Local `uploads/` or **Supabase Storage** for banner/CMS images (`backend/src/routes/uploads.ts`)
- **AI:** OpenAI via backend services (report summaries, token wallet in `AITokenWallet`)
- **OAuth:** Google Sign-In for web (`backend/src/routes/auth.ts`)

### Total Infrastructure Cost
- **MVP:** $20-$40/month
- **At 1000 users:** $100-$200/month

---

## Key Features

Features below are implemented in the **current codebase** (API + Prisma models + Next.js app). For exact HTTP contracts, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Parents

- **Children:** Create and manage profiles; **link therapist** by email (immediate link if the therapist already exists, otherwise **TherapistInvitation** + email).
- **Activity logs (`ParentLog`):** Skills with per-skill ratings, activities, behavior notes; optional AI fields; **review** workflow with assigned therapists.
- **Therapy sessions:** View ABA sessions for their children; **review** sessions (approve/flag + comment).
- **Goals:** Read therapist-defined goals for their children.
- **Reports:** Date-range progress (logs, sessions, goals) with optional **AI summary** (English/Indonesian) when the plan allows.
- **Subscriptions:** Plan catalog from DB, upgrade requests, **Midtrans** checkout when configured; **promotion codes** and **points** at checkout.
- **Profile:** Phone, referral code, points; optional email update (verification flow for new email is marked TODO in code).

### Therapists

- **Assigned children** via `TherapistChild` (including auto-link when registering after an invitation).
- **Sessions:** Create ABA sessions subject to the child’s **monthly quota**; session **status** and **parent_comment** after parent review.
- **Goals:** CRUD for assigned children.
- **Activity logs:** Create logs for assigned children; **review** parent-created logs.
- **Reports:** Same aggregated reporting as parents for assigned children.

### Admins

- **Analytics:** `GET /api/admin/analytics` — users, logs, sessions, subscriptions, AI token usage estimates, growth.
- **Users:** Paginated list with subscription and AI wallet info.
- **Subscriptions:** Create/update subscriptions, **quota** updates per child, plan **configs** in `subscription_plan_configs`, manual **quota reset** job endpoint.
- **Promotion codes:** CRUD and usage tracking; validation at checkout.
- **CMS & banners:** CRUD, scheduling fields on CMS, audience and scheduling on banners; image uploads (local or Supabase).
- **Email:** Broadcast HTML email to segments (`/api/admin/send-email`).

### Cross-cutting

- **JWT auth** with email verification for password users; **Google OAuth** for sign-in.
- **Rate limits** and **registration throttling** by IP (configurable env).
- **Sitemap** API for SEO (`/api/sitemap.xml`).
- **Contact form** posts to support email when `SUPPORT_EMAIL` is set.

---

## Database Schema

The source of truth is **`backend/prisma/schema.prisma`**. Highlights:

| Area | Models / enums |
|------|----------------|
| **Users & auth** | `User` (optional `password_hash`, `google_id`, `is_email_verified`, `phone_number`, `referral_code`, `points`), `EmailVerificationToken`, `PasswordResetToken`, `RegistrationAttempt` |
| **Children & therapists** | `Child`, `TherapistChild` (unique pair), `TherapistInvitation` |
| **Clinical data** | `Session` (`LogStatus`, `parent_comment`), `ParentLog` (creator role, `skills_practiced` JSON, AI fields), `Goal` (`GoalStatus`) |
| **CMS & marketing** | `Banner` (`BannerAudience`, scheduling), `CMSContent` (`CMSStatus`, scheduling) |
| **Billing** | `Subscription`, `SubscriptionPlanConfig`, `SubscriptionRequest`, `PromotionCode`, `PromotionCodeUsage` |
| **AI** | `AITokenWallet`, `AIReportSummary` |

### Entity relationships (short)

- **User** → **Child** (one parent to many children).
- **User** ↔ **Child** (many-to-many therapists via **TherapistChild**).
- **Child** → **Session**, **ParentLog**, **Goal**; **User** creates sessions and logs per role rules in the API.
- **Subscription** and **AITokenWallet** are keyed per **user** (parent account for billing/AI).

---

## API Specifications

The backend exposes a single REST API under **`/api`**. Authentication uses **JWT** (`Authorization: Bearer`).

**Full route list, request notes, and examples:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

At a glance:

- **Auth:** register, login, verify email, resend, Google token login, forgot/reset password, `GET /api/auth/me`.
- **Core domain:** children (including **link therapist**), sessions (with **parent review**), parent logs (with **cross-role review**), goals, reports (aggregates + **AI summary** endpoints).
- **CMS & banners:** public list/slug routes; admin CRUD; uploads for banner/CMS images.
- **Subscriptions:** public **plans**, authenticated **checkout request**, **Midtrans webhook**, admin subscription and **quota** management (`POST /api/subscriptions/quota` — not `/admin/quota/:id`).
- **AI tokens:** wallet, check, use.
- **Admin:** analytics, users, send-email.
- **Promotion codes:** admin CRUD + `POST /api/promotion-codes/validate`.

---

## Subscription & Quota System

### Subscription plans

Commercial terms (price, weeks, **AI access**, **monthly_token_limit**) are stored in **`subscription_plan_configs`** and surfaced via **`GET /api/subscriptions/plans`**. Plans use enum **`SubscriptionPlan`**: `free`, `pro`, `premium`, `therapist`. **Admins** can edit configs via **`PUT /api/subscriptions/plans/:planType`**.

**Midtrans** is integrated for paid upgrades: the client requests **`POST /api/subscriptions/request`**; the server may return a Snap **`payment_token`** and **`payment_redirect_url`**. Webhooks hit **`POST /api/subscriptions/webhook/midtrans`**.

Parent **activity log** creation checks that the **parent’s subscription** is active (`backend/src/lib/subscription.ts`). Feature marketing copy (trial length, exact IDR prices) should match whatever is seeded in `subscription_plan_configs` and the frontend.

### Child quota (`monthly_quota` / `used_sessions`)

Each **child** has **`monthly_quota`** (default **12**) and **`used_sessions`**. The schema notes that **`used_sessions` is incremented for activity logs** (and session creation also increments it in the current implementation). Creating an **ABA session** or a **parent log** is rejected when **`used_sessions >= monthly_quota`** (session path) or when subscription checks fail (logs).

**Admins** set quota via **`POST /api/subscriptions/quota`** with `{ "child_id", "monthly_quota" }`. A manual admin endpoint **`POST /api/subscriptions/reset-quotas`** clears all children’s **`used_sessions`** and refreshes eligible AI wallets—use cautiously; production may prefer a scheduled job.

---

## AI Token Management

### Wallet model

Per-user limits live in **`AITokenWallet`** (`monthly_token_limit`, `current_token_usage`, `renewal_date`, `plan_type`). Limits are aligned with **`subscription_plan_configs`** when the wallet is created or renewed. API: **`GET /api/ai-tokens/wallet`**, **`POST /api/ai-tokens/check`**, **`POST /api/ai-tokens/use`**.

### Server-side AI calls

Report summaries and related features go through backend services (see `backend/src/services/ai.service.ts`, `progressReport.service.ts`). The app reads defaults from **`backend/src/config/env.ts`**: `OPENAI_MODEL`, token caps per plan, **`AI_RATE_LIMIT_PER_MINUTE`**, **`AI_RATE_LIMIT_PER_DAY`**, **`AI_MAX_PROMPT_LENGTH`**, **`AI_MONTHLY_SPEND_LIMIT`**, and **`ENABLE_AI_FEATURES`**.

### Admin visibility

**`GET /api/admin/analytics`** aggregates token usage and estimates cost for monitoring.

---

## Infrastructure & Costs

### Ultra-Lean Cloud Stack Summary

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Vercel | $0-$20 |
| Backend | Railway / Render | $0-$15 |
| Database | Supabase | $0-$25 |
| Email | Resend | $0-$5 |
| Payments | Xendit/Midtrans | $0 |
| Domain | Cloudflare | $1 |
| Monitoring | UptimeRobot | $0 |
| AI | OpenAI (token-based) | $10-$50 |

**Total:**
- **MVP:** $20-$40/month
- **At 1000 users:** $100-$200/month

### Service Details

#### Frontend Hosting (Vercel)
- Free for initial MVP
- $20/mo if you upgrade
- Supports Next.js perfectly
- Automatic deploys
- Built-in edge caching

#### Backend API (Railway/Render)
- Very easy setup
- Scales automatically
- Free tier + paid starter $5-$10/mo
- Great for Node.js backend
- Handles: AI proxy calls, subscription management, token usage limiter, cron jobs, database access, event logging

#### Database (Supabase)
- Free tier includes 500MB DB (enough for early MVP)
- Excellent auth & RLS
- Built-in API
- Direct integration with Vercel
- Great dashboard
- Backup support
- Easy scaling later

#### Object Storage (Cloudflare R2)
- Cheapest object storage
- No egress cost
- Perfect for future: image upload, export files, etc.
- Free tier covers MVP

#### Email (Resend)
- Developer-friendly
- 2,000 emails free
- Great for: verification, forgot password, billing reminders

#### Payments (Xendit/Midtrans)
- No monthly fee
- Pay per successful transaction
- Works well for subscriptions
- Highly trusted in Indonesia

---

## Non-Functional Requirements

- Fast loading (< 2 seconds)
- Mobile-first responsive
- Secure user data
- Minimal cloud cost
- Authentication via email/password
- Audit logs for admin actions

### Authentication & Abuse Prevention

- Email verification with expiring tokens and Resend-powered activation links
- Google Sign-In (OIDC) for one-tap registration/login
- Registration attempts logged per IP with rate limits to prevent spam signups
- Verification email resend cooldowns to avoid abuse

---

## Future Enhancements

- Richer media workflows (beyond admin banner/CMS image uploads)
- Real-time chat or messaging
- Calendar scheduling integrations
- Broader localization (the app already includes language switching in places; extend coverage)
- Deeper AI features (e.g. IEP-style recommendations)

---

## Additional Notes

### Running banners

Banners are stored with **audience**, **priority**, optional **start/end** dates, and optional **image_url**. The public API is **`GET /api/banners`**. Frontend presentation (rotation, dismiss, layout) is defined in React components such as `BannerStrip`.

### CMS pages

`CMSContent` supports **draft / scheduled / published / archived** and optional **publish_at** / **unpublish_at**. Public reads use **`GET /api/cms`** and **`GET /api/cms/:slug`**. Admin uses **`/api/cms/admin`** routes.

---

## Deployment & Environment Configuration

### Docker Containerization

This project is containerized using Docker for consistent deployment across all environments. All services (frontend, backend, database) run in Docker containers.

**Key Points:**
- Production-ready Docker configurations
- Multi-stage builds for optimized image sizes
- Docker Compose for local development
- Cloud-ready container images

### Environment Variables

The project uses environment variables for configuration. **Never commit actual `.env` files** - only `.env.example` files are tracked in version control.

**Environment Files:**
- `backend/.env.example` - Backend API configuration
- `frontend/.env.example` - Frontend application configuration
- Root `.env.example` - Shared/Docker configuration (if needed)

**Important:** Before running the application:
1. Copy `.env.example` to `.env` in each directory
2. Fill in all required values with actual credentials
3. Ensure `.env` files are in `.gitignore`

**Key Variables:**
- **Email verification:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS`, `EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES`
- **Contact form:** `SUPPORT_EMAIL` (required for `POST /api/contact`)
- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Payments:** `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_WEBHOOK_SECRET` (see `backend/src/config/env.ts`)
- **Uploads:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (optional; otherwise local `uploads/`)
- **Registration security:** `REGISTRATION_MAX_ATTEMPTS_PER_IP`, `REGISTRATION_WINDOW_MINUTES`

### Required Environment Variables

See the `.env.example` files in `backend/` and `frontend/` directories for complete lists of required environment variables.

**Critical Variables:**
- Database connection strings (PostgreSQL - port configurable, default 5432)
- JWT secrets
- API keys (OpenAI, email services, payment gateways)
- Cloud storage credentials
- Domain and URL configurations

**Database Port Configuration:**
- PostgreSQL default port is `5432`, but you can use any port
- In Docker Compose: host mapping uses **`POSTGRES_PORT_EXTERNAL`** (default **5433**) to the container’s `5432`
- In connection strings: Specify the port in the URL format: `postgresql://user:pass@host:PORT/dbname`
- Common alternative ports: `5433`, `5434`, `15432` (for security or multiple instances)

### Development vs Production Docker Configuration

**Development Mode (Hot-reload):**
- Use `docker-compose.dev.yml` override file
- Source code volumes mounted for instant changes
- No rebuild required for code changes
- Command: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`

**Production Mode:**
- Use standard `docker-compose.yml`
- Code baked into Docker images
- Requires rebuild for changes
- No volume mounts for source code
- Command: `docker-compose up -d`

⚠️ **Important:** Before deploying to production, ensure volume mounts are commented out or removed from `docker-compose.yml`.

### Test User Credentials

Test users are created when you run the database seed script. See [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) for:
- Admin, Therapist, and Parent user credentials
- Sample data created during seeding
- How to reset test data

---

## References

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** — REST API reference (current code)
- **PRD / TD / Technical Spec .docx** — Historical product and architecture documents

---

**Last updated:** April 2026 — aligned with the LangkahKecil repository (`frontend/`, `backend/`, `docker-compose.yml`).  
**Deployment:** Docker Compose and environment-driven configuration; see root `README.md` for run instructions.

