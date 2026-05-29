# Supabase Database Migration Guide

Complete step-by-step guide for migrating your LangkahKecil database to Supabase.

## 📋 Quick Checklist

- [ ] Create Supabase account and project
- [ ] Get database connection string from Supabase
- [ ] Update `backend/.env` with new `DATABASE_URL`
- [ ] Test connection locally
- [ ] Run Prisma migrations (`npx prisma migrate deploy`)
- [ ] Seed initial data (optional)
- [ ] Migrate existing data (if applicable)
- [ ] Update production environment variables
- [ ] Test application connection
- [ ] Deploy to production

**Estimated Time**: 30-60 minutes (depending on data migration)

---

## Prerequisites

- Supabase account (free tier available)
- Prisma CLI installed (`npm install -g prisma` or use `npx`)
- Access to your current database (if migrating existing data)
- Node.js 18+ installed

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In to Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign in with GitHub, Google, or email

### 1.2 Create New Project

1. Click **"New Project"** button
2. Fill in the project details:
   - **Name**: `langkahkecil` (or your preferred name)
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose closest to your users (e.g., `Southeast Asia (Singapore)`)
   - **Pricing Plan**: Select **Free** (500MB database, perfect for MVP)
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be provisioned

---

## Step 2: Get Database Connection String

### ⚠️ Important: Current Supabase UI

The newer Supabase UI **does not show a "Connection string" section** with URI tabs. You'll need to **manually construct** the connection string using:
1. Your project reference ID (from the URL)
2. Your database password (from "Database password" section)

### Quick Steps (Based on Current UI)

1. **Go to**: Settings → Database (you should see "Database password" section at the top)
2. **Get Project Reference ID**: Copy from your browser URL (the long string after `/project/`)
3. **Get Password**: Use the password from "Database password" section (or reset it)
4. **Build Connection String**: Use the format below

**Direct URL format:**
```
https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]/settings/database
```

### 2.1 Access Project Settings

**Method 1: Via Sidebar**
1. In your Supabase dashboard, look for the **gear icon (⚙️)** or **"Settings"** in the left sidebar
2. Click on **"Project Settings"** or **"Settings"**

**Method 2: Via Project Menu**
1. Click on your project name at the top left
2. Select **"Project Settings"** from the dropdown menu

**Method 3: Direct URL**
- Go to: `https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]/settings/database`
- Replace `[YOUR-PROJECT-REF]` with your project reference ID

### 2.2 What You'll See in Database Settings

Based on the current Supabase UI, you'll see these sections:

1. **"Database password"** section (at the top):
   - Shows information about your database password
   - Has a **"Reset database password"** button
   - Use the password you set when creating the project (or reset it here)

2. **"Connection pooling configuration"** section:
   - Shows pool size settings
   - Shows max client connections
   - **Note**: This section shows configuration but NOT the connection string itself

3. **"SSL Configuration"** section:
   - SSL settings for your database

4. **"Disk Management"** section:
   - Disk configuration (moved to Compute and Disk page)

5. **"Network Restrictions"** section:
   - IP access controls

6. **"Network Bans"** section:
   - Blocked IP addresses

**Important**: The newer Supabase UI doesn't show a dedicated "Connection string" section with URI tabs. You'll need to **manually construct** the connection string using the information available (see Step 2.5 below).

### 2.3 Get Direct Connection String (For Migrations)

**Since the connection string section is not visible in the current UI, use manual construction:**

1. **Get your project reference ID:**
   - Look at your browser URL: `https://supabase.com/dashboard/project/[PROJECT-REF]/settings/database`
   - The `[PROJECT-REF]` is a string like `abcdefghijklmnop` (usually 20 characters)
   - Copy this project reference ID

2. **Get your database password:**
   - Use the password you set when creating the project
   - If you forgot it, click **"Reset database password"** in the **"Database password"** section
   - Save the new password securely

3. **Construct the connection string:**
   ```
   postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
   ```

**Example:**
- Project ref from URL: `xyz123abc456def789gh`
- Password: `MySecurePass123`
- Connection string: `postgresql://postgres:MySecurePass123@db.xyz123abc456def789gh.supabase.co:5432/postgres`

### 2.4 Get Pooled Connection String (For Production)

**For production, use connection pooling (port 6543):**

**Option A: Using Direct Pooler URL (Recommended if direct connection fails)**

1. In Supabase Dashboard → **Settings** → **Database** → **Connection Pooling** section
2. Look for the pooler connection string (if visible)
3. Or construct manually using this format:
   ```
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```
   - Replace `PROJECT_REF` with your project reference
   - Replace `REGION` with your region (e.g., `ap-southeast-1` for Singapore)
   - The pooler URL often has better connectivity than direct connection

**Option B: Using Direct Connection with Pooler Port**

1. Use the same project reference ID and password from Step 2.3
2. Construct the pooled connection string:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require
   ```

**Example:**
- Project ref: `xyz123abc456def789gh`
- Password: `MySecurePass123`
- Pooled connection string: `postgresql://postgres:MySecurePass123@db.xyz123abc456def789gh.supabase.co:6543/postgres?pgbouncer=true&sslmode=require`

**Note**: The "Connection pooling configuration" section you see shows the pool settings but not the connection string. You need to build it manually using the format above.

**If Direct Connection Fails (DNS/Network Issues):**
- Try the pooler URL format (Option A) - it often resolves DNS issues
- The pooler hostname (`aws-0-REGION.pooler.supabase.com`) may have better DNS resolution

### 2.5 Step-by-Step: Build Connection String from What You See

**Based on what's visible in your Supabase dashboard:**

1. **Find your Project Reference ID:**
   - Look at your browser's address bar
   - URL format: `https://supabase.com/dashboard/project/[PROJECT-REF]/settings/database`
   - The `[PROJECT-REF]` is a long string (usually 20 characters)
   - Example: If URL is `https://supabase.com/dashboard/project/xyz123abc456def789gh/settings/database`
   - Then your project ref is: `xyz123abc456def789gh`

2. **Get your Database Password:**
   - In the **"Database password"** section you can see
   - Use the password you set when creating the project
   - **OR** click **"Reset database password"** to set a new one
   - Save this password securely!

3. **Build the Connection String:**
   
   **For Migrations (Direct Connection - Port 5432):**
   ```
   postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
   ```
   
   **For Production (Pooled Connection - Port 6543):**
   ```
   postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true
   ```

**Complete Example:**
- Project ref from URL: `xyz123abc456def789gh`
- Password: `MySecurePass123`
- **Migration connection string:**
  ```
  postgresql://postgres:MySecurePass123@db.xyz123abc456def789gh.supabase.co:5432/postgres
  ```
- **Production connection string:**
  ```
  postgresql://postgres:MySecurePass123@db.xyz123abc456def789gh.supabase.co:6543/postgres?pgbouncer=true
  ```

### 2.6 Alternative: Use Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Get connection string
supabase status
```

This will show you the connection details.

**Note**: For migrations, use the direct connection (port 5432). For application runtime, use the pooled connection (port 6543).

---

## Step 3: Update Environment Variables

### 3.1 Update Backend `.env` File

1. Open `backend/.env` (or create from `backend/.env.example`)
2. Update the `DATABASE_URL`:

```env
# Direct connection (for migrations)
DATABASE_URL="postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres"

# For production runtime, use pooled connection:
# DATABASE_URL="postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:6543/postgres?pgbouncer=true"
```

### 3.2 Update SSL Configuration (Important!)

Supabase requires SSL connections. Add these to your `backend/.env`:

```env
# Database SSL Configuration
DB_SSL_REQUIRED=true
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Note**: Your Prisma schema already uses `DATABASE_URL`, so no schema changes needed!

### 3.3 URL Encoding Password (If Needed)

If your password contains special characters, you may need to URL-encode them:

- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`

**Example:**
If password is `P@ssw0rd#123`, the connection string becomes:
```
postgresql://postgres:P%40ssw0rd%23123@db.project.supabase.co:5432/postgres
```

Or better: Use Supabase dashboard to set a password without special characters.

---

## Step 4: Test Connection Locally

### 4.1 Install Dependencies

```bash
cd backend
npm install
```

### 4.2 Generate Prisma Client

```bash
npx prisma generate
```

### 4.3 Test Connection

**Important**: Before testing, ensure your connection string includes SSL parameters for Supabase:

```bash
# Check your DATABASE_URL in .env file
# It should include ?sslmode=require at the end:
# DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

**Test the connection:**

```bash
# This will verify the connection and show your database tables
npx prisma db pull
```

If successful, you should see output showing your schema structure.

**If you get "Can't reach database server" error:**

1. **Check Supabase Network Restrictions (MOST COMMON ISSUE):**
   - Go to Supabase Dashboard → **Settings** → **Database** → **Network Restrictions**
   - If you see "Your database can be accessed by all IP addresses" - this is fine
   - If you see any restrictions listed, your IP might be blocked
   - **Solution**: Click **"Add restriction"** and add your current IP address
   - **OR** Temporarily remove restrictions for testing (not recommended for production)

2. **Verify Project Status:**
   - Check if your Supabase project is active (not paused)
   - Go to project dashboard and verify it's running
   - Check for any service alerts or maintenance notices

3. **Test DNS Resolution:**
   ```bash
   # Windows
   nslookup db.PROJECT_REF.supabase.co
   
   # Should return an IP address (IPv4 or IPv6)
   # If only IPv6 is returned and connection fails, you may have IPv6 connectivity issues
   ```

4. **Verify Connection String Format:**
   - Ensure it includes SSL: `?sslmode=require`
   - Format: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require`
   - Double-check the project reference ID matches your Supabase project
   - Ensure password doesn't have special characters that need URL encoding
   - Make sure port is 5432 (for migrations) or 6543 (for pooled connections)

5. **DNS Resolution Issue (ENOTFOUND):**
   - If you get `getaddrinfo ENOTFOUND` but can connect from Supabase SQL Editor:
     - This is a **local DNS resolution issue**, not a Supabase problem
     - **Solution 1**: Flush DNS cache:
       ```bash
       # Windows
       ipconfig /flushdns
       ```
     - **Solution 2**: Try using connection pooler URL (different hostname):
       - Format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
       - Get the exact URL from Supabase Dashboard → Settings → Database → Connection Pooling
     - **Solution 3**: Check if you're behind a corporate proxy/VPN
       - Try disconnecting VPN/proxy temporarily
       - Check proxy settings in your environment
     - **Solution 4**: Try different DNS server:
       - Change to Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
       - Or use mobile hotspot to test if it's network-specific

6. **IPv6 Connectivity Issue:**
   - If DNS returns only IPv6 and connection fails, you might have IPv6 connectivity issues
   - Try using the IPv4 address directly (if available)
   - Or configure your network to support IPv6

6. **Firewall/Antivirus:**
   - Some firewalls block outbound PostgreSQL connections
   - Temporarily disable to test
   - Add exception for port 5432 if needed

---

## Step 5: Run Database Migrations

### 5.1 Check Migration Status

```bash
# View migration status
npx prisma migrate status
```

### 5.2 Apply All Migrations

**Option A: Using `migrate deploy` (Recommended for Production)**

This applies all pending migrations without creating new migration files:

```bash
npx prisma migrate deploy
```

**Option B: Using `migrate dev` (For Development)**

This applies migrations and creates a new migration if schema changed:

```bash
npx prisma migrate dev
```

### 5.3 Verify Migrations

After running migrations, verify all tables were created:

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can:
- View all tables
- Browse data
- Verify schema structure

---

## Step 6: Seed Initial Data (Optional)

### 6.1 Run Seed Script

```bash
# Seed database with test users and initial data
npm run prisma:seed
```

Or directly:

```bash
npx prisma db seed
```

### 6.2 Verify Seeded Data

1. Open Prisma Studio: `npx prisma studio`
2. Check the `users` table for test accounts
3. Verify other tables have initial data

---

## Step 7: Migrate Existing Data (If Applicable)

If you have an existing database with data, follow these steps:

### 7.1 Export Data from Old Database

```bash
# Using pg_dump (if you have PostgreSQL client installed)
pg_dump -h old_host -U old_user -d old_database > backup.sql

# Or use Prisma Studio to export data manually
```

### 7.2 Import Data to Supabase

**Option A: Using Supabase SQL Editor**

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Paste your SQL dump (if using pg_dump)
4. Click **"Run"**

**Option B: Using psql**

```bash
# Connect to Supabase and import
psql "postgresql://postgres:password@db.project.supabase.co:5432/postgres" < backup.sql
```

**Option C: Using Prisma Studio**

1. Open Prisma Studio for old database: `npx prisma studio`
2. Export data as JSON/CSV
3. Open Prisma Studio for Supabase
4. Import data manually

---

## Step 8: Update Application Configuration

### 8.1 Update Backend Environment Variables

In `backend/.env`, ensure you have:

```env
# Database
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true"
DB_SSL_REQUIRED=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# Other required variables...
NODE_ENV=production
FRONTEND_URL=https://langkahkecil.org
API_URL=https://api.langkahkecil.org
PUBLIC_API_URL=https://api.langkahkecil.org
```

### 8.2 Update Prisma Client Connection

Your `backend/src/lib/prisma.ts` should already handle SSL. Verify it includes:

```typescript
// Example Prisma client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

---

## Step 9: Test Application Connection

### 9.1 Start Backend Locally

```bash
cd backend
npm run dev
```

### 9.2 Test Health Endpoint

```bash
curl http://localhost:5001/health
```

Should return a successful response.

### 9.3 Test Database Queries

```bash
# Test API endpoint that queries database
curl http://localhost:5001/api/health
```

---

## Step 10: Configure Supabase Security (Important!)

### 10.1 Enable Row Level Security (Optional)

If you want to use Supabase's built-in RLS features:

1. Go to **Authentication** → **Policies**
2. Create policies for your tables
3. Enable RLS on tables

**Note**: Since you're using Prisma directly, RLS is optional. Your application handles authentication.

### 10.2 Configure Connection Pooling

1. Go to **Project Settings** → **Database**
2. Review **Connection Pooling** settings
3. Use the pooled connection string (port 6543) for production

### 10.3 Set Up Backups

1. Go to **Project Settings** → **Database**
2. Review **Backups** section
3. Free tier includes daily backups
4. Pro tier includes point-in-time recovery

---

## Step 11: Production Deployment

### 11.1 Update Production Environment Variables

In your deployment platform (Railway, Render, etc.):

1. Add `DATABASE_URL` with Supabase connection string
2. Add `DB_SSL_REQUIRED=true`
3. Add other required environment variables

### 11.2 Run Migrations in Production

```bash
# In your production environment
npx prisma migrate deploy
```

### 11.3 Verify Production Connection

1. Check application logs
2. Test API endpoints
3. Verify database queries work

---

## Troubleshooting

### Issue: SSL Connection Error

**Error**: `SSL connection is required`

**Solution**: 
1. Ensure `DB_SSL_REQUIRED=true` in `.env`
2. Add `?sslmode=require` to connection string:
   ```
   DATABASE_URL="postgresql://...?sslmode=require"
   ```

### Issue: Connection Timeout / Can't Reach Database Server

**Error**: `Can't reach database server at db.xxx.supabase.co:5432` or `Connection timeout`

**Solutions**:

1. **Check Network Restrictions in Supabase:**
   - Go to Supabase Dashboard → **Settings** → **Database** → **Network Restrictions**
   - If you see "Your database can be accessed by all IP addresses" - this is fine
   - If you see restrictions, click **"Add restriction"** and add your current IP address
   - Or temporarily click **"Restrict all access"** to disable restrictions

2. **Verify Connection String Format:**
   - Ensure your `DATABASE_URL` includes SSL: `?sslmode=require`
   - Format: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require`
   - Check for typos in password or project reference

3. **Test Connection with psql (if available):**
   ```bash
   psql "postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
   ```

4. **Check Supabase Project Status:**
   - Go to Supabase Dashboard
   - Verify your project is active and not paused
   - Check if there are any service alerts

5. **Try Direct Connection (Port 5432):**
   - For migrations, use port 5432 (direct connection)
   - For application runtime, use port 6543 (pooled connection)
   - Make sure you're using the correct port for the operation

6. **Verify Environment Variable:**
   ```bash
   # In backend directory
   node -e "console.log(process.env.DATABASE_URL)"
   ```
   - Should show your connection string (password will be visible, be careful!)
   - If empty, check your `.env` file

7. **Check Firewall/Antivirus:**
   - Some firewalls block outbound database connections
   - Temporarily disable to test
   - Add exception for PostgreSQL connections if needed

### Issue: Migration Fails

**Error**: `Migration failed` or `Table already exists`

**Solution**:
1. Check migration status: `npx prisma migrate status`
2. Reset if needed (⚠️ deletes all data):
   ```bash
   npx prisma migrate reset
   ```
3. Re-run migrations: `npx prisma migrate deploy`

### Issue: Authentication Failed

**Error**: `password authentication failed`

**Solution**:
1. Verify password in connection string matches Supabase project password
2. Check for special characters that need URL encoding
3. Reset password in Supabase dashboard:
   - Go to **Settings** → **Database** → **Database password**
   - Click **"Reset database password"**
   - Update your connection string with the new password

### Issue: Can't Find Connection String in Supabase Dashboard

**Problem**: Connection string section not visible (this is normal in newer Supabase UI)

**Solution - Use Manual Construction:**

The newer Supabase UI doesn't show a dedicated "Connection string" section. Here's what to do:

1. **You're in the right place** - You're at: `Settings → Database`

2. **What you CAN see:**
   - ✅ **"Database password"** section - Use this password
   - ✅ **"Connection pooling configuration"** - Shows settings but not connection string
   - ✅ Your project reference ID in the URL

3. **Build it manually:**
   - **Step 1**: Copy project ref from URL (the long string after `/project/`)
   - **Step 2**: Use password from "Database password" section (or reset it)
   - **Step 3**: Build connection string:
     ```
     # For migrations:
     postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
     
     # For production:
     postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true
     ```

4. **Quick Reference:**
   - Project ref: Found in browser URL
   - Password: From "Database password" section (or reset it)
   - Host format: `db.[PROJECT-REF].supabase.co`
   - Port 5432: Direct connection (for migrations)
   - Port 6543: Pooled connection (for production)

### Issue: Too Many Connections

**Error**: `too many connections`

**Solution**:
1. Use connection pooling (port 6543) instead of direct connection
2. Reduce `DB_POOL_MAX` in environment variables
3. Check for connection leaks in your code

---

## Connection String Examples

### Direct Connection (for migrations)
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### Pooled Connection (for application runtime) - **Recommended**
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:6543/postgres?pgbouncer=true
```

### With SSL Explicit (if needed)
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
```

### Complete Connection String with All Parameters
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=10
```

**Important Notes:**
- Replace `your_password` with your actual Supabase database password
- Replace `abcdefghijklmnop` with your actual project reference ID
- Use port `5432` for migrations and direct connections
- Use port `6543` for application runtime (connection pooling)
- URL-encode special characters in password if needed (e.g., `@` becomes `%40`)

---

## Quick Reference Commands

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Check migration status
npx prisma migrate status

# 3. Apply migrations
npx prisma migrate deploy

# 4. Open database GUI
npx prisma studio

# 5. Seed database
npm run prisma:seed

# 6. View database schema
npx prisma db pull

# 7. Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

---

## Next Steps

After successful migration:

1. ✅ Update production environment variables
2. ✅ Deploy backend with new database URL
3. ✅ Test all API endpoints
4. ✅ Monitor database usage in Supabase dashboard
5. ✅ Set up database backups schedule
6. ✅ Configure connection pooling for production

---

## Supabase Dashboard Features

Once migrated, you can use:

- **Table Editor**: Visual database editor
- **SQL Editor**: Run custom SQL queries
- **Database Backups**: Automatic daily backups
- **Connection Pooling**: Better performance
- **Database Logs**: Monitor queries
- **API**: Auto-generated REST API (optional)

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase Discord**: https://discord.supabase.com
- **Supabase GitHub**: https://github.com/supabase/supabase

---

*Last updated: January 2025*
