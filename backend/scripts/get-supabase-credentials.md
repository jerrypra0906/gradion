# How to Get Supabase Credentials

## ⚠️ Important
The Supabase project URL (`https://gsxsdrpkxopncibcxdeo.supabase.co`) is an **API endpoint**, not a web page. You cannot access it directly in a browser.

## ✅ Correct Way to Get Credentials

### Step 1: Go to Supabase Dashboard

1. Open your browser and go to: **https://app.supabase.com**
2. Log in with your Supabase account
3. Select your project (the one with project ID: `gsxsdrpkxopncibcxdeo`)

### Step 2: Get Project URL

1. In Supabase Dashboard, go to **Settings** → **API** (or **Project Settings** → **API**)
2. Find **Project URL**:
   - It should be: `https://gsxsdrpkxopncibcxdeo.supabase.co`
   - Copy this value

**Alternative location:**
- Go to **Settings** → **General**
- Look for **Reference ID** or **Project URL**

### Step 3: Get Service Role Key

1. Still in **Settings** → **API**
2. Scroll down to **Project API keys**
3. Find the **`service_role`** key (NOT the `anon` key)
4. Click the **eye icon** or **"Reveal"** to show the key
5. Copy the entire key (it's a long JWT token starting with `eyJ...`)

⚠️ **Security Warning**: The service role key has admin privileges. Keep it secret and never commit it to git.

### Step 4: Verify Storage Bucket Exists

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Check if a bucket named `uploads` exists
3. If not, create it:
   - Click **"New bucket"** or **"Create bucket"**
   - Name: `uploads`
   - ✅ Check **"Public bucket"**
   - Click **"Create bucket"**

---

## Quick Reference

### Your Supabase Project Info:
- **Project ID**: `gsxsdrpkxopncibcxdeo`
- **Project URL**: `https://gsxsdrpkxopncibcxdeo.supabase.co`
- **Dashboard**: https://app.supabase.com/project/gsxsdrpkxopncibcxdeo

### Environment Variables for Railway:

```
SUPABASE_URL=https://gsxsdrpkxopncibcxdeo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[paste-your-service-role-key-here]
SUPABASE_STORAGE_BUCKET=uploads
```

---

## Direct Links

- **Supabase Dashboard**: https://app.supabase.com
- **Your Project Settings**: https://app.supabase.com/project/gsxsdrpkxopncibcxdeo/settings/api
- **Storage**: https://app.supabase.com/project/gsxsdrpkxopncibcxdeo/storage/buckets

---

## Troubleshooting

### "Requested path is invalid" Error

**This is normal!** The project URL is an API endpoint, not a website. You need to:
- ✅ Use the Supabase Dashboard (https://app.supabase.com)
- ❌ Don't try to access the project URL directly in a browser

### Can't Find Service Role Key

1. Make sure you're in **Settings** → **API**
2. Scroll down to **Project API keys** section
3. Look for **`service_role`** (it might be hidden - click "Reveal")
4. If you can't find it, you may need to regenerate it:
   - Click **"Reset"** or **"Regenerate"** next to the service_role key
   - Copy the new key immediately (it won't be shown again)

### Storage Bucket Not Found

1. Go to **Storage** → **Buckets**
2. If no bucket exists, create one named `uploads`
3. Make sure it's set to **Public**

---

*Last updated: December 2024*
