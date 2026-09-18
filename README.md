# Gradion

**Gradion** is a high-intensity SaaS platform for the Indonesian market supporting children with Autism Spectrum Disorder (ASD). Parents run structured, AI-generated **ABA home programs** week by week, record every practice trial, and progress automatically to the next stage as their child masters skills. Clinicians and admins review all AI content before families ever see it.

Built with Next.js (App Router), Fastify, PostgreSQL (Prisma), and Docker.

---

## ✨ What Gradion Does

### For Parents
- **Guided onboarding** — add a child, complete an Initial Observation checklist (behaviour frequency/severity, attention, eye contact, compliance).
- **Automatic AI assessment** — submitting the observation generates a parent-friendly Initial Assessment report, then automatically generates the first **Weekly Home Program (ABA)**.
- **Run the program** — step-by-step guided sessions in the browser with a pausable timer, or print the therapy-notes PDF and upload a photo for AI (OCR) to read.
- **Trial-by-trial recording** — mark each trial `+` independent, `p` prompted, `−` incorrect, `os` skipped.
- **Automatic progression** — when practice targets are met the next-stage program is generated automatically and the family is congratulated by email.
- **Progress visibility** — per-program scores, practice hours vs. target, activity history, and AI progress reports.
- **Learning modules** — video + quiz ABA training with prerequisites.
- **Biometric sign-in** — Face ID / Touch ID / fingerprint / Windows Hello passkeys.

### For Admins
- **AI content review gate** — every AI assessment and weekly program is `pending` until an admin approves it; admins can edit, approve, reject, or set back to pending.
- **ABA Master Program Library** — curate the reusable programs the AI draws from, with real-world usage stats (children practised, frequency, independence score), merge duplicates, archive, and create the missing-language counterpart.
- **Analytics** — DAU/WAU/MAU, subscription and token economics, plus product analytics: page engagement, time-on-page, drop-off, and captured errors.
- **User & subscription management** — full profile view, role changes, plan/quota control, AI token reset, promotion codes.
- **CMS & landing page** — editable public content, banners, resources, learning modules, observation templates.

### For Therapists / Consultants
Assigned children, session recording, activity-log review, and goal tracking.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm 9+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Run the full stack

```bash
docker compose up -d
# Postgres → localhost:5434, backend → 5001, frontend → 5050
cd backend && npx prisma migrate deploy
```

Containers: `gradion-postgres`, `gradion-backend`, `gradion-frontend` · network `gradion-network` · volume `gradion_postgres_data`. Database **`gradion`**, user **`gradion_user`**. Port 5050 is used because 5000 conflicts with macOS AirPlay.

**Postgres only** (running backend/frontend with `npm` on the host) — uses host port **5435** so it does not clash with the full stack:

```bash
cp .env.gradion.example .env.gradion
docker compose -f docker-compose.gradion.yml --env-file .env.gradion up -d
# Point backend/.env DATABASE_URL at localhost:5435/gradion
```

### First-time setup

```bash
# 1. Environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp .env.example .env

# 2. Dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Database
cd ../backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

See [docs/TEST_CREDENTIALS.md](./docs/TEST_CREDENTIALS.md) for seeded test users.

### Development mode (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Or without Docker:

```bash
cd backend && npm run dev     # Terminal 1
cd frontend && npm run dev    # Terminal 2
```

---

## 🏗️ Architecture

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js 20, Fastify 4, TypeScript, Zod validation, Pino logging |
| Database | PostgreSQL 16 + Prisma ORM |
| AI | Google Gemini → OpenAI → Anthropic Claude (automatic fallback chain) |
| Auth | JWT, Google OIDC, WebAuthn passkeys (biometric) |
| Email | Resend (SMTP fallback) |
| Payments | Midtrans |
| Storage | Cloudflare R2 / Supabase Storage / local filesystem |
| Deploy | Docker Compose on AWS EC2 (separate frontend and backend+DB hosts) behind Nginx |

### Project structure

```
Gradion/
├── backend/                  # Fastify API
│   ├── src/
│   │   ├── routes/           # 21 route groups (auth, children, aba-program, admin, analytics, …)
│   │   ├── services/         # Business logic (AI, ABA generation, analytics, email, webauthn, …)
│   │   ├── middleware/       # Auth + role guards
│   │   ├── lib/              # Prisma, storage, subscription, token costs
│   │   └── index.ts          # Entry point + daily scheduler
│   └── prisma/               # Schema + migrations
├── frontend/                 # Next.js app
│   └── src/
│       ├── app/              # Routes (public, dashboard, dashboard/admin)
│       ├── components/       # React components
│       ├── lib/              # API client, analytics, biometric, i18n
│       └── store/            # Zustand (auth, language)
├── docs/                     # PRD, technical design, guides
├── scripts/                  # E2E/Playwright verification scripts
└── docker-compose*.yml
```

---

## 🧠 How the ABA Engine Works

1. **Initial Observation** → parent completes the admin-configurable checklist.
2. **AI Initial Assessment** → generated automatically, stored `pending` for admin review.
3. **Weekly Home Program** → generated automatically from the assessment, prior weeks' results, learning insights, similar autism cases, and the curated Master Program Library.
4. **Practice** → guided web session (pausable timer) or printed notes + photo upload (OCR).
5. **Scoring** → trials are scored `+` independent / `p` prompted / `−` incorrect (`os` skipped, unscored).
6. **Progression gate** →
   - average ≥ **75%** and every program run ≥ **3×** → *advance* to a fresh plan, **or**
   - average < 75% and every program run ≥ **6×** → *reinforce*: current programs carry over plus new additions.
7. **Auto-advance** → when the gate is met the next program generates automatically and the parent receives a celebration email. No button to press.

Programs run **7 days from generation** and stay active until the next one is created. All generated content is gated behind admin approval before parents see it.

---

## 📊 Database

```bash
cd backend
npm run prisma:generate      # Generate client
npm run prisma:migrate       # Create a migration (dev)
npx prisma migrate deploy    # Apply migrations (prod)
npm run prisma:studio        # Browse data
npm run prisma:seed          # Seed test users
```

Key models: `User`, `Child`, `ChildAbaProgramWeek`, `ChildAbaProgramSession`, `AbaMasterProgram`, `ParentLog`, `Goal`, `Subscription`, `AITokenWallet`, `AITokenUsageLog`, `WebAuthnCredential`, `AnalyticsPageView`, `AnalyticsError`.

---

## 🔐 Environment Variables

See the `.env.example` files in each directory.

**Backend essentials**
- `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` (≥32 chars each)
- `FRONTEND_URL`, `API_URL`, `PUBLIC_API_URL`, `CORS_ORIGIN`
- AI: `GEMINI_API_KEY` (preferred), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Email: `RESEND_API_KEY` / `SMTP_*`, `SUPPORT_EMAIL`
- Payments: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`
- Storage: `R2_*` or `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Feature flags: `ENABLE_AI_FEATURES`, `ENABLE_FILE_UPLOAD`, `ENABLE_CMS`, `ENABLE_VIDEO_FIDELITY`

**Frontend essentials**
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

> Biometric sign-in derives its WebAuthn Relying Party ID from `FRONTEND_URL` — no extra variable needed. It requires HTTPS (localhost excepted).

**Never commit real `.env` files** — they are gitignored.

---

## ⏰ Scheduled Jobs

A dependency-free daily scheduler (`backend/src/services/scheduler.ts`) runs in the API process, with times expressed in **WIB (Asia/Jakarta)**:

| Job | Time (WIB) | Purpose |
|---|---|---|
| `weekly-program-reminder-midday` | 12:00 | Remind parents to run today's program |
| `weekly-program-reminder-evening` | 17:00 | Second nudge for families who haven't practised |

---

## 📈 Product Analytics

Page views (with attention-aware time-on-page), drop-off/exit rates, and captured errors are recorded for signed-in and anonymous visitors. Routes are normalised (`/children/27` → `/children/:id`) and query strings dropped, so no child or user identifier is stored in an analytics path.

Error alerts email **care@gradion.id** for app crashes, 5xx faults and network failures — muted per problem for 1 hour and capped at 8 emails/hour. Expected 4xx responses are recorded in the dashboard only.

---

## 🔒 Security

- JWT authentication with role guards (`admin`, `therapist`, `consultant`, `parent`)
- WebAuthn passkeys — the device holds the private key; Gradion stores only public keys, and challenges are single-use with a 5-minute TTL
- Email verification with expiring tokens; Google Sign-In (OIDC)
- bcrypt password hashing; registration throttling per IP and resend cooldowns
- Route-level rate limiting, Helmet security headers, strict CORS allow-list, Zod input validation
- Admin review gate on all AI-generated content before it reaches families
- Soft delete for children (parents' deletions are reversible by an admin)

---

## 🎯 Interface Rules (testable)

The parent app is used one-handed, on a phone, usually with a child waiting.
These are thresholds, not preferences — they can be asserted in a test:

| Rule | Threshold | Where it lives |
| --- | --- | --- |
| Text contrast | ≥ 4.5:1 body, ≥ 3:1 large text and non-text | Brand teal has two roles (below); audited against rendered pixels, not class names |
| Touch targets | ≥ 44 × 44 px on touch devices | `@media (pointer: coarse)` in `globals.css`, plus explicit `min-h-[44px]` on parent-facing controls |
| Focus | Always visible for keyboard users | `:focus-visible` outline in `globals.css` |
| Colour | Never the only signal | Trial scores carry a glyph **and** a word; status carries text, not just a chip |
| Keyboard | Never required in the daily loop | The guided session records a trial in one tap; no free-text field inside the per-trial loop |
| Numbers to parents | None that a parent cannot act on | No AI token counters, no ISO dates, no state codes in the parent view — hours in words, dates localised |
| Estimates | Described, not guessed | The observation asks for anchored plain-language answers; "belum yakin" is stored as missing, never as zero |
| Data | Nothing recorded is lost | Guided trials autosave per tap; an interrupted session resumes and can be ended early with partial credit |

### Brand teal has two roles

White on full-strength teal is **2.27:1** — below the 4.5:1 minimum, and it was
carrying the app's most-pressed button. So white never sits on full-strength
teal anywhere:

| Token | Value | Use |
| --- | --- | --- |
| `--brand-teal` | `#00C1B2` | Progress bars, borders, icons, and fills **on navy**, where the 3:1 non-text bar applies |
| `--brand-teal-strong` | `#00736C` | Filled buttons and teal text **on light surfaces** — white on it is 5.72:1 |
| `--brand-ink-on-teal` | `#06302D` | Text and glyphs sitting **on** full-strength teal — 6.31:1 |

In components that is `Button variant="brand"` for light surfaces and
`variant="brandOnDark"` for navy cards, which keeps the daily CTA the brightest
thing on the screen without putting unreadable white on teal.

Red / amber / green is reserved for the score that drives the progression gate.
It is deliberately absent from the trial buttons: a red card reading "wrong"
about an autistic child's attempt, eight times a session, is a judgement the
product has no business making.

---

## 🧪 Verification Scripts

Playwright scripts in `scripts/` drive the real UI to verify critical flows:

```bash
node scripts/e2e-proof-screenshots.mjs       # Child creation, validation, delete/reactivate
node scripts/e2e-biometric-login.mjs         # Passkey registration + biometric sign-in
node scripts/e2e-enhancement-screenshots.mjs # Review lifecycle and admin views
```

---

## 🚢 Deployment

Two EC2 hosts behind Nginx + Cloudflare DNS — see [docs/AWS_EC2_CLOUDFLARE_DEPLOYMENT_GUIDE.md](./docs/AWS_EC2_CLOUDFLARE_DEPLOYMENT_GUIDE.md).

**Backend host** (API + Postgres) — the override keeps the frontend container from starting here:

```bash
cd ~/Gradion && git pull
docker compose -f docker-compose.yml -f docker-compose.backend.yml build backend
docker compose run --rm --no-deps backend npx prisma migrate deploy
docker compose -f docker-compose.yml -f docker-compose.backend.yml up -d
```

**Frontend host:**

```bash
cd ~/Gradion && git pull
docker compose build frontend && docker compose up -d frontend
docker image prune -af && docker builder prune -af   # keep the disk from filling
```

> AI generation takes 60–120s. Set `proxy_read_timeout 300s;` in the API's Nginx site, or long generations return 504 even though they succeed server-side.

---

## 📚 Documentation

- `docs/PRD_Gradion.docx` — Product Requirements Document (parent + admin functionality)
- `docs/API_DOCUMENTATION.md` — Backend API endpoints
- `docs/FRONTEND_GUIDE.md` — Frontend features and testing guide
- `docs/Gradion_Panduan_Orang_Tua.docx` — Parent user manual (Bahasa Indonesia)
- `docs/AWS_EC2_CLOUDFLARE_DEPLOYMENT_GUIDE.md` — Deployment guide
- `docs/TEST_CREDENTIALS.md` — Test user credentials

---

## 📝 License

ISC

## 👥 Team

Gradion — *Recovery is possible* 💚
