# Password Reset Setup - Quick Guide

## Issue: Getting "Not Found" Error

If you're getting a "404 Not Found" error when trying to use forgot password, follow these steps:

### Step 1: Run Database Migration

The password reset feature requires a new database table. You need to run the migration first.

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Open the migration file: `backend/prisma/migrations/20251221000000_add_password_reset_tokens/migration.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **"Run"**

**Option B: Using Prisma Migrate (If you have database access)**

```bash
cd backend
npx prisma migrate deploy
```

### Step 2: Verify Railway Has Deployed New Code

1. Go to **Railway Dashboard** → Your Service
2. Check **"Deployments"** tab
3. Verify the latest commit (should include "Implement password reset functionality")
4. If not deployed, Railway should auto-deploy after the git push
5. Wait for deployment to complete (usually 1-2 minutes)

### Step 3: Verify Route is Available

Test the endpoint directly:

```bash
# Using PowerShell
$body = @{email = "your-email@example.com"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.langkahkecil.org/api/auth/forgot-password" -Method POST -ContentType "application/json" -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

### Step 4: Check Railway Logs

If still getting errors:

1. Go to **Railway Dashboard** → Your Service → **Logs**
2. Look for errors related to:
   - `passwordResetToken` (suggests migration not run)
   - `404` or route not found (suggests code not deployed)
   - TypeScript/build errors

### Common Issues

**Issue 1: "Table does not exist" or Prisma errors**
- **Solution**: Run the database migration (Step 1)

**Issue 2: Route returns 404**
- **Solution**: Verify Railway has deployed the latest code (Step 2)

**Issue 3: Code deployed but route still not found**
- **Solution**: Check Railway logs for build errors
- Verify the route is in the deployed code

### Quick Checklist

- [ ] Database migration has been run (password_reset_tokens table exists)
- [ ] Railway has deployed latest commit
- [ ] Railway deployment completed successfully (no build errors)
- [ ] Can test the endpoint directly (Step 3)

### Still Having Issues?

1. Check Railway deployment logs for any build errors
2. Verify the migration SQL was executed successfully in Supabase
3. Test other auth routes (e.g., `/api/auth/login`) to ensure auth routes are working
4. Check browser console/network tab for the exact error message
