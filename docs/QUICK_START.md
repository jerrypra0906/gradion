# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Setup Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend  
cp frontend/.env.example frontend/.env.local

# Docker
cp .env.example .env
```

### 2. Start Services (Development Mode)

```bash
# Start with hot-reload enabled
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Run Database Migration

```bash
# From backend directory
cd backend
npx prisma@5.7.1 migrate dev

# Or using Docker
docker-compose exec backend npx prisma@5.7.1 migrate dev
```

### 4. Seed Test Data

```bash
# From backend directory
cd backend
npm run prisma:seed

# Or using Docker
docker-compose exec backend npm run prisma:seed
```

### 5. Access the Application

- **Frontend:** http://localhost:5000
- **Backend API:** http://localhost:5001/api
- **Health Check:** http://localhost:5001/health

## 🔑 Test User Credentials

All users have the same password: `password123`

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@langkahkecil.com` | `password123` | Full access |
| **Therapist** | `therapist@langkahkecil.com` | `password123` | Assigned children & sessions |
| **Parent** | `parent@langkahkecil.com` | `password123` | Own children & sessions |

## 📝 Development Workflow

### Making Code Changes

**With Development Mode (Hot-reload):**
- Changes to `backend/src/` → Automatically reloaded
- Changes to `frontend/src/` → Automatically reloaded
- No rebuild needed!

**Without Development Mode:**
- Must rebuild: `docker-compose build`
- Then restart: `docker-compose up -d`

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stopping Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 🔄 Switching Between Modes

### Development → Production

1. Stop development containers:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
   ```

2. Ensure volume mounts are commented in `docker-compose.yml`

3. Start production mode:
   ```bash
   docker-compose up -d --build
   ```

### Production → Development

1. Stop production containers:
   ```bash
   docker-compose down
   ```

2. Start development mode:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

## 🐛 Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `docker-compose ps`
- Verify port mapping: `5433:5432` (external:internal)
- Check `.env` file has correct `DATABASE_URL`

### Backend Not Starting
- Check logs: `docker-compose logs backend`
- Verify environment variables in `backend/.env`
- Ensure database is healthy: `docker-compose ps postgres`

### Frontend Build Errors
- Clear Next.js cache: `docker-compose exec frontend rm -rf .next`
- Rebuild: `docker-compose build frontend`
- Check logs: `docker-compose logs frontend`

## 📚 More Information

- [Complete Documentation](./README.md)
- [Test Credentials](./TEST_CREDENTIALS.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Frontend Guide](./FRONTEND_GUIDE.md)

