# AdSense Ads Not Showing - Troubleshooting Guide

## ✅ What I Fixed

1. **AdUnit Component Issue**: Fixed incorrect `data-ad-client` attribute
   - Before: Was using `adSlot.split('/')[0]` directly
   - After: Now correctly uses Publisher ID with "ca-pub-" prefix from `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`
   - Fixed ad initialization to wait for AdSense script to load

## 🔍 Checklist: Why Ads Might Not Be Showing

### 1. Verify Environment Variables in Vercel

Check that these environment variables are set in your Vercel project:

```bash
# Required - Should already be set (we know this from ads.txt)
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-6752375247246503

# Optional - Ad Slot IDs (check if these are set)
NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE=6752375247246503/1234567890
NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES=6752375247246503/1234567890
NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT=6752375247246503/1234567890
```

**How to check in Vercel:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Verify all AdSense variables are present
4. If missing, add them and **redeploy**

### 2. Create Ad Units in AdSense Dashboard

If you haven't created ad units yet:

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense)
2. Navigate to **Ads → By ad unit**
3. Click **Create ad unit**
4. Choose format: **Display ads** (responsive recommended)
5. Name your ad unit (e.g., "Homepage Top", "Resources Page")
6. Copy the **Ad unit ID** (format: `ca-pub-6752375247246503/1234567890`)
7. Add to Vercel environment variables:
   - `NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE`
   - `NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES`
   - `NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT`
8. Redeploy your site

### 3. AdSense Account Status

**Check your AdSense account status:**

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense)
2. Check the status:
   - ✅ **Active**: Account approved, ads should work
   - ⏳ **Getting ready**: Still under review (can take 1-7 days)
   - ❌ **Limited**: Account has issues (check notifications)

**If "Getting ready":**
- Ads might not show yet, or show placeholder/test ads
- Wait for approval (usually 1-7 days)
- Ensure `ads.txt` is accessible (✅ we confirmed this is working)

### 4. Browser Console Check

**Open browser console (F12) and check for errors:**

```javascript
// Look for these errors:
- "adsbygoogle.push() error: All ins elements in the DOM with class=adsbygoogle already have ads in them"
- "AdSense script not loaded"
- "Invalid ad slot"
```

**Common console messages:**
- ✅ Good: `AdSense script loaded successfully.`
- ❌ Bad: `AdSense Publisher ID not found`
- ❌ Bad: `AdSense script not loaded after 10 seconds`

### 5. Test Ad Visibility

**Test on your live site:**

1. Visit `https://www.langkahkecil.org/`
2. **Disable ad blockers** (if you have one)
3. Check pages where ads should appear:
   - Homepage (after hero section)
   - `/resources` page (top and bottom)
   - `/cms/[slug]` pages (top and bottom of article)
4. Look for:
   - Empty spaces where ads should be
   - Placeholder text "Advertisement"
   - Actual ads (if account is approved)

### 6. Verify Ad Placements in Code

Ads are configured to show on these pages:

- ✅ **Homepage** (`/`): After hero section, after features section
- ✅ **Resources** (`/resources`): Top, between articles (every 6th), bottom
- ✅ **CMS Content** (`/cms/[slug]`): Top of article, bottom of article

**Note**: Ads only show for **non-authenticated users** (better UX).

### 7. Content Security Policy (CSP)

**Check if CSP is blocking AdSense:**

The backend CSP should allow AdSense domains. Verify in `backend/src/index.ts`:

```typescript
scriptSrc: [
  "'self'",
  "'unsafe-inline'",
  'https://pagead2.googlesyndication.com',
  'https://tpc.googlesyndication.com'
],
frameSrc: [
  "'self'",
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com'
],
```

### 8. Network Tab Check

**Check browser Network tab:**

1. Open DevTools (F12) → **Network** tab
2. Refresh the page
3. Look for requests to:
   - `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`
   - `https://googleads.g.doubleclick.net/...`
4. If blocked (status 403/404):
   - CSP might be blocking
   - Ad blocker might be active
   - Check backend logs

## 🚨 Most Common Issues

### Issue 1: Ad Slot Environment Variables Not Set
**Symptom**: Ads don't render, no console errors
**Fix**: Add `NEXT_PUBLIC_ADSENSE_SLOT_*` variables to Vercel and redeploy

### Issue 2: AdSense Account Not Approved
**Symptom**: Empty spaces where ads should be
**Fix**: Wait for approval (1-7 days), ensure `ads.txt` is accessible

### Issue 3: Ad Blocker Active
**Symptom**: Console shows AdSense errors
**Fix**: Disable ad blocker for testing

### Issue 4: Incorrect Ad Slot Format
**Symptom**: Console error "Invalid ad slot"
**Fix**: Use format `PUBLISHER_ID/SLOT_NUMBER` (e.g., `6752375247246503/1234567890`)

## 📝 Quick Debug Steps

1. **Check environment variables**: Vercel → Settings → Environment Variables
2. **Check browser console**: Look for AdSense errors
3. **Check Network tab**: Verify AdSense scripts are loading
4. **Disable ad blocker**: Test without any ad blockers
5. **Check AdSense dashboard**: Verify account status and ad units exist
6. **Redeploy**: After changing environment variables, redeploy site

## 🎯 Next Steps

1. Verify all environment variables are set in Vercel
2. Create ad units in AdSense dashboard (if not done)
3. Redeploy site after adding environment variables
4. Test on live site with ad blocker disabled
5. Wait for AdSense approval if account is "Getting ready"

## 📞 Need More Help?

- Check [ADSENSE_SETUP.md](./ADSENSE_SETUP.md) for full setup guide
- Google AdSense Help: https://support.google.com/adsense
- Check AdSense dashboard for specific error messages
