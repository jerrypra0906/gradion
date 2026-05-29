# Database Connection Issue - Troubleshooting Guide

## Issue
Error: `P1001: Can't reach database server at db.gsxsdrpkxopncibcxdeo.supabase.co:5432`

## Common Causes & Solutions

### 1. **Supabase Database is Paused (Most Common)**
   - **Free tier Supabase databases pause after 1 week of inactivity**
   - **Solution**: 
     1. Go to your Supabase dashboard: https://supabase.com/dashboard
     2. Select your project
     3. The database should show a "Resume" button if paused
     4. Click "Resume" and wait a few minutes for it to wake up
     5. Try the migration again

### 2. **Network/Firewall Issues**
   - Check if your network allows connections to Supabase
   - Try from a different network (e.g., mobile hotspot)
   - Check if VPN is blocking the connection

### 3. **DATABASE_URL Configuration**
   - Your DATABASE_URL looks correct (has `sslmode=require`)
   - Make sure the password and connection string are correct

## Once Database is Accessible

### Option A: Use Prisma Migrate (Recommended)
```bash
cd backend
npx prisma migrate deploy
```

### Option B: Apply Migration Manually via Supabase SQL Editor
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/prisma/migrations/20251223000000_add_therapist_invitations/migration.sql`
3. Paste and run it in the SQL Editor

### Option C: Generate Migration and Apply Later
The migration file has been created at:
`backend/prisma/migrations/20251223000000_add_therapist_invitations/migration.sql`

You can apply it later when the database connection is restored.

## After Migration is Applied

1. Generate Prisma Client:
   ```bash
   cd backend
   npx prisma generate
   ```

2. Verify the migration was applied:
   ```bash
   npx prisma migrate status
   ```

## Next Steps

The migration adds:
- `therapist_invitations` table
- `InvitationStatus` enum (pending, accepted, expired)
- Auto-linking functionality when therapists register

Once the migration is applied, the therapist invitation feature will work automatically.
