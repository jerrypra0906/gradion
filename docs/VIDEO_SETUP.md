# Video Setup Guide for Landing Page

## Overview

This guide will help you add a platform overview video to the "Why LangkahKecil is Different" section on your landing page.

---

## Step 1: Choose Your Video Platform

You have three options for hosting your video:

### Option 1: YouTube (Recommended)
- **Pros**: Free, reliable, good performance, SEO-friendly
- **Cons**: Shows YouTube branding
- **Best for**: Public marketing videos

### Option 2: Vimeo
- **Pros**: Professional, customizable, no ads
- **Cons**: Paid plans for advanced features
- **Best for**: Professional presentations

### Option 3: Self-Hosted
- **Pros**: Full control, no branding
- **Cons**: Uses your bandwidth, requires hosting
- **Best for**: When you want complete control

---

## Step 2: Upload Your Video

### For YouTube:
1. Go to [YouTube Studio](https://studio.youtube.com)
2. Click **"Create"** → **"Upload video"**
3. Upload your video file
4. Set visibility to **"Public"** or **"Unlisted"** (Unlisted recommended for landing pages)
5. After upload, copy the **Video ID** from the URL
   - Example: If URL is `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`

### For Vimeo:
1. Go to [Vimeo](https://vimeo.com)
2. Click **"Upload"** → **"Upload video"**
3. Upload your video file
4. Set privacy settings (Public or Unlisted)
5. Copy the **Video ID** from the URL
   - Example: If URL is `https://vimeo.com/123456789`, the ID is `123456789`

### For Self-Hosted:
1. Upload your video file to a hosting service (e.g., Vercel, Cloudflare, AWS S3)
2. Ensure the video is accessible via HTTPS
3. Copy the full URL to the video file
   - Example: `https://cdn.langkahkecil.org/videos/platform-overview.mp4`
4. (Optional) Create a thumbnail image and upload it
   - Recommended size: 1280x720px
   - Copy the thumbnail URL

---

## Step 3: Configure Environment Variables

Add the video configuration to your Vercel environment variables:

### For YouTube:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `NEXT_PUBLIC_VIDEO_YOUTUBE_ID`
   - **Value**: Your YouTube video ID (e.g., `dQw4w9WgXcQ`)
   - **Environment**: Production, Preview, Development (as needed)

### For Vimeo:
1. Add:
   - **Name**: `NEXT_PUBLIC_VIDEO_VIMEO_ID`
   - **Value**: Your Vimeo video ID (e.g., `123456789`)
   - **Environment**: Production, Preview, Development

### For Self-Hosted:
1. Add:
   - **Name**: `NEXT_PUBLIC_VIDEO_URL`
   - **Value**: Full URL to your video (e.g., `https://cdn.langkahkecil.org/videos/platform-overview.mp4`)
   - **Environment**: Production, Preview, Development
2. (Optional) Add thumbnail:
   - **Name**: `NEXT_PUBLIC_VIDEO_THUMBNAIL_URL`
   - **Value**: Full URL to thumbnail image

---

## Step 4: Update the Landing Page Code

The video component is already integrated. You just need to update the configuration in `frontend/src/app/page.tsx`:

### Current Configuration (YouTube):
```tsx
<VideoPlayer
  videoId={process.env.NEXT_PUBLIC_VIDEO_YOUTUBE_ID}
  platform="youtube"
  title="Platform Overview"
/>
```

### To Switch to Vimeo:
```tsx
<VideoPlayer
  videoId={process.env.NEXT_PUBLIC_VIDEO_VIMEO_ID}
  platform="vimeo"
  title="Platform Overview"
/>
```

### To Switch to Self-Hosted:
```tsx
<VideoPlayer
  videoUrl={process.env.NEXT_PUBLIC_VIDEO_URL}
  platform="self-hosted"
  thumbnailUrl={process.env.NEXT_PUBLIC_VIDEO_THUMBNAIL_URL}
  title="Platform Overview"
/>
```

---

## Step 5: Video Content Recommendations

### Video Length:
- **Recommended**: 2-3 minutes
- **Maximum**: 5 minutes (for landing page)
- **Minimum**: 1 minute

### Content Ideas:
1. **Platform Overview** (What we're building)
   - Show the dashboard interface
   - Demonstrate key features
   - Show how parents and therapists collaborate

2. **Key Features** (What makes us different)
   - Progress tracking
   - Activity logging
   - Therapist collaboration
   - AI-powered insights
   - Goal management

3. **User Stories** (Why it matters)
   - Parent testimonials
   - Therapist testimonials
   - Real progress examples

### Video Production Tips:
- **Start strong**: Hook viewers in the first 10 seconds
- **Show, don't tell**: Use screen recordings or animations
- **Keep it simple**: Focus on 3-5 key features
- **Add captions**: Make it accessible
- **Include CTA**: End with a call-to-action (e.g., "Start your free trial")

---

## Step 6: Test Your Video

After deploying:

1. Visit your landing page: `https://langkahkecil.org`
2. Scroll to the "Why LangkahKecil is Different" section
3. Verify the video:
   - ✅ Video loads correctly
   - ✅ Video plays when clicked
   - ✅ Video is responsive (works on mobile)
   - ✅ Video doesn't slow down page load

---

## Troubleshooting

### Video Not Showing:
- Check environment variables are set correctly in Vercel
- Verify video ID/URL is correct
- Check browser console for errors
- Ensure video is public/unlisted (not private)

### Video Not Playing:
- **YouTube**: Check if video is set to "Public" or "Unlisted"
- **Vimeo**: Check privacy settings
- **Self-hosted**: Verify video URL is accessible and uses HTTPS

### Performance Issues:
- Use video compression (recommended: H.264 codec, MP4 format)
- Consider using a CDN for self-hosted videos
- Use YouTube/Vimeo for best performance (they handle optimization)

### Mobile Issues:
- Ensure video is responsive (already handled by component)
- Test on actual devices, not just browser dev tools
- Consider lower quality for mobile if self-hosting

---

## Video Specifications

### Recommended Settings:
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1920x1080 (1080p) or 1280x720 (720p)
- **Frame Rate**: 30 fps
- **Bitrate**: 5-10 Mbps for 1080p, 2-5 Mbps for 720p
- **Aspect Ratio**: 16:9 (standard widescreen)
- **Audio**: AAC, 128-192 kbps

### File Size Guidelines:
- **2-minute video**: ~50-100 MB (1080p), ~20-40 MB (720p)
- **3-minute video**: ~75-150 MB (1080p), ~30-60 MB (720p)
- **5-minute video**: ~125-250 MB (1080p), ~50-100 MB (720p)

---

## Quick Start Checklist

- [ ] Choose video platform (YouTube/Vimeo/Self-hosted)
- [ ] Create/record your platform overview video
- [ ] Upload video to chosen platform
- [ ] Get video ID or URL
- [ ] Add environment variable to Vercel
- [ ] Update code if switching platforms
- [ ] Deploy and test
- [ ] Verify video works on desktop and mobile
- [ ] Check page load performance

---

## Example Video Script Template

**Opening (0-15s)**:
"Welcome to LangkahKecil - the platform designed specifically for autism families in Indonesia."

**Problem (15-30s)**:
"Tracking your child's progress shouldn't be complicated. That's why we built LangkahKecil."

**Solution (30-90s)**:
"With LangkahKecil, you can:
- Log daily activities and track progress
- Collaborate seamlessly with your therapist
- Set and achieve meaningful goals
- Get AI-powered insights into your child's development"

**Differentiator (90-120s)**:
"What makes us different? We understand that every small step matters - every 'langkah kecil' is worth celebrating."

**CTA (120-150s)**:
"Start tracking your child's progress today. Sign up for free at langkahkecil.org"

---

*Last updated: December 2024*
