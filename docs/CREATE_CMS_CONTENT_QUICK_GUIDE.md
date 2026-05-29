# Quick Guide: Create CMS Content (Contact, Privacy, Terms)

## Problem

As an admin, you can't find the CMS content for:
- Contact Us
- Privacy Policy  
- Terms of Service

This is because these entries don't exist in the database yet. Here's how to create them.

---

## Solution: Create Manually via Admin Interface (Easiest)

### Step 1: Log in as Admin

1. Go to: `https://www.langkahkecil.org/login`
2. Log in with your admin account

### Step 2: Navigate to CMS Management

1. After logging in, you'll be on the Dashboard
2. Click **"CMS"** in the left sidebar (or go to `/dashboard/cms`)
3. You should see the CMS content list page

### Step 3: Create Contact Us Entry

1. Click **"Create Content"** button (top right)
2. Fill in the form:
   - **Title**: `Contact Us`
   - **Slug**: `contact` (will auto-generate, but verify it's exactly `contact`)
   - **Content**: You can use the default content shown below, or write your own
   - **Status**: Select **"Published"** from dropdown
   - **Publish At**: Leave empty (or set to today's date)
   - **Unpublish At**: Leave empty
3. Click **"Save"**

**Default Contact Content** (you can copy this):
```html
<p class="text-gray-600 mb-8">Have questions about LangkahKecil, need help with your account, or want to share feedback? We'd love to hear from you.</p>

<div class="space-y-6">
  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">Email</h2>
    <p class="text-gray-600">Send us an email at <a href="mailto:support@langkahkecil.org" class="text-blue-600 hover:text-blue-500 font-medium">support@langkahkecil.org</a> and we'll get back to you as soon as possible.</p>
  </div>

  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">Support Hours</h2>
    <p class="text-gray-600">Monday–Friday, 09:00–17:00 WIB. We aim to respond within 1–2 business days.</p>
  </div>

  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">For Therapists &amp; Clinics</h2>
    <p class="text-gray-600">If you're a therapist or clinic interested in using LangkahKecil with your clients, please mention your clinic name and how many families you'd like to onboard.</p>
  </div>
</div>
```

### Step 4: Create Privacy Policy Entry

1. Click **"Create Content"** button again
2. Fill in:
   - **Title**: `Privacy Policy`
   - **Slug**: `privacy`
   - **Content**: Privacy policy content (see full content in `backend/scripts/seed-cms-content.ts`)
   - **Status**: **Published**
3. Click **"Save"**

### Step 5: Create Terms of Service Entry

1. Click **"Create Content"** button again
2. Fill in:
   - **Title**: `Terms of Service`
   - **Slug**: `terms`
   - **Content**: Terms of service content (see full content in `backend/scripts/seed-cms-content.ts`)
   - **Status**: **Published**
3. Click **"Save"**

---

## Alternative: Run SQL Script in Supabase

If you prefer to use SQL:

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Open the file: `backend/scripts/seed-cms-content.sql`
3. Copy the SQL (Note: The Terms entry might be incomplete in SQL, so you may need to use the TypeScript script or create it manually)
4. Paste and run in Supabase SQL Editor

---

## Verify Creation

After creating the entries:

1. Go back to **Dashboard** → **CMS**
2. You should now see all three entries:
   - ✅ Contact Us
   - ✅ Privacy Policy
   - ✅ Terms of Service

3. Test the public pages:
   - `https://www.langkahkecil.org/cms/contact` (should show contact page with form)
   - `https://www.langkahkecil.org/cms/privacy` (should show privacy policy)
   - `https://www.langkahkecil.org/cms/terms` (should show terms of service)

---

## Important Notes

- **Slug must be exact**: `contact`, `privacy`, `terms` (lowercase, no spaces)
- **Status must be "Published"**: Otherwise they won't be visible publicly
- **Contact page has form**: The contact form is built into `/cms/contact` page, so you don't need to add it to the CMS content

---

## Need Full Content?

For the complete Privacy Policy and Terms of Service content, check:
- `backend/scripts/seed-cms-content.ts` - Full HTML content in TypeScript
- Or create them manually with your own content

---

*Last updated: December 2024*
