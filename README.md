# Gradion

**Gradion** is the evolution of LangkahKecil: a high-intensity SaaS platform for the Indonesian market supporting children with Autism Spectrum Disorder (ASD), with an ABA-oriented workflow, AI-assisted progress summaries (Google Gemini), CMS, and admin analytics. Built with Next.js (App Router), Fastify, PostgreSQL (Prisma), and Docker.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Gradion PostgreSQL in Docker

The main **`docker-compose.yml`** is fully renamed for Gradion: containers `gradion-postgres`, `gradion-backend`, `gradion-frontend`, network **`gradion-network`**, volume **`gradion_postgres_data`**. Default host port for Postgres is **5434** (not 5433). Database **`gradion`**, user **`gradion_user`**.

**Full stack (recommended):**

```bash
docker compose up -d
# Postgres → localhost:5434, backend → 5001, frontend → 5050 (5000 conflicts with macOS AirPlay)
cd backend && npx prisma migrate deploy
```

**Postgres only** (e.g. you run backend/frontend with `npm` on the host): use **`docker-compose.gradion.yml`** — same DB name/user, default host port **5435** so it does not clash with the full stack on **5434**.

```bash
cp .env.gradion.example .env.gradion
docker compose -f docker-compose.gradion.yml --env-file .env.gradion up -d
# Point backend/.env DATABASE_URL at localhost:5435/gradion
```

A legacy **LangkahKecil** Postgres on **5433** is unchanged if you still run that stack separately; Gradion does not use it.

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Gradion
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your actual values
   
   # Frontend
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with your actual values
   
   # Docker
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Set up database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Seed database with test users**
   ```bash
   cd backend
   npm run prisma:seed
   ```
   See [docs/TEST_CREDENTIALS.md](./docs/TEST_CREDENTIALS.md) for test user credentials.

6. **Run with Docker**

   **Production Mode (No hot-reload):**
   ```bash
   docker-compose up -d
   ```

   **Development Mode (With hot-reload):**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```
   Changes to source code will be reflected immediately without rebuilding.

7. **Run locally (Without Docker)**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## 📁 Project Structure

```
Gradion/
├── backend/           # Node.js + Fastify API
│   ├── src/
│   │   ├── config/    # Configuration
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   ├── utils/     # Utilities
│   │   └── index.ts   # Entry point
│   ├── prisma/        # Database schema
│   └── Dockerfile
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   ├── components/# React components
│   │   ├── lib/       # Utilities
│   │   └── hooks/     # Custom hooks
│   └── Dockerfile
├── docs/              # Documentation
├── docker-compose.yml        # Full stack (LangkahKecil-named Postgres on 5433 by default)
├── docker-compose.gradion.yml # Gradion-only Postgres (5434 → gradion DB, separate volume)
└── README.md
```

## 🛠️ Development

### Backend

```bash
cd backend
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:studio # Open Prisma Studio
```

### Frontend

```bash
cd frontend
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🐳 Docker

### Development vs Production

**Development Mode (Hot-reload enabled):**
- Source code changes are reflected immediately
- No need to rebuild containers
- Use `docker-compose.dev.yml` override file

**Production Mode (Optimized builds):**
- Code is baked into Docker images
- Requires rebuild for changes
- Use standard `docker-compose.yml`

### Build and Run

**Production Mode:**
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Rebuild and restart
docker-compose up -d --build
```

**Development Mode (Hot-reload):**
```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Rebuild if needed
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# View logs
docker-compose logs -f
```

**Common Commands:**
```bash
# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

⚠️ **Important:** Remove volume mounts from `docker-compose.yml` before deploying to production!

### Individual Services

```bash
# Build backend only
docker-compose build backend

# Start specific service
docker-compose up -d postgres
```

## 📊 Database

### Prisma Commands

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Seed database with test users
npm run prisma:seed
```

See [docs/TEST_CREDENTIALS.md](./docs/TEST_CREDENTIALS.md) for test user credentials.

## 🔐 Environment Variables

See `.env.example` files in each directory for required environment variables:

- `backend/.env.example` - Backend configuration (JWT secrets, Resend, Google OAuth, security limits)
- `frontend/.env.example` - Frontend configuration (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- `.env.example` - Docker/Docker Compose configuration

**Backend highlights:**
- Email verification: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS`, `EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Abuse prevention: `REGISTRATION_MAX_ATTEMPTS_PER_IP`, `REGISTRATION_WINDOW_MINUTES`

**Frontend highlights:**
- `NEXT_PUBLIC_API_URL` – points to the Fastify API
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` – required to render Google Sign-In

**Important:** Never commit actual `.env` files. They are already in `.gitignore`.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- `docs/README.md` - Complete project documentation
- `docs/TEST_CREDENTIALS.md` - Test user credentials for development
- `docs/API_DOCUMENTATION.md` - Backend API endpoints
- `docs/FRONTEND_GUIDE.md` - Frontend features and testing guide
- `docs/PGADMIN_CONNECTION.md` - Database connection guide
- `docs/PRD Gradion.docx` — Product Requirements Document
- `docs/TD Gradion.docx` — Technical Design
- `docs/Technical Spec.docx` - Technical Specification

## 🏗️ Architecture

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js, Fastify, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Containerization:** Docker & Docker Compose
- **Deployment:** Production-ready, cloud-hosted

## 🔒 Security

- Email verification with expiring tokens + Resend emails
- Google Sign-In (OIDC) with automatic verification
- Registration attempt logging + per-IP throttling & resend cooldowns
- JWT authentication for API access
- Password hashing with bcrypt for email/password accounts
- Route-level rate limiting and abuse safeguards
- Security headers (Helmet), strict CORS, and input validation (Zod)

## 📝 License

ISC

## 👥 Team

Gradion

---

For detailed information, see [docs/README.md](./docs/README.md)

