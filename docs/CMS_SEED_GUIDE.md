# CMS Content Seed Guide

## Overview

This guide will help you create the default CMS content entries (Contact Us, Privacy Policy, and Terms of Service) that are needed for the application.

---

## Quick Setup

### Option 1: Run SQL Script in Supabase (Easiest - Recommended)

The quickest way is to run the SQL script directly in Supabase:

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `backend/scripts/seed-cms-content.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

The script will create or update all three CMS entries.

### Option 2: Run Seed Script on Railway

**Using Railway CLI:**
```bash
railway run npm run seed:cms
```

**Or using Railway's web interface:**
1. Go to Railway Dashboard → Your Backend Service
2. Click on **"Deployments"** tab
3. Click **"New Deploy"** → **"One-off Command"**
4. Enter: `npm run seed:cms`
5. Click **"Deploy"**

**Note**: Make sure your Railway service has `DATABASE_URL` environment variable set.

### Option 3: Create Manually via Admin Interface

1. Log in as admin at `https://www.langkahkecil.org/dashboard`
2. Go to **CMS** → **Create Content**
3. Create each entry manually:
   - **Contact Us** (slug: `contact`)
   - **Privacy Policy** (slug: `privacy`)
   - **Terms of Service** (slug: `terms`)

---

## What Gets Created

The seed script creates three CMS content entries:

### 1. Contact Us
- **Title**: Contact Us
- **Slug**: `contact`
- **Status**: Published
- **URL**: `https://www.langkahkecil.org/cms/contact`

### 2. Privacy Policy
- **Title**: Privacy Policy
- **Slug**: `privacy`
- **Status**: Published
- **URL**: `https://www.langkahkecil.org/cms/privacy`

### 3. Terms of Service
- **Title**: Terms of Service
- **Slug**: `terms`
- **Status**: Published
- **URL**: `https://www.langkahkecil.org/cms/terms`

---

## Verification

After running the seed script, verify the entries were created:

### Option 1: Check Admin CMS Page

1. Log in as admin: `https://www.langkahkecil.org/dashboard`
2. Navigate to **CMS** (in the sidebar or `/dashboard/cms`)
3. You should see all three entries listed:
   - Contact Us
   - Privacy Policy
   - Terms of Service

### Option 2: Check via API

```bash
curl https://api.langkahkecil.org/api/cms/admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

You should see all three entries in the response.

### Option 3: Check Public Pages

Visit these URLs to verify they're accessible:
- `https://www.langkahkecil.org/cms/contact`
- `https://www.langkahkecil.org/cms/privacy`
- `https://www.langkahkecil.org/cms/terms`

---

## Troubleshooting

### Issue 1: Script Fails with "Cannot find module"

**Solution:**
1. Make sure you're in the `backend` directory
2. Run `npm install` to ensure all dependencies are installed
3. Run `npx prisma generate` to generate Prisma Client

### Issue 2: "Database connection error"

**Solution:**
1. Check that `DATABASE_URL` environment variable is set correctly
2. Verify database is accessible from your location
3. Check Railway/Supabase connection settings

### Issue 3: "Slug already exists" Error

**Solution:**
- This is normal if the entries already exist
- The script will update existing entries instead of creating new ones
- This is safe to run multiple times

### Issue 4: Entries Created but Not Visible in Admin

**Possible Causes:**
1. **Status is "draft"** - Check that status is set to "published"
2. **Publish date in future** - Check `publish_at` field
3. **Unpublish date in past** - Check `unpublish_at` field

**Solution:**
1. Go to Admin CMS page
2. Click **Edit** on each entry
3. Verify:
   - Status: **Published**
   - Publish At: Leave empty or set to past date
   - Unpublish At: Leave empty or set to future date

---

## Updating Content

After the initial seed, you can update the content:

### Via Admin Interface (Recommended)

1. Go to **Dashboard** → **CMS**
2. Click **Edit** on the content you want to update
3. Make your changes
4. Click **Save**

### Via Seed Script (Updates All)

Run the seed script again - it will update existing entries:
```bash
npm run seed:cms
```

---

## Manual Creation Guide

If you prefer to create the entries manually:

### Step 1: Create Contact Us

1. Go to **Dashboard** → **CMS** → **Create Content**
2. Fill in:
   - **Title**: `Contact Us`
   - **Slug**: `contact` (auto-generated from title, but verify)
   - **Content**: Use the HTML from the seed script or write your own
   - **Status**: `Published`
3. Click **Save**

### Step 2: Create Privacy Policy

1. Go to **Dashboard** → **CMS** → **Create Content**
2. Fill in:
   - **Title**: `Privacy Policy`
   - **Slug**: `privacy`
   - **Content**: Privacy policy HTML content
   - **Status**: `Published`
3. Click **Save**

### Step 3: Create Terms of Service

1. Go to **Dashboard** → **CMS** → **Create Content**
2. Fill in:
   - **Title**: `Terms of Service`
   - **Slug**: `terms`
   - **Content**: Terms of service HTML content
   - **Status**: `Published`
3. Click **Save**

---

## Next Steps

After creating the CMS entries:

1. ✅ **Verify entries are visible** in Admin CMS page
2. ✅ **Test public pages** - Visit `/cms/contact`, `/cms/privacy`, `/cms/terms`
3. ✅ **Customize content** - Edit the content to match your needs
4. ✅ **Update contact email** - Make sure support email in contact page matches your `SUPPORT_EMAIL` configuration

---

## Script Location

- **TypeScript Script**: `backend/scripts/seed-cms-content.ts`
- **SQL Script**: `backend/scripts/seed-cms-content.sql`

---

*Last updated: December 2024*
