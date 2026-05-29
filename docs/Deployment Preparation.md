# Deployment Preparation Guide

## Recommended Hosting Stack (Cheapest to Start, Scales Well)

### Phase 1: MVP (Months 1-3) - **$0-5/month**

| Service | Provider | Cost | Why |
|---------|----------|------|-----|
| **Frontend** | Vercel | **$0** | Free tier: 100GB bandwidth, unlimited requests, perfect for Next.js |
| **Backend** | Railway | **$0-5** | Free $5 credit/month, Docker support, auto-scaling |
| **Database** | Supabase | **$0** | Free tier: 500MB DB, 2GB bandwidth, managed PostgreSQL |
| **Domain** | Cloudflare | **$1-2** | Cheapest domains, free SSL, DDoS protection |
| **Email** | Resend | **$0** | 2,000 emails/month free |
| **Monitoring** | UptimeRobot | **$0** | 50 monitors free |

**Total: $0-7/month**

### Phase 2: Growth (100-1000 users) - **$20-50/month**

| Service | Provider | Cost | Why |
|---------|----------|------|-----|
| **Frontend** | Vercel Pro | **$20** | More bandwidth, better performance |
| **Backend** | Railway | **$5-15** | Pay-as-you-go, scales automatically |
| **Database** | Supabase Pro | **$25** | 8GB DB, better performance, backups |
| **Domain** | Cloudflare | **$1-2** | Same |
| **Email** | Resend | **$0-5** | Still mostly free |
| **Monitoring** | UptimeRobot | **$0** | Still free |

**Total: $51-67/month**

### Phase 3: Scale (1000+ users) - **$100-200/month**

- Frontend: Vercel Pro ($20)
- Backend: Railway ($20-50)
- Database: Supabase Pro ($25-50)
- CDN: Cloudflare Pro ($20)
- Monitoring: BetterStack ($0-25)

**Total: $85-165/month**

---

## Why This Stack?

### 1. **Vercel (Frontend)**
- ✅ **Free tier**: 100GB bandwidth, unlimited requests
- ✅ **Built for Next.js** - zero config needed
- ✅ **Automatic deployments** from Git
- ✅ **Global CDN** - fast worldwide
- ✅ **Free SSL** certificates
- ✅ **Scales automatically**

### 2. **Railway (Backend)**
- ✅ **Free $5 credit/month** (often enough for MVP)
- ✅ **Docker support** - works with your current setup
- ✅ **Auto-scaling** - handles traffic spikes
- ✅ **Simple deployment** - connect GitHub, deploy
- ✅ **Pay-as-you-go** pricing
- ✅ **Alternative**: Render (similar, $7/month starter)

### 3. **Supabase (Database)**
- ✅ **Free tier**: 500MB PostgreSQL (enough for MVP)
- ✅ **Managed** - backups, updates, monitoring included
- ✅ **Built-in API** - can use REST API if needed
- ✅ **Row-level security** - great for multi-tenant apps
- ✅ **Real-time subscriptions** - if needed later
- ✅ **Easy scaling** - upgrade when needed

### 4. **Cloudflare (Domain + Security)**
- ✅ **Cheap domains** ($8-12/year)
- ✅ **Free SSL** certificates
- ✅ **DDoS protection** included
- ✅ **CDN** (if needed later)
- ✅ **Great security** features

---

## Migration Path (No Code Changes Needed!)

### Step 1: Database Migration (30 minutes)

1. **Sign up for Supabase** (free)
2. **Create new PostgreSQL project**
3. **Get connection string**
4. **Run migrations:**
   ```bash
   # Update DATABASE_URL in backend/.env
   DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   
   # Run migrations
   cd backend
   npx prisma migrate deploy
   ```

### Step 2: Backend Deployment (15 minutes)

**📖 Detailed Guide**: See [RAILWAY_BACKEND_DEPLOYMENT.md](./RAILWAY_BACKEND_DEPLOYMENT.md)  
**⚡ Quick Start**: See [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md)

**Quick Steps:**
1. **Sign up for Railway** → https://railway.app
2. **Connect GitHub repo** → Deploy from GitHub
3. **Set Root Directory** → `backend` (critical!)
4. **Add environment variables** → Use `backend/railway.env.template` as reference
5. **Deploy** → Railway auto-deploys
6. **Run migrations** → `npx prisma migrate deploy` (or use manual SQL)
7. **Verify** → Test `/api/health` endpoint

**Environment Variables Template**: `backend/railway.env.template`

### Step 3: Frontend Deployment (15 minutes)

**📖 Detailed Guide**: See [VERCEL_FRONTEND_DEPLOYMENT.md](./VERCEL_FRONTEND_DEPLOYMENT.md)

**Quick Steps:**
1. **Sign up for Vercel** → https://vercel.com
2. **Connect GitHub repo** → Import Git Repository
3. **Set Root Directory** → `frontend` (critical!)
4. **Add environment variables** → `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, etc.
5. **Deploy** → Vercel auto-deploys
6. **Verify** → Test homepage and API connections

**Environment Variables Required:**
- `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://api.langkahkecil.org/api`)
- `NEXT_PUBLIC_SITE_URL` - Your frontend URL (e.g., `https://langkahkecil.org`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID (optional, see [GOOGLE_ANALYTICS_SETUP.md](./GOOGLE_ANALYTICS_SETUP.md) for OAuth setup)
- `NEXT_PUBLIC_STORAGE_URL` - Supabase Storage public URL (optional, see [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md))
- `NEXT_PUBLIC_GA_ID` - Google Analytics Measurement ID (optional, see [GOOGLE_ANALYTICS_SETUP.md](./GOOGLE_ANALYTICS_SETUP.md))

### Step 4: Domain Setup (10-15 minutes)

This step configures your custom domain to point to your deployed frontend (Vercel) and backend (Railway).

#### 4.1: Purchase or Transfer Domain to Cloudflare

**Option A: Buy New Domain on Cloudflare**

1. **Sign up for Cloudflare**: Go to https://www.cloudflare.com → Sign Up
2. **Go to Domain Registration**: 
   - Click on your profile → **"Domain Registration"** or go to https://dash.cloudflare.com/registrar
3. **Search for Domain**:
   - Enter your desired domain (e.g., `langkahkecil.org`)
   - Click **"Search"**
4. **Select Domain**:
   - Choose your preferred TLD (.com, .org, .id, etc.)
   - Add to cart and proceed to checkout
5. **Complete Purchase**:
   - Enter your contact information
   - Complete payment
   - Domain will be automatically added to your Cloudflare account

**Option B: Transfer Existing Domain to Cloudflare**

1. **Prepare Domain for Transfer**:
   - Unlock your domain at current registrar
   - Get authorization code (EPP code) from current registrar
   - Ensure domain is at least 60 days old (ICANN requirement)
2. **Initiate Transfer on Cloudflare**:
   - Go to https://dash.cloudflare.com/registrar
   - Click **"Transfer Domains"**
   - Enter your domain name
   - Enter authorization code
   - Complete transfer process (takes 5-7 days)

**Option C: Use Existing Domain (Keep at Current Registrar)**

If you want to keep your domain at your current registrar:
- You can still use Cloudflare's DNS (free) by changing nameservers
- Or configure DNS records directly at your current registrar

---

#### 4.2: Configure DNS for Frontend (Vercel)

**📌 Quick Reference: How to Get Cloudflare Nameservers**

1. Go to: https://dash.cloudflare.com
2. Click on your domain name
3. Look for **"Nameservers"** section (usually on Overview page)
4. Copy the two nameservers (format: `[name].ns.cloudflare.com`)
5. You'll need both nameservers for the next step

**Method 1: Using Cloudflare Nameservers (Recommended)**

1. **Add Domain to Cloudflare**:
   - In Cloudflare Dashboard, click **"Add a Site"**
   - Enter your domain (e.g., `langkahkecil.org`)
   - Select **Free plan** (sufficient for DNS)
   - Click **"Continue"**

2. **Get Nameservers from Cloudflare**:

   **Method A: During Initial Setup (When Adding Domain)**
   - After clicking "Continue" in step 1, Cloudflare will scan your domain
   - Once scan completes, you'll see a page titled **"Update your nameservers"**
   - Cloudflare will display **two nameservers** that look like:
     - `alice.ns.cloudflare.com`
     - `bob.ns.cloudflare.com`
     - (Note: Your actual nameservers will be different, but follow the same pattern)
   - **Copy both nameservers** - you'll need them in the next step
   - These nameservers are unique to your account and domain

   **Method B: From Cloudflare Dashboard (If Domain Already Added)**
   
   **Try these locations in order:**
   
   **Location 1: Overview Page (Right Side)**
   - Go to Cloudflare Dashboard: https://dash.cloudflare.com
   - Click on your domain name (e.g., `langkahkecil.org`)
   - On the **Overview** page, look at the **right sidebar** (not Quick Start)
   - Find a card/box titled **"Nameservers"** or **"DNS"**
   - The nameservers should be listed there
   
   **Location 2: DNS Settings Page**
   - In the left sidebar, click **"DNS"** (not "Records", but the main DNS page)
   - Scroll to the top of the page
   - Look for **"Nameservers"** section near the top
   - You should see your nameservers listed
   
   **Location 3: Domain Registration Page (If Domain Registered with Cloudflare)**
   - Go to: https://dash.cloudflare.com/registrar
   - Find your domain in the list
   - Click on your domain name
   - Look for **"Nameservers"** section
   - Copy the two nameservers shown
   
   **Location 4: Check Initial Setup Email**
   - Check your email inbox for the email Cloudflare sent when you added the domain
   - The email usually contains the nameservers
   - Subject line: "Update your nameservers" or similar
   
   **Location 5: If Domain is Not Fully Activated**
   - If you just added the domain but haven't updated nameservers yet:
   - Go to: https://dash.cloudflare.com
   - You should see a banner or notification at the top saying **"Update your nameservers"**
   - Click on it to see the nameservers
   
   **What to Look For:**
   - The nameservers will be displayed, typically in a format like:
     ```
     alice.ns.cloudflare.com
     bob.ns.cloudflare.com
     ```
   - Or they might be shown as:
     ```
     Nameserver 1: alice.ns.cloudflare.com
     Nameserver 2: bob.ns.cloudflare.com
     ```
   - **Copy both nameservers** - click the copy icon next to each, or manually copy them
   
   **If You Still Can't Find Them:**
   - Make sure your domain is actually added to Cloudflare (not just registered)
   - Try refreshing the page
   - Check if there's a notification/banner at the top of the dashboard
   - If domain was just added, wait a few minutes and refresh

   **Method C: From Domain Registration Page (If Domain is Registered with Cloudflare)**
   - Go to: https://dash.cloudflare.com/registrar
   - Find your domain in the list
   - Click on your domain name
   - Look for **"Nameservers"** section
   - Copy the two nameservers shown

   **What the Nameservers Look Like:**
   - Format: `[name].ns.cloudflare.com`
   - Examples:
     - `alice.ns.cloudflare.com`
     - `bob.ns.cloudflare.com`
     - `dana.ns.cloudflare.com`
     - `finn.ns.cloudflare.com`
   - You'll always get **exactly 2 nameservers**
   - Both are required - don't use just one

   **Troubleshooting: Can't Find Nameservers?**
   
   If you can't find nameservers in any of the locations above, try these steps:
   
   1. **Check Domain Status:**
      - Go to Cloudflare Dashboard → Your Domain → Overview
      - Look at the top of the page - is there a banner saying "Update your nameservers"?
      - If yes, click on it to see the nameservers
   
   2. **Check if Domain is Fully Added:**
      - In Cloudflare Dashboard, check if your domain shows as "Active" or "Pending"
      - If it shows "Pending" or "Incomplete setup", you need to complete the setup first
      - Look for any notifications or warnings at the top of the page
   
   3. **Try DNS Page Directly:**
      - Go to: `https://dash.cloudflare.com/[your-account-id]/[your-domain]/dns`
      - Replace `[your-account-id]` and `[your-domain]` with your actual values
      - Nameservers might be shown at the top of this page
   
   4. **Check Right Sidebar on Overview:**
      - On the Overview page, look at the **right sidebar** (not the main content area)
      - There's often a card/widget showing nameservers there
      - It might be collapsed - look for a "Nameservers" heading you can expand
   
   5. **Use Cloudflare API (Advanced):**
      - If you have API access, you can get nameservers via API
      - But this is usually not necessary - the UI should show them
   
   6. **Contact Cloudflare Support:**
      - If none of the above works, the domain might not be properly added
      - Try removing and re-adding the domain to Cloudflare
      - Or contact Cloudflare support for assistance
   
   **Important Notes:**
   - ⚠️ **Don't proceed to the next step** until you have copied both nameservers
   - ⚠️ These nameservers are **unique to your Cloudflare account** - don't use nameservers from tutorials or other accounts
   - ⚠️ If you can't find nameservers, make sure your domain is fully added to Cloudflare (not just registered)
   - ⚠️ Nameservers are usually visible immediately after adding a domain - if not, there might be an issue with the domain setup

3. **Update Nameservers at Your Domain Registrar**:

   **Important:** You need to update nameservers at your **domain registrar** (where you bought the domain), NOT in Cloudflare. Cloudflare is just showing you which nameservers to use.

   **Your Cloudflare Nameservers:**
   - `bingo.ns.cloudflare.com`
   - `cosmin.ns.cloudflare.com`
   
   **Step-by-Step Instructions:**

   **If Your Domain is Registered with Cloudflare:**
   
   1. Go to: https://dash.cloudflare.com/registrar
   2. Find your domain in the list
   3. Click on your domain name
   4. Look for **"Nameservers"** section
   5. You should see the nameservers are already set (since domain is with Cloudflare)
   6. If they're different, click **"Change"** or **"Edit"**
   7. Enter:
      - Nameserver 1: `bingo.ns.cloudflare.com`
      - Nameserver 2: `cosmin.ns.cloudflare.com`
   8. Click **"Save"** or **"Update"**
   9. Wait 5-60 minutes for changes to propagate

   **If Your Domain is Registered Elsewhere (GoDaddy, Namecheap, etc.):**

   **For GoDaddy:**
   1. Log in to GoDaddy: https://www.godaddy.com
   2. Go to **"My Products"** → **"Domains"**
   3. Find your domain and click on it (or click the **"DNS"** button)
   4. Scroll down to **"Nameservers"** section
   5. Click **"Change"** or **"Edit"**
   6. Select **"Custom"** (not "Default")
   7. Enter:
      - Nameserver 1: `bingo.ns.cloudflare.com`
      - Nameserver 2: `cosmin.ns.cloudflare.com`
   8. Click **"Save"** or **"Update"**
   9. Wait 5-60 minutes for DNS propagation

   **For Namecheap:**
   1. Log in to Namecheap: https://www.namecheap.com
   2. Go to **"Domain List"** from the left sidebar
   3. Click **"Manage"** next to your domain
   4. Go to **"Advanced DNS"** tab
   5. Scroll to **"Nameservers"** section
   6. Select **"Custom DNS"** (not "Namecheap BasicDNS")
   7. Enter:
      - Nameserver 1: `bingo.ns.cloudflare.com`
      - Nameserver 2: `cosmin.ns.cloudflare.com`
   8. Click the **"✓"** (checkmark) to save
   9. Wait 5-60 minutes for DNS propagation

   **For Google Domains:**
   1. Log in to Google Domains: https://domains.google.com
   2. Click on your domain name
   3. Go to **"DNS"** section in the left menu
   4. Scroll to **"Name servers"** section
   5. Click **"Use custom name servers"**
   6. Enter:
      - Nameserver 1: `bingo.ns.cloudflare.com`
      - Nameserver 2: `cosmin.ns.cloudflare.com`
   7. Click **"Save"**
   8. Wait 5-60 minutes for DNS propagation

   **For Other Registrars (General Steps):**
   1. Log in to your domain registrar's website
   2. Find your domain in the domain list
   3. Look for **"DNS Settings"**, **"Nameservers"**, or **"Domain Settings"**
   4. Find the option to change/edit nameservers
   5. Replace existing nameservers with:
      - `bingo.ns.cloudflare.com`
      - `cosmin.ns.cloudflare.com`
   6. Save the changes
   7. Wait 5-60 minutes for DNS propagation

   **Important Notes:**
   - ⚠️ You need **BOTH** nameservers - don't use just one
   - ⚠️ Make sure to enter them exactly as shown: `bingo.ns.cloudflare.com` and `cosmin.ns.cloudflare.com`
   - ⚠️ Don't add `http://` or `https://` - just the nameserver address
   - ⚠️ Changes can take 5-60 minutes to propagate (sometimes up to 24 hours)
   - ⚠️ After updating, Cloudflare will automatically detect the change (may take a few minutes)

   **How to Verify Nameservers Are Updated:**
   1. Wait 5-10 minutes after saving
   2. Use DNS checker: https://dnschecker.org
   3. Enter your domain name
   4. Select "NS" (Nameserver) record type
   5. Check that it shows `bingo.ns.cloudflare.com` and `cosmin.ns.cloudflare.com` globally

4. **Add Domain in Vercel**:
   - Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
   - Click **"Add"** button
   - Enter your domain: `langkahkecil.org` (root domain)
   - Click **"Add"**
   - Vercel will show DNS records to add (if not using nameservers)

5. **Configure DNS Records in Cloudflare**:

   **Important:** After adding your domain in Vercel, Vercel will show you the exact DNS records you need to add. The records shown in Vercel are what you need to configure in Cloudflare.

   **Step-by-Step:**
   
   1. **Go to Cloudflare DNS Settings:**
      - Go to Cloudflare Dashboard: https://dash.cloudflare.com
      - Click on your domain (`langkahkecil.org`)
      - In the left sidebar, click **"DNS"** → **"Records"**
   
   2. **Add Root Domain Record (langkahkecil.org):**
      
      Vercel will show you an **A record** for the root domain. Based on your Vercel dashboard, you need:
      
      - Click **"Add record"** button
      - **Type**: `A`
      - **Name**: `@` (this represents the root domain)
      - **IPv4 address**: `216.198.79.1` (or whatever IP Vercel shows you)
      - **Proxy status**: ⚠️ **DNS only (grey cloud)** - **CRITICAL: Proxy must be OFF**
      - **TTL**: Auto
      - Click **"Save"**
      
      **Why Proxy Must Be Off:**
      - Vercel needs direct access to verify the domain
      - Cloudflare proxy (orange cloud) can interfere with Vercel's verification
      - Make sure the cloud icon is **grey** (DNS only), not **orange** (proxied)
   
   3. **Add WWW Subdomain Record (www.langkahkecil.org):**
      
      Vercel will show you a **CNAME record** for the www subdomain. Based on your Vercel dashboard, you need:
      
      - Click **"Add record"** button again
      - **Type**: `CNAME`
      - **Name**: `www`
      - **Target**: `cb1aa35f92a49dcc.vercel-dns-017.com.` (or whatever Vercel shows you - note the trailing dot)
      - **Proxy status**: ⚠️ **DNS only (grey cloud)** - **CRITICAL: Proxy must be OFF**
      - **TTL**: Auto
      - Click **"Save"**
      
      **Important Notes:**
      - The target value from Vercel may include a trailing dot (`.`) - that's correct, keep it
      - Make sure proxy is **OFF** (grey cloud icon)
   
   4. **Verify Records Are Correct:**
      
      After adding both records, your Cloudflare DNS should have:
      
      ```
      Type    Name    Content/Target                          Proxy
      A       @       216.198.79.1                            DNS only (grey)
      CNAME   www     cb1aa35f92a49dcc.vercel-dns-017.com.    DNS only (grey)
      ```
      
      **Checklist:**
      - ✅ Both records are added
      - ✅ Proxy is OFF (grey cloud) for both records
      - ✅ Values match exactly what Vercel shows
      - ✅ No extra spaces or characters
   
   5. **Wait for DNS Propagation:**
      - DNS changes can take 5-60 minutes to propagate
      - Vercel will automatically detect when DNS is correct
      - You can refresh the Vercel domain page to check status
   
   6. **Verify in Vercel:**
      - Go back to Vercel → Your Project → Settings → Domains
      - The "Invalid Configuration" error should disappear
      - Status should change to "Valid Configuration" or show as connected
      - SSL certificate will be provisioned automatically (takes 5-60 minutes)
   
   **Troubleshooting:**
   
   **If "Invalid Configuration" persists:**
   - ⚠️ **Check proxy status** - Make sure both records have proxy OFF (grey cloud)
   - ⚠️ **Verify values match exactly** - Copy from Vercel, paste into Cloudflare
   - ⚠️ **Wait longer** - DNS can take up to 60 minutes to propagate
   - ⚠️ **Check for duplicate records** - Remove any old/duplicate DNS records
   - ⚠️ **Verify nameservers** - Make sure your domain is using Cloudflare nameservers
   
   **If you see old records mentioned in Vercel:**
   - Vercel may mention old records like `cname.vercel-dns.com` or `76.76.21.21`
   - These are deprecated - use the new records Vercel shows you
   - The new records (like `cb1aa35f92a49dcc.vercel-dns-017.com.`) are recommended

6. **Wait for SSL Certificate**:
   - Vercel automatically provisions SSL certificates
   - Takes 5-60 minutes after DNS propagates
   - Check Vercel → Domains to see SSL status

**Method 2: Using CNAME Record (If Not Using Cloudflare Nameservers)**

1. **Add Domain in Vercel** (same as above)
2. **Get CNAME Target from Vercel**:
   - Vercel will show: `cname.vercel-dns.com`
3. **Add CNAME at Your DNS Provider**:
   - Go to your DNS provider (registrar or DNS service)
   - Add CNAME record:
     - **Name/Host**: `@` (or leave blank for root domain)
     - **Type**: `CNAME`
     - **Value/Target**: `cname.vercel-dns.com`
     - **TTL**: Auto or 300
   - Save the record

**For WWW Subdomain (Optional):**

1. **Add www subdomain in Vercel**:
   - In Vercel → Domains, add `www.langkahkecil.org`
2. **Add CNAME Record**:
   - **Name**: `www`
   - **Type**: `CNAME`
   - **Target**: `cname.vercel-dns.com`
   - Save

---

#### 4.3: Configure DNS for Backend API (Railway)

1. **Get Railway Service URL**:

   **Method 1: From Railway Dashboard (Service Overview)**
   
   1. Go to Railway Dashboard: https://railway.app/dashboard
   2. Click on your project (e.g., "LangkahKecil" or your project name)
   3. Click on your service (e.g., "backend" or your service name)
   4. On the service overview page, look for the **"Domains"** section or **"Settings"** tab
   5. You'll see your Railway-generated domain, which looks like:
      ```
      your-service-name.up.railway.app
      ```
      or
      ```
      your-service-name-production.up.railway.app
      ```
   6. **Copy this URL** - this is your Railway service URL
   
   **Method 2: From Railway Service Settings**
   
   1. Go to Railway Dashboard → Your Project → Your Service
   2. Click on the **"Settings"** tab (in the top navigation or left sidebar)
   3. Scroll down to **"Domains"** or **"Networking"** section
   4. You'll see:
      - **"Railway Domain"**: This is your service URL (e.g., `your-service.up.railway.app`)
      - **"Custom Domain"**: If you've set one up (optional)
   5. **Copy the Railway Domain** - this is what you need for DNS
   
   **Method 3: From Deployments/Logs**
   
   1. Go to Railway Dashboard → Your Project → Your Service
   2. Click on **"Deployments"** or **"Logs"** tab
   3. Look at the deployment logs or environment variables
   4. The service URL is often shown in the logs or can be found in environment variables
   5. It will be in the format: `https://your-service-name.up.railway.app`
   
   **Method 4: From Environment Variables**
   
   1. Go to Railway Dashboard → Your Project → Your Service
   2. Click on **"Variables"** tab
   3. Look for `RAILWAY_PUBLIC_DOMAIN` or `RAILWAY_STATIC_URL` variable
   4. The value will be your service URL
   
   **What the Railway URL Looks Like:**
   - Format: `[service-name].up.railway.app`
   - Examples:
     - `langkahkecil-backend.up.railway.app`
     - `backend-production.up.railway.app`
     - `api-langkahkecil.up.railway.app`
   - The URL is automatically generated by Railway
   - It's always in the format: `[name].up.railway.app`
   
   **Important Notes:**
   - ⚠️ Railway automatically generates this URL when you deploy
   - ⚠️ The URL is unique to your service
   - ⚠️ You can use this URL directly, or set up a custom domain (like `api.langkahkecil.org`)
   - ⚠️ Railway provides free SSL certificates for `.up.railway.app` domains
   - ⚠️ If you don't see a domain, make sure your service is deployed and running

2. **Add API Subdomain in Cloudflare**:
   - Go to Cloudflare Dashboard → Your Domain → **DNS** → **Records**
   - Click **"Add record"**
   - Configure:
     - **Type**: `CNAME`
     - **Name**: `api` (this creates `api.langkahkecil.org`)
     - **Target**: Your Railway service URL (e.g., `your-service.up.railway.app`)
     - **Proxy status**: DNS only (grey cloud) ⚠️ **Important**: Turn OFF proxy for API subdomain
     - **TTL**: Auto
   - Click **"Save"**

3. **Alternative: Use A Record (If Railway Provides IP)**:
   - If Railway provides an IP address:
     - **Type**: `A`
     - **Name**: `api`
     - **IPv4 address**: Railway's IP address
     - **Proxy status**: DNS only (grey cloud)
     - **TTL**: Auto

4. **Update Backend Environment Variables**:
   - In Railway, update `CORS_ORIGIN` to include your new domain:
     ```
     CORS_ORIGIN=https://langkahkecil.org,https://www.langkahkecil.org
     ```
   - Update any other environment variables that reference the API URL

5. **Update Frontend Environment Variables**:
   - In Vercel, update `NEXT_PUBLIC_API_URL`:
     ```
     NEXT_PUBLIC_API_URL=https://api.langkahkecil.org/api
     ```
   - This will trigger a new deployment

---

#### 4.4: SSL Certificate Configuration

**Vercel (Frontend)**:
- ✅ SSL is **automatic** - no action needed
- Vercel provisions SSL certificates automatically
- Takes 5-60 minutes after DNS propagates
- Check status in Vercel → Domains → Your Domain

**Railway (Backend)**:
- ✅ SSL is **automatic** for Railway domains (`*.up.railway.app`)
- For custom domain (`api.langkahkecil.org`):
  - Railway automatically provisions SSL
  - May take a few minutes after DNS propagates
  - Check Railway → Settings → Domains

**Cloudflare (If Using Proxy)**:
- ✅ SSL is **automatic** when proxy is enabled (orange cloud)
- Cloudflare provides free SSL certificates
- Ensure proxy is ON for frontend domain
- Ensure proxy is OFF for API subdomain (for direct connection)

---

#### 4.5: Verify DNS Configuration

1. **Check DNS Propagation**:
   - Use https://dnschecker.org
   - Enter your domain: `langkahkecil.org`
   - Check that records are propagated globally (may take 5-60 minutes)

2. **Test Frontend Domain**:
   ```bash
   # Test root domain
   curl -I https://langkahkecil.org
   
   # Should return 200 OK
   ```

3. **Test API Subdomain**:
   ```bash
   # Test API endpoint
   curl -I https://api.langkahkecil.org/api/health
   
   # Should return 200 OK
   ```

4. **Verify SSL Certificates**:
   - Visit https://www.ssllabs.com/ssltest/
   - Enter your domain
   - Check SSL rating (should be A or A+)

---

#### 4.6: Update Application Configuration

1. **Update Frontend Environment Variables in Vercel**:
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Update `NEXT_PUBLIC_SITE_URL`:
     ```
     NEXT_PUBLIC_SITE_URL=https://langkahkecil.org
     ```
   - Update `NEXT_PUBLIC_API_URL`:
     ```
     NEXT_PUBLIC_API_URL=https://api.langkahkecil.org/api
     ```
   - Vercel will automatically redeploy

2. **Update Backend Environment Variables in Railway**:
   - Go to Railway → Your Service → Variables
   - Update `CORS_ORIGIN`:
     ```
     CORS_ORIGIN=https://langkahkecil.org,https://www.langkahkecil.org
     ```
   - Railway will automatically redeploy

3. **Update Google OAuth (If Using)**:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add authorized JavaScript origins:
     - `https://langkahkecil.org`
     - `https://www.langkahkecil.org`
   - Add authorized redirect URIs:
     - `https://langkahkecil.org/api/auth/callback/google`
     - `https://www.langkahkecil.org/api/auth/callback/google`

---

#### 4.7: Common Issues & Troubleshooting

**Issue: DNS Not Propagating**
- **Solution**: Wait 5-60 minutes (can take up to 24 hours)
- Check DNS propagation: https://dnschecker.org
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

**Issue: SSL Certificate Not Provisioning**
- **Solution**: Wait 5-60 minutes after DNS propagates
- Ensure DNS records are correct
- Check Vercel/Railway domain settings for errors

**Issue: 404 Error on Custom Domain**
- **Solution**: 
  - Verify domain is added in Vercel/Railway
  - Check DNS records are correct
  - Ensure root directory is set correctly (`frontend` for Vercel)

**Issue: CORS Errors**
- **Solution**: 
  - Update `CORS_ORIGIN` in Railway to include your frontend domain
  - Ensure API subdomain DNS is correct
  - Check that proxy is OFF for API subdomain in Cloudflare

**Issue: Mixed Content Warnings**
- **Solution**: 
  - Ensure all URLs use HTTPS
  - Update environment variables to use HTTPS
  - Check that SSL certificates are active

---

#### 4.8: Final Checklist

- [ ] Domain purchased/transferred to Cloudflare
- [ ] Nameservers updated (if using Cloudflare DNS)
- [ ] Root domain (`langkahkecil.org`) points to Vercel
- [ ] WWW subdomain (`www.langkahkecil.org`) points to Vercel (optional)
- [ ] API subdomain (`api.langkahkecil.org`) points to Railway
- [ ] SSL certificates active on all domains
- [ ] Frontend environment variables updated (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`)
- [ ] Backend environment variables updated (`CORS_ORIGIN`)
- [ ] Google OAuth updated with new domains (if applicable)
- [ ] DNS propagation verified globally
- [ ] Frontend accessible at `https://langkahkecil.org`
- [ ] Backend API accessible at `https://api.langkahkecil.org/api/health`
- [ ] SSL certificates verified (A or A+ rating)

**Estimated Time**: 10-15 minutes (plus DNS propagation wait time: 5-60 minutes)

**Total migration time: ~1.5-2 hours**

**📖 Detailed Guides Available:**
- **Backend**: [RAILWAY_BACKEND_DEPLOYMENT.md](./RAILWAY_BACKEND_DEPLOYMENT.md)
- **Frontend**: [VERCEL_FRONTEND_DEPLOYMENT.md](./VERCEL_FRONTEND_DEPLOYMENT.md)

---

## Security Features (Built-in)

✅ **SSL/TLS**: Free certificates (Vercel, Railway, Supabase)  
✅ **DDoS Protection**: Cloudflare  
✅ **Database Security**: Supabase (encrypted at rest, connection encryption)  
✅ **Environment Variables**: Secure storage on all platforms  
✅ **Backups**: Supabase (daily backups on Pro)  
✅ **Monitoring**: UptimeRobot (free alerts)

---

## Scaling Path

### Month 1-3: MVP
- **Cost**: $0-5/month
- **Users**: 0-100
- **Traffic**: Low

### Month 4-12: Growth
- **Cost**: $20-50/month
- **Users**: 100-1000
- **Traffic**: Moderate

### Year 2+: Scale
- **Cost**: $100-200/month
- **Users**: 1000+
- **Traffic**: High

**All services scale automatically - no architecture changes needed!**

---

## Comparison with Alternatives

| Option | Month 1 | Month 6 | Month 12 | Ease of Use |
|--------|---------|---------|----------|-------------|
| **Recommended Stack** | $0-5 | $20-50 | $100-200 | ⭐⭐⭐⭐⭐ |
| AWS (all services) | $10-20 | $50-100 | $200-400 | ⭐⭐⭐ |
| DigitalOcean VPS | $6 | $12 | $24 | ⭐⭐⭐ |
| GoDaddy VPS | $20 | $40 | $80 | ⭐⭐ |

---

## Next Steps

### 1. Create Accounts
- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Supabase**: https://supabase.com
- **Cloudflare**: https://cloudflare.com

### 2. Detailed Deployment Guides
- ✅ **Backend Deployment**: [RAILWAY_BACKEND_DEPLOYMENT.md](./RAILWAY_BACKEND_DEPLOYMENT.md) - Complete Railway setup guide
- ✅ **Frontend Deployment**: [VERCEL_FRONTEND_DEPLOYMENT.md](./VERCEL_FRONTEND_DEPLOYMENT.md) - Complete Vercel setup guide
- ✅ **Supabase Storage**: [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md) - How to get Supabase Storage public URL
- ✅ **Google Analytics**: [GOOGLE_ANALYTICS_SETUP.md](./GOOGLE_ANALYTICS_SETUP.md) - How to get Google Analytics Measurement ID
- ✅ **DNS Configuration**: Included in both guides (Cloudflare CNAME setup)

### 3. Keep Your Current Setup
- ✅ **No need to switch to MySQL** - keep PostgreSQL
- ✅ **Keep Docker** - Railway supports it
- ✅ **Minimal code changes** - mostly config

---

## Important Notes

### Current Application Stack
- **Frontend**: Next.js (React)
- **Backend**: Fastify (Node.js)
- **Database**: PostgreSQL
- **Containerization**: Docker Compose

### Why This Stack Works
- ✅ **No database migration needed** - keep PostgreSQL
- ✅ **Docker support** - Railway handles Docker deployments
- ✅ **Modern stack** - all services optimized for Node.js/Next.js
- ✅ **Managed services** - less maintenance, more focus on features
- ✅ **Auto-scaling** - handles traffic growth automatically

### Cost Breakdown by Phase

**Phase 1 (MVP):**
- Vercel: $0
- Railway: $0-5 (free credit)
- Supabase: $0
- Domain: $1-2
- **Total: $0-7/month**

**Phase 2 (Growth):**
- Vercel Pro: $20
- Railway: $5-15
- Supabase Pro: $25
- Domain: $1-2
- **Total: $51-67/month**

**Phase 3 (Scale):**
- Vercel Pro: $20
- Railway: $20-50
- Supabase Pro: $25-50
- Cloudflare Pro: $20
- **Total: $85-165/month**

---

## Deployment Checklist

### Pre-Deployment
- [ ] Create accounts on all platforms
- [ ] Set up domain on Cloudflare
- [ ] Prepare environment variables list
- [ ] Backup current database (if migrating from existing)

### Database Setup
- [ ] Create Supabase project
- [ ] Get connection string
- [ ] Test connection locally
- [ ] Run Prisma migrations
- [ ] Verify schema matches

### Backend Deployment
- [ ] Connect Railway to GitHub
- [ ] Configure Dockerfile path
- [ ] Set all environment variables
- [ ] Test deployment
- [ ] Verify health check endpoint

### Frontend Deployment
- [ ] Create Vercel account
- [ ] Connect Vercel to GitHub repository
- [ ] Set root directory to `frontend` (critical!)
- [ ] Configure build settings (auto-detected for Next.js)
- [ ] Set all environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, etc.)
- [ ] Deploy frontend
- [ ] Test deployment (homepage loads)
- [ ] Verify API connections (test login/register)
- [ ] Configure custom domain (optional)
- [ ] Update backend CORS settings

### DNS Configuration
- [ ] Point root domain to Vercel
- [ ] Point API subdomain to Railway
- [ ] Configure SSL certificates
- [ ] Test all endpoints

### Post-Deployment
- [ ] Set up monitoring (UptimeRobot) - See [UPTIMEROBOT_MONITORING_SETUP.md](./UPTIMEROBOT_MONITORING_SETUP.md)
- [ ] Configure email service (Resend) - See [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)
- [ ] Test all critical flows
- [ ] Set up backups
- [ ] Document deployment process

---

## Support & Resources

### Official Documentation
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **Supabase**: https://supabase.com/docs
- **Cloudflare**: https://developers.cloudflare.com

### Getting Help
- All platforms have excellent documentation
- Active community support
- Most have Discord/Slack communities
- Email support available on paid tiers

---

## Migration from Current Setup

### What Stays the Same
- ✅ PostgreSQL database (no migration to MySQL needed)
- ✅ Docker configuration
- ✅ Application code
- ✅ Prisma schema
- ✅ API structure

### What Changes
- 🔄 Database host (local → Supabase)
- 🔄 Backend host (local → Railway)
- 🔄 Frontend host (local → Vercel)
- 🔄 Environment variables (new hosts/URLs)
- 🔄 DNS configuration

### Estimated Migration Time
- **Database setup**: 30 minutes
- **Backend deployment**: 15-20 minutes (see [RAILWAY_BACKEND_DEPLOYMENT.md](./RAILWAY_BACKEND_DEPLOYMENT.md))
- **Frontend deployment**: 15-20 minutes (see [VERCEL_FRONTEND_DEPLOYMENT.md](./VERCEL_FRONTEND_DEPLOYMENT.md))
- **DNS configuration**: 10 minutes
- **Testing & verification**: 30 minutes
- **Total**: ~1.5-2 hours

---

*Last updated: December 2024*

