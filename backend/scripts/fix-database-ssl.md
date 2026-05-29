# Fix Database SSL Connection Error

## Problem
Error: `self-signed certificate in certificate chain` when connecting to Supabase database from Railway.

## Root Cause
Supabase uses self-signed SSL certificates. The Prisma client needs to be configured to accept these certificates by setting `rejectUnauthorized: false`.

## Solution

### Step 1: Verify DATABASE_URL Format in Railway

Go to Railway Dashboard → Your Service → Variables → Check `DATABASE_URL`

**Correct Format for Supabase (Pooled Connection):**
```
postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true&sslmode=require
```

**Important:**
- ✅ Use port **6543** (pooled connection), not 5432
- ✅ Include `?pgbouncer=true&sslmode=require`
- ✅ Replace `[PASSWORD]` with your actual Supabase password
- ✅ Replace `[PROJECT_REF]` with your Supabase project reference

### Step 2: Get Your Supabase Connection String

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **"Connection string"** section
5. Select **"Connection pooling"** tab
6. Choose **"Session mode"** (recommended) or **"Transaction mode"**
7. Copy the connection string
8. It should look like:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```

### Step 3: Update DATABASE_URL in Railway

1. Railway Dashboard → Your Service → **Variables**
2. Find `DATABASE_URL`
3. **Replace** with the Supabase pooled connection string from Step 2
4. Make sure it includes:
   - Port **6543**
   - `pgbouncer=true`
   - `sslmode=require`
5. Click **Save**

### Step 4: Verify Other Database Variables

Also check these are set correctly:
- `DB_SSL_REQUIRED=true`
- `DB_POOL_MIN=2`
- `DB_POOL_MAX=10`

### Step 5: Redeploy

After updating `DATABASE_URL`:
1. Railway will automatically redeploy
2. Wait for deployment to complete
3. Check logs - the SSL error should be gone
4. Try logging in again

## Alternative: If Using Direct Connection (Not Recommended)

If you must use direct connection (port 5432), the connection string should be:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

But **pooled connection (port 6543) is strongly recommended** for production.

## Troubleshooting

### Still Getting SSL Error?

1. **Check DATABASE_URL format:**
   - Must include `sslmode=require`
   - Must use port 6543 for pooled connection
   - Must include `pgbouncer=true` for pooled connection

2. **Verify Supabase Project:**
   - Make sure your Supabase project is active
   - Check that database is accessible
   - Verify password is correct

3. **Check Railway Logs:**
   - Look for connection errors
   - Verify DATABASE_URL is being read correctly
   - Check if SSL configuration is being applied

4. **Test Connection:**
   - Try connecting from Railway Shell:
     ```bash
     # In Railway Shell
     psql $DATABASE_URL
     ```
   - If this works, the issue is in the application code
   - If this fails, the DATABASE_URL is wrong

## Code Fix Applied

The code has been updated to:
- ✅ Always set `rejectUnauthorized: false` for Supabase connections
- ✅ Check for 'supabase' in connection string (case-insensitive)
- ✅ Also check for `sslmode=require` in connection string
- ✅ Apply SSL config for any connection requiring SSL

After deploying the code fix and updating DATABASE_URL, the SSL error should be resolved.
