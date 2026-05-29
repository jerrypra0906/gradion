# Create Landing Page CMS Content

This guide explains how to populate the landing page CMS content for LangkahKecil.

## Option 1: Using SQL Script (Recommended)

1. **Connect to your database** (via Railway dashboard, Supabase SQL editor, or psql)

2. **Run the SQL script**:
   ```bash
   # If using Railway CLI
   railway run psql < backend/scripts/create-landing-page-cms.sql
   
   # Or copy and paste the SQL from backend/scripts/create-landing-page-cms.sql
   # into your database SQL editor
   ```

3. **Verify the content was created**:
   - Check that 5 CMS entries exist with slugs: `hero`, `features`, `why-different`, `success-stories`, `faq`
   - All should have status `published`

## Option 2: Using the Admin Dashboard

1. **Login as admin** to your application
2. Navigate to **CMS** section in the dashboard
3. Click **"New Content"** for each section:

### Hero Section
- **Title**: Hero Section
- **Slug**: `hero`
- **Content**: 
  ```html
  <p>Platform pelacakan perkembangan autisme yang dirancang khusus untuk keluarga Indonesia. Mulai perjalanan Anda hari ini dan rayakan setiap langkah kecil.</p>
  ```
- **Status**: Published

### Features Section
- **Title**: Features Section
- **Slug**: `features`
- **Content**: 
  ```html
  <p>Platform lengkap dengan fitur-fitur yang dirancang khusus untuk mendukung perkembangan anak dengan autisme. Dari pelacakan harian hingga kolaborasi dengan terapis, semuanya dalam satu tempat.</p>
  ```
- **Status**: Published

### Why Different Section
- **Title**: Why Different Section
- **Slug**: `why-different`
- **Content**: See `create-landing-page-cms.sql` for full HTML
- **Status**: Published

### Success Stories Section
- **Title**: Success Stories Section
- **Slug**: `success-stories`
- **Content**: See `create-landing-page-cms.sql` for full HTML (testimonials)
- **Status**: Published

### FAQ Section
- **Title**: FAQ Section
- **Slug**: `faq`
- **Content**: See `create-landing-page-cms.sql` for full HTML (8 FAQs)
- **Status**: Published

## Option 3: Using API (for automation)

You can use the CMS API endpoints to create content programmatically:

```bash
# Login first to get token
TOKEN=$(curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@langkahkecil.com","password":"your-password"}' \
  | jq -r '.data.token')

# Create Hero section
curl -X POST https://your-api-url/api/cms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hero Section",
    "slug": "hero",
    "content_html": "<p>Platform pelacakan perkembangan autisme yang dirancang khusus untuk keluarga Indonesia. Mulai perjalanan Anda hari ini dan rayakan setiap langkah kecil.</p>",
    "status": "published"
  }'

# Repeat for other sections...
```

## Content Sections Overview

### 1. Hero Section (`hero`)
- Brief introduction/description that appears below the main title
- Optional: Can be left empty if you prefer just the title/description

### 2. Features Section (`features`)
- Description of platform features
- Appears above the feature cards

### 3. Why Different Section (`why-different`)
- Detailed explanation of what makes LangkahKecil unique
- Includes bullet points with key differentiators

### 4. Success Stories Section (`success-stories`)
- Testimonials from parents and therapists
- 4 testimonial cards in a grid layout

### 5. FAQ Section (`faq`)
- Frequently asked questions
- 8 questions with detailed answers
- Covers: pricing, security, mobile access, therapist invitations, AI Summary, reports, free plan limits

## Notes

- All content uses HTML format (`content_html` field)
- Content can be styled using Tailwind CSS classes (already configured in the frontend)
- The frontend will render the HTML using `dangerouslySetInnerHTML` with DOMPurify sanitization
- If CMS content doesn't exist, the landing page will show default/fallback content
- Status must be `published` for content to appear on the public landing page

## Updating Content

To update content later:
1. Use the Admin Dashboard CMS section
2. Or update via SQL
3. Or use the API PUT endpoint: `PUT /api/cms/:id`
