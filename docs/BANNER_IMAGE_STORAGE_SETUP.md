# Banner Image Storage Setup

## Problem
Railway containers are ephemeral - files uploaded to `/app/uploads` are lost when the container restarts or redeploys. This causes banner images to disappear.

## Solution
Use Supabase Storage for persistent file storage.

---

## Quick Setup Steps

### Step 1: Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard** → Your Project → **Storage**
2. Click **"New bucket"** or **"Create bucket"**
3. Configure:
   - **Name**: `uploads` (or your preferred name)
   - **Public bucket**: ✅ **Check this** (required for public image access)
   - **File size limit**: 10MB (or as needed)
   - **Allowed MIME types**: `image/*` (or leave empty for all)
4. Click **"Create bucket"**

### Step 2: Get Supabase Credentials

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find:
   - **Project URL**: `https://[project-id].supabase.co`
   - **Service Role Key**: (under "Project API keys" → "service_role" key)

⚠️ **Important**: Use the **Service Role Key**, not the anon key. The service role key has admin privileges needed for file uploads.

### Step 3: Configure Railway Environment Variables

1. Go to **Railway Dashboard** → Your Backend Service → **Variables**
2. Add these environment variables:

```
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_STORAGE_BUCKET=uploads
```

Replace:
- `[your-project-id]` with your Supabase project ID
- `[your-service-role-key]` with your service role key from Step 2

### Step 4: Redeploy

Railway will automatically redeploy when you add environment variables. Wait for deployment to complete.

---

## How It Works

- **With Supabase Storage configured**: Images are uploaded to Supabase Storage and get a permanent public URL
- **Without Supabase Storage**: Falls back to local filesystem (images will be lost on restart)

The backend automatically detects if Supabase is configured and uses it. If not configured, it falls back to local storage (for development).

---

## Verify Setup

1. After redeploying, check Railway logs for:
   - ✅ `Using Supabase Storage for file uploads` (if configured correctly)
   - ⚠️ `Using local filesystem for uploads` (if not configured)

2. Create a new banner with an image
3. The image URL should be: `https://[project-id].supabase.co/storage/v1/object/public/uploads/banners/filename.jpg`

---

## Troubleshooting

### Images Still Disappearing

**Check:**
1. ✅ Environment variables are set correctly in Railway
2. ✅ Bucket is set to **Public** in Supabase
3. ✅ Service Role Key is used (not anon key)
4. ✅ Bucket name matches `SUPABASE_STORAGE_BUCKET` value

### 403 Forbidden Errors

**Solution:**
- Ensure bucket is set to **Public** in Supabase Dashboard
- Check bucket policies allow public access

### Images Not Loading

**Check:**
1. Verify the image URL format is correct
2. Check Supabase Storage → Your bucket → Files to see if file exists
3. Verify bucket is public

---

## Example Configuration

```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=uploads
```

---

*Last updated: December 2024*
