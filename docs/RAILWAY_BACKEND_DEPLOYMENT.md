# Railway Backend Deployment Guide

Complete step-by-step guide for deploying your LangkahKecil backend to Railway.

## 🚀 Quick Start (5 Minutes)

If you're experienced with Railway, here's the quick version:

1. **Sign up**: https://railway.app → Login with GitHub
2. **New Project** → **Deploy from GitHub repo** → Select LangkahKecil
3. **Set Root Directory**: Settings → Source → Root Directory = `backend`
4. **Add Variables**: Variables tab → Add all from `backend/railway.env.template`
5. **Deploy**: Railway auto-deploys on push to main branch
6. **Run Migrations**: Railway Shell → `npx prisma migrate deploy`

**Done!** Your backend is live at `https://your-service.up.railway.app`

For detailed instructions, continue reading below.

---

## 📋 Quick Checklist

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Create new Railway project
- [ ] Configure deployment settings
- [ ] Set all environment variables
- [ ] Deploy backend
- [ ] Run database migrations
- [ ] Verify deployment
- [ ] Configure custom domain (optional)

**Estimated Time**: 20-30 minutes

---

## Prerequisites

- GitHub account with your LangkahKecil repository
- Supabase database already set up (from Step 1)
- All environment variables prepared
- Railway account (free tier available)

---

## Step 1: Create Railway Account

### 1.1 Sign Up for Railway

1. Go to [https://railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with:
   - **GitHub** (recommended - easiest for deployments)
   - **Email** (alternative option)

### 1.2 Verify Your Account

1. Check your email for verification (if using email signup)
2. Complete any onboarding steps Railway shows

---

## Step 2: Create New Project

### 2.1 Start New Project

1. In Railway dashboard, click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. If this is your first time, Railway will ask to install the Railway GitHub App
4. Click **"Configure Railway App"** or **"Install"**
5. Choose which repositories to give Railway access to:
   - **Option A**: Give access to all repositories
   - **Option B**: Only give access to specific repositories (more secure)
6. Select your **LangkahKecil** repository
7. Click **"Install"** or **"Save"**

### 2.2 Select Repository

1. After installing the GitHub app, you'll see a list of your repositories
2. Find and click on **"LangkahKecil"** repository
3. Railway will start analyzing your project

---

## Step 3: Configure Service

### 3.1 Railway Auto-Detection

Railway will automatically detect:
- ✅ **Dockerfile** in `backend/` directory
- ✅ **Node.js** project
- ✅ **Package.json** structure

### 3.2 Initial Service Setup

After selecting your repository, Railway will:
1. Analyze your project structure
2. Detect the Dockerfile
3. Create a service automatically

**If Railway doesn't auto-detect:**
1. Click **"Add Service"** → **"GitHub Repo"**
2. Select your **LangkahKecil** repository
3. Railway will create the service

### 3.3 Set Root Directory (Critical!)

**This is very important!** Railway needs to know where your backend code is.

1. Click on your newly created service
2. Go to **"Settings"** tab
3. Scroll to **"Source"** section
4. Find **"Root Directory"** field
5. Set it to: `backend`
6. Click **"Save"** or **"Update"**

**Why this matters:**
- Railway will look for `Dockerfile` in `backend/` directory
- All build commands will run from `backend/` directory
- Without this, Railway might look in the root directory and fail

### 3.4 Verify Dockerfile Path

1. Still in **Settings** → **Source**
2. Check **"Dockerfile Path"**:
   - Should be: `Dockerfile` (relative to root directory)
   - Or: `backend/Dockerfile` (if Railway needs full path)
3. Railway should auto-detect this, but verify it's correct

### 3.5 Build Configuration

Railway will use your Dockerfile which:
- ✅ Installs dependencies
- ✅ Generates Prisma Client
- ✅ Builds TypeScript to JavaScript
- ✅ Creates optimized production image

**No additional build commands needed** - your Dockerfile handles everything!

---

## Step 4: Configure Environment Variables

### 4.1 Access Environment Variables

1. In your Railway service, click on **"Variables"** tab
2. You'll see an empty environment variables section
3. Click **"New Variable"** to add each variable

### 4.2 Required Environment Variables

Add the following environment variables one by one:

#### Server Configuration

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_VERSION=v1
```

#### URLs Configuration

```env
FRONTEND_URL=https://langkahkecil.org
API_URL=https://api.langkahkecil.org
PUBLIC_API_URL=https://api.langkahkecil.org
```

**Note**: Replace with your actual domain. If you don't have a domain yet, use Railway's generated domain temporarily.

#### Database Configuration (Supabase)

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require
DB_SSL_REQUIRED=true
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Important**: 
- Use the **pooled connection** (port 6543) for production
- Include `?pgbouncer=true&sslmode=require` in the connection string
- Replace `YOUR_PASSWORD` and `PROJECT_REF` with your Supabase credentials

#### Authentication Secrets

```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret-minimum-32-characters-long-change-this
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your-session-secret-minimum-32-characters-long-change-this
BCRYPT_ROUNDS=12
```

**Important**: 
- Generate strong, random secrets (minimum 32 characters each)
- Use different values for each secret
- Never share these secrets publicly

#### CORS Configuration

```env
CORS_ORIGIN=https://langkahkecil.org
CORS_CREDENTIALS=true
```

**Note**: Replace with your actual frontend URL. For development, you can use `*` temporarily (not recommended for production).

#### Email Configuration (Resend)

```env
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@langkahkecil.org
RESEND_FROM_NAME=LangkahKecil
EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS=24
EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES=10
```

**Note**: Get your Resend API key from [https://resend.com](https://resend.com)

#### Google OAuth (Optional)

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Payment - Midtrans (Optional)

```env
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_WEBHOOK_SECRET=your-webhook-secret
```

**Note**: Set `MIDTRANS_IS_PRODUCTION=true` when ready for production.

#### AI Configuration (OpenAI - Optional)

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
AI_TOKEN_LIMIT_FREE_TRIAL=2000
AI_TOKEN_LIMIT_BASIC=10000
AI_TOKEN_LIMIT_PREMIUM=30000
AI_TOKEN_LIMIT_THERAPIST=50000
AI_RATE_LIMIT_PER_MINUTE=5
AI_RATE_LIMIT_PER_DAY=100
AI_MAX_PROMPT_LENGTH=1000
AI_MONTHLY_SPEND_LIMIT=100
```

#### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Registration Security

```env
REGISTRATION_MAX_ATTEMPTS_PER_IP=5
REGISTRATION_WINDOW_MINUTES=60
```

#### Feature Flags

```env
ENABLE_AI_FEATURES=true
ENABLE_FILE_UPLOAD=false
ENABLE_ANALYTICS=true
ENABLE_CMS=true
```

#### Storage (Optional - Cloudflare R2 or Supabase)

```env
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

### 4.3 Add Variables in Railway

**Method 1: Add One by One (Recommended for First Time)**

For each variable above:

1. Click **"New Variable"** button
2. Enter the **Variable Name** (e.g., `NODE_ENV`)
3. Enter the **Value** (e.g., `production`)
4. Click **"Add"** or **"Save"**
5. Repeat for all variables

**Method 2: Bulk Add Using Raw Editor (Faster)**

1. In Railway **Variables** tab, look for **"Raw Editor"** or **"Bulk Edit"** button
2. Click it to open the raw editor
3. Copy all variables from `backend/railway.env.template` file
4. Paste into the editor (format: `KEY=value`, one per line)
5. Replace placeholder values with your actual values
6. Click **"Save"** or **"Update"**

**Method 3: Using Railway CLI**

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link`
4. Set variables:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   # ... repeat for each variable
   ```

**Quick Reference Template:**

A template file is available at `backend/railway.env.template` with all required variables listed. Use it as a checklist!

---

## Step 5: Configure Build Settings

### 5.1 Verify Build Configuration

1. Go to service **"Settings"** tab
2. Check **"Build"** section:
   - **Builder**: Should be `Dockerfile` or `Nixpacks`
   - **Dockerfile Path**: Should be `Dockerfile` (relative to root directory)
   - **Root Directory**: Should be `backend`

3. If using `railway.json` (optional):
   - Railway will read configuration from `railway.json` in root
   - This file specifies Dockerfile path and build settings

### 5.2 Build Process

Railway will automatically:
- ✅ Detect Dockerfile in `backend/` directory
- ✅ Build using multi-stage Docker build
- ✅ Run `npm install` (installs all dependencies)
- ✅ Run `npx prisma generate` (generates Prisma Client)
- ✅ Run `npm run build` (compiles TypeScript)
- ✅ Create optimized production image
- ✅ Start the application with `node dist/index.js`

**Your Dockerfile handles all of this automatically!**

### 5.3 Build Timeout

- Default build timeout: **20 minutes**
- Your build should complete in **5-10 minutes**
- If build times out, check Dockerfile for optimization opportunities

---

## Step 6: Deploy

### 6.1 Trigger Deployment

1. Railway will automatically deploy when you:
   - Push code to your GitHub repository
   - Add environment variables (triggers redeploy)
   - Manually trigger from dashboard

2. To trigger manually:
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** button

### 6.2 Monitor Deployment

1. Watch the **"Deployments"** tab for build progress
2. You'll see:
   - **Building** - Docker image is being built
   - **Deploying** - Container is starting
   - **Live** - Service is running

3. Check **"Logs"** tab for any errors

### 6.3 Common Build Issues

**Issue**: Build fails with "Cannot find module"
- **Solution**: Ensure `Root Directory` is set to `backend`

**Issue**: Prisma generate fails
- **Solution**: Check `DATABASE_URL` is set correctly

**Issue**: Build succeeds but service crashes
- **Solution**: Check logs for missing environment variables

---

## Step 7: Run Database Migrations

### 7.1 Option A: Using Railway CLI (Recommended)

1. **Install Railway CLI:**
   ```bash
   # Windows (using npm)
   npm install -g @railway/cli
   
   # Or download from: https://railway.app/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```
   - Select your project and service

4. **Run migrations:**
   ```bash
   cd backend
   railway run npx prisma migrate deploy
   ```

### 7.2 Option B: Using Railway One-Click Shell

1. In Railway dashboard, go to your service
2. Click **"View Logs"** or **"Shell"** tab
3. Click **"Open Shell"** or **"Generate Shell Command"**
4. Run:
   ```bash
   npx prisma migrate deploy
   ```

### 7.3 Option C: Manual Migration (If CLI doesn't work)

Since you already have the manual migration SQL file:
1. Go to Supabase SQL Editor
2. Run the migrations from `backend/prisma/migrations/ALL_MIGRATIONS_COMBINED.sql`
3. Verify all tables are created

---

## Step 8: Verify Deployment

### 8.1 Get Your Railway URL

1. In Railway dashboard, go to your service
2. Click on **"Settings"** tab
3. Scroll to **"Networking"** section
4. You'll see a **"Generate Domain"** button (if not already generated)
5. Click it to get your Railway URL (e.g., `your-service.up.railway.app`)

### 8.2 Test Health Endpoint

1. Your backend should be accessible at: `https://your-service.up.railway.app`
2. Test health endpoint:
   ```bash
   # Using curl
   curl https://your-service.up.railway.app/api/health
   
   # Or open in browser
   https://your-service.up.railway.app/api/health
   ```

3. **Expected response:**
   ```json
   {
     "status": "ok",
     "timestamp": "2025-01-19T06:30:00.000Z",
     "uptime": 123.45,
     "environment": "production",
     "version": "1.0.0"
   }
   ```

4. **If you get 404:**
   - Check if service is running (check logs)
   - Verify the URL includes `/api/health` (not just `/health`)
   - Wait a few seconds after deployment completes

### 8.3 Test API Endpoints

```bash
# Test API root (might return 404, that's okay)
curl https://your-service.up.railway.app/api

# Test health endpoint (should work)
curl https://your-service.up.railway.app/api/health

# Test with authentication (requires valid token)
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-service.up.railway.app/api/profile
```

### 8.4 Verify Database Connection

Check logs to ensure database connection is successful:
1. Go to **Logs** tab
2. Look for messages like:
   - ✅ "Server listening on port 3000"
   - ✅ "Database connected successfully"
   - ✅ "Prisma Client generated"

If you see database connection errors:
- Verify `DATABASE_URL` is correct
- Check Supabase Network Restrictions
- Ensure SSL parameters are included

### 8.4 Check Logs

1. Go to **"Logs"** tab in Railway
2. Verify:
   - ✅ No error messages
   - ✅ Server started successfully
   - ✅ Database connection successful
   - ✅ All routes registered

---

## Step 9: Configure Custom Domain (Optional)

### 9.1 Add Custom Domain

1. In Railway service **"Settings"** → **"Networking"**
2. Scroll to **"Custom Domains"** section
3. Click **"Add Domain"**
4. Enter your domain: `api.langkahkecil.org`
5. Railway will provide DNS records to add

### 9.2 Configure DNS

#### For Cloudflare Users (Recommended)

**Step-by-Step Guide:**

1. **Log in to Cloudflare Dashboard**
   - Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - Log in with your Cloudflare account

2. **Select Your Domain**
   - Click on the domain you want to configure (e.g., `langkahkecil.org`)
   - You'll be taken to the domain's overview page

3. **Navigate to DNS Settings**
   - In the left sidebar, click on **"DNS"** (or **"DNS Records"**)
   - You'll see a list of existing DNS records

4. **Add CNAME Record**
   - Click the **"Add record"** button (usually a blue button at the top)
   - A form will appear to add a new DNS record

5. **Fill in CNAME Record Details**
   - **Type**: Select **"CNAME"** from the dropdown (if not already selected)
   - **Name**: Enter `api` (this creates `api.langkahkecil.org`)
     - **Note**: Just enter `api`, not `api.langkahkecil.org` - Cloudflare automatically appends your domain
   - **Target**: Enter your Railway service URL (e.g., `your-service.up.railway.app`)
     - **Important**: Do NOT include `https://` - just the domain name
   - **Proxy status**: 
     - **Proxied** (orange cloud ☁️) - Recommended for most cases
       - Provides DDoS protection
       - Hides your origin IP
       - Enables Cloudflare's CDN
     - **DNS only** (grey cloud ☁️) - Use if Railway requires direct connection
       - Direct connection to Railway
       - Faster for API endpoints (no CDN layer)
   - **TTL**: Leave as **"Auto"** (if using Proxied) or set to **"300"** (5 minutes) if DNS only

6. **Save the Record**
   - Click **"Save"** button
   - The record will appear in your DNS records list

7. **Verify the Record**
   - Check that the record shows:
     - **Type**: CNAME
     - **Name**: api
     - **Content/Target**: your-service.up.railway.app
     - **Proxy status**: Proxied or DNS only (depending on your choice)

**Example CNAME Record Configuration:**
```
Type:     CNAME
Name:     api
Target:   your-service.up.railway.app
Proxy:    DNS only (grey cloud)
TTL:      Auto
```

**For Other Domain Providers:**

1. Go to your domain provider's DNS management page
2. Add a **CNAME** record:
   - **Name/Host**: `api` (or `api.langkahkecil.org`)
   - **Target/Value**: `your-service.up.railway.app`
   - **TTL**: 300 (5 minutes) or Auto

3. Wait for DNS propagation (5-60 minutes)

### 9.3 Verify SSL

1. Railway automatically provisions SSL certificates
2. After DNS propagates, your domain will have HTTPS
3. Test: `https://api.langkahkecil.org/api/health`

---

## Step 10: Update Environment Variables for Custom Domain

After setting up custom domain, update these variables:

```env
API_URL=https://api.langkahkecil.org
PUBLIC_API_URL=https://api.langkahkecil.org/api
```

Railway will automatically redeploy when you update variables.

---

## 🚨 Troubleshooting

### Issue: Build Fails - "Cannot find Dockerfile"

**Error**: `Cannot find Dockerfile`

**Solution**:
1. Go to service **Settings** → **Source**
2. Set **Root Directory** to: `backend`
3. Set **Dockerfile Path** to: `backend/Dockerfile` or `Dockerfile`
4. Redeploy

### Issue: Service Crashes on Start

**Error**: Service starts then immediately crashes

**Solutions**:
1. **Check Logs**: Go to **Logs** tab and look for error messages
2. **Common causes**:
   - Missing environment variables
   - Invalid `DATABASE_URL`
   - Port mismatch (should be 3000)
   - Missing Prisma Client (run `prisma generate`)

### Issue: Database Connection Fails

**Error**: `Can't reach database server` or connection timeout

**Solutions**:
1. Verify `DATABASE_URL` is correct (use pooled connection port 6543)
2. Check Supabase Network Restrictions (should allow all IPs)
3. Ensure SSL is enabled: `?sslmode=require`
4. Test connection from Supabase SQL Editor first

### Issue: Health Endpoint Returns 404

**Error**: `/api/health` returns 404

**Solutions**:
1. Check if service is actually running (check logs)
2. Verify the URL format: `https://your-domain.up.railway.app/api/health`
3. Check if API routes are registered correctly
4. Verify `API_VERSION` environment variable is set to `v1`

### Issue: CORS Errors from Frontend

**Error**: CORS policy blocking requests

**Solutions**:
1. Update `CORS_ORIGIN` to match your frontend URL exactly
2. For development: `CORS_ORIGIN=http://localhost:5000`
3. For production: `CORS_ORIGIN=https://langkahkecil.org`
4. Ensure `CORS_CREDENTIALS=true` if using cookies

### Issue: Cloudflare CNAME Not Working

**Error**: Domain not resolving, SSL errors, or connection timeouts

**Solutions**:

1. **Verify CNAME Record is Correct**
   - Go to Cloudflare DNS settings
   - Check that the CNAME record shows:
     - **Name**: `api` (not `api.langkahkecil.org`)
     - **Target**: Your Railway URL (e.g., `your-service.up.railway.app`)
     - **No trailing slashes** in the target

2. **Check Proxy Status**
   - If using **Proxied** (orange cloud ☁️):
     - Wait 5-10 minutes for Cloudflare to update
     - Check Cloudflare SSL/TLS settings (should be "Full" or "Full (strict)")
   - If using **DNS only** (grey cloud ☁️):
     - Wait for DNS propagation (can take up to 24 hours, usually 5-60 minutes)
     - Use `dig api.langkahkecil.org` or `nslookup api.langkahkecil.org` to verify

3. **SSL/TLS Configuration**
   - Go to Cloudflare → **SSL/TLS** → **Overview**
   - Set encryption mode to **"Full"** or **"Full (strict)"**
   - **"Flexible"** won't work with Railway (Railway requires HTTPS)

4. **Clear DNS Cache**
   - On your computer: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
   - Or use a different DNS server (8.8.8.8) to test

5. **Verify Railway Domain Configuration**
   - In Railway, go to **Settings** → **Networking**
   - Ensure custom domain is added and verified
   - Railway should show "Valid" status for your domain

6. **Common Mistakes**
   - ❌ Including `https://` in CNAME target (should be just domain)
   - ❌ Using `api.langkahkecil.org` as Name (should be just `api`)
   - ❌ Wrong Railway URL (check Settings → Networking in Railway)
   - ❌ SSL mode set to "Flexible" (should be "Full")

### Issue: Prisma Client Not Generated

**Error**: `@prisma/client did not initialize yet`

**Solutions**:
1. The Dockerfile should run `npx prisma generate` automatically
2. If not, add to build process:
   ```dockerfile
   RUN npx prisma generate
   ```
3. Or run manually in Railway shell:
   ```bash
   railway run npx prisma generate
   ```

### Issue: Out of Memory

**Error**: Container runs out of memory

**Solutions**:
1. Railway free tier has memory limits
2. Upgrade to paid plan if needed
3. Or optimize your Dockerfile to use less memory
4. Check Railway dashboard for memory usage

---

## 📊 Monitoring & Logs

### View Logs

1. Go to your service in Railway
2. Click **"Logs"** tab
3. See real-time logs from your application
4. Filter by log level if needed

### View Metrics

1. Railway dashboard shows:
   - **CPU Usage**
   - **Memory Usage**
   - **Network Traffic**
   - **Request Count**

### Set Up Alerts (Optional)

1. Go to **Settings** → **Notifications**
2. Configure alerts for:
   - Service crashes
   - High memory usage
   - Deployment failures

---

## 🔄 Continuous Deployment

### Automatic Deployments

Railway automatically deploys when you:
- ✅ Push to `main` branch (or your default branch)
- ✅ Merge pull requests
- ✅ Update environment variables (triggers redeploy)

### Manual Deployments

1. Go to **Deployments** tab
2. Click **"Redeploy"** button
3. Select which deployment to redeploy from

### Branch Deployments

1. Railway can deploy different branches
2. Useful for staging environments
3. Configure in **Settings** → **Source**

---

## 💰 Pricing & Limits

### Free Tier

- **$5 credit/month** (usually enough for MVP)
- **500 hours** of usage
- **512MB RAM** per service
- **1GB storage**

### When to Upgrade

Upgrade to paid plan when:
- You exceed $5/month usage
- You need more memory (1GB+)
- You need more storage
- You need better performance

### Cost Estimation

- **MVP (0-100 users)**: Usually stays within free $5 credit
- **Growth (100-1000 users)**: $5-15/month
- **Scale (1000+ users)**: $20-50/month

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Health endpoint returns 200 OK
- [ ] Database migrations completed
- [ ] All environment variables set correctly
- [ ] API endpoints responding
- [ ] CORS configured for frontend
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Logs show no errors
- [ ] Monitoring set up

---

## 🔗 Next Steps

After backend is deployed:

1. ✅ **Update Frontend**: Point `NEXT_PUBLIC_API_URL` to your Railway backend URL
2. ✅ **Deploy Frontend**: Follow Step 3 (Frontend Deployment to Vercel)
3. ✅ **Configure DNS**: Set up domain routing
4. ✅ **Test End-to-End**: Verify full application flow

---

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Railway Logs**: Most issues show up in logs
2. **Railway Discord**: Active community support
3. **Railway Docs**: Comprehensive documentation
4. **GitHub Issues**: Check if others have similar issues

---

*Last updated: January 2025*
