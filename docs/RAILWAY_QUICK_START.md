# Railway Backend Deployment - Quick Start

**Time**: 15-20 minutes | **Difficulty**: Easy

## Prerequisites

- ✅ GitHub repository with your code
- ✅ Supabase database set up (from Step 1)
- ✅ Railway account (free tier works)

---

## Step-by-Step

### 1. Create Railway Account (2 minutes)

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign in with **GitHub** (recommended)
4. Authorize Railway to access your repositories

### 2. Deploy from GitHub (3 minutes)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select **"LangkahKecil"** repository
4. Railway will start analyzing your project

### 3. Configure Service (2 minutes)

1. Railway creates a service automatically
2. Click on the service
3. Go to **Settings** → **Source**
4. Set **Root Directory** to: `backend`
5. Click **Save**

### 4. Add Environment Variables (5 minutes)

1. Go to **Variables** tab
2. Click **"Raw Editor"** (if available) or add one by one
3. Copy variables from `backend/railway.env.template`
4. Replace placeholder values with your actual values:
   - `DATABASE_URL` - Your Supabase connection string
   - `JWT_SECRET` - Generate a random 32+ character string
   - `JWT_REFRESH_SECRET` - Another random 32+ character string
   - `SESSION_SECRET` - Another random 32+ character string
   - `FRONTEND_URL` - Your frontend URL
   - `API_URL` - Your Railway URL (get after deployment)
   - `PUBLIC_API_URL` - Same as API_URL + `/api`
   - Other variables as needed

**Quick Secret Generator:**
```bash
# Generate random secrets (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this 3 times to get your JWT_SECRET, JWT_REFRESH_SECRET, and SESSION_SECRET.

### 5. Deploy (3 minutes)

1. Railway automatically starts building
2. Watch the **Deployments** tab
3. Wait for status to show **"Live"** (usually 5-10 minutes)
4. Get your URL from **Settings** → **Networking**

### 6. Run Migrations (2 minutes)

**Option A: Railway Shell**
1. Click **"Shell"** tab in Railway
2. Run: `npx prisma migrate deploy`

**Option B: Railway CLI**
```bash
railway login
railway link
cd backend
railway run npx prisma migrate deploy
```

**Option C: Manual (Already Done)**
- If you already ran migrations in Supabase SQL Editor, skip this step

### 7. Verify (1 minute)

1. Test health endpoint:
   ```
   https://your-service.up.railway.app/api/health
   ```
2. Should return: `{"status":"ok",...}`

---

## 🎯 You're Done!

Your backend is now live! 

**Next Steps:**
- Update frontend `NEXT_PUBLIC_API_URL` to point to Railway
- Deploy frontend to Vercel (Step 3)
- Configure custom domain (optional)

---

## 📝 Environment Variables Quick Reference

**Minimum Required:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your-supabase-connection-string
JWT_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
SESSION_SECRET=your-32-char-secret
FRONTEND_URL=https://langkahkecil.org
API_URL=https://api.langkahkecil.org
PUBLIC_API_URL=https://api.langkahkecil.org/api
CORS_ORIGIN=https://langkahkecil.org
```

**See `backend/railway.env.template` for complete list.**

---

*For detailed troubleshooting, see `docs/RAILWAY_BACKEND_DEPLOYMENT.md`*
