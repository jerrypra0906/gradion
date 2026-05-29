# Google AdSense Integration Guide

This guide explains how to set up and use Google AdSense on LangkahKecil to generate passive income.

## 🚀 Quick Setup

### Step 1: Sign Up for Google AdSense

1. Go to [Google AdSense](https://www.google.com/adsense/start)
2. Sign up with your Google account
3. Add your website: `https://langkahkecil.org`
4. Complete the application process
5. Wait for approval (can take a few days to weeks)

### Step 2: Get Your Publisher ID

1. Once approved, go to your AdSense dashboard
2. Navigate to **Account → Account information**
3. Copy your **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXX`)

### Step 3: Create Ad Units

1. Go to **Ads → By ad unit**
2. Click **Create ad unit**
3. Choose ad format:
   - **Display ads** (recommended for articles/content pages)
   - **In-feed ads** (for resource/article listing pages)
   - **In-article ads** (for CMS content pages)
4. Configure ad size (responsive is recommended)
5. Name your ad unit (e.g., "Resources Page Sidebar", "CMS Content Inline")
6. Copy the **Ad unit ID** (format: `ca-pub-XXXXXXXX/XXXXX-XXXXX`)

### Step 4: Set Up ads.txt File

**IMPORTANT:** Google AdSense requires an `ads.txt` file to verify ownership and authorize ad serving.

#### Option A: Using Environment Variable (Recommended)

1. Get your Publisher ID from AdSense dashboard (Account → Account information)
2. Add to your environment variables:
   ```bash
   NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXX
   ```
3. The file will be automatically generated at `https://langkahkecil.org/ads.txt`

#### Option B: Manual Static File

1. Edit `frontend/public/ads.txt`
2. Replace `pub-XXXXXXXXXXXXXX` with your actual Publisher ID (without "ca-" prefix)
3. Format should be: `google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
4. Example: `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`

**Verify ads.txt is accessible:**
- Visit: `https://langkahkecil.org/ads.txt`
- Should show: `google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
- Google will check this within 24-48 hours

### Step 5: Configure Environment Variables

Add to your `frontend/.env.local` (or production environment):

```bash
# Google AdSense
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE=ca-pub-XXXXXXXX/XXXXX-XXXXX
NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES=ca-pub-XXXXXXXX/XXXXX-XXXXX
NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT=ca-pub-XXXXXXXX/XXXXX-XXXXX
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=ca-pub-XXXXXXXX/XXXXX-XXXXX
```

**For production:**
- Add these variables to your hosting platform (Railway, Vercel, etc.)
- Never commit `.env.local` to git

### Step 6: Test Ad Placement

1. Start your development server: `npm run dev`
2. Visit pages where ads should appear:
   - Homepage: `http://localhost:3000`
   - Resources: `http://localhost:3000/resources`
   - CMS pages: `http://localhost:3000/cms/[slug]`
3. Check browser console for any AdSense errors
4. Verify ads are loading (they'll show placeholder/test ads before approval)

---

## 📍 Ad Placement Strategy

### Recommended Ad Positions

#### 1. Homepage (`/`)
- **Above the fold**: Leaderboard ad (728x90) after hero section
- **Mid-page**: Medium rectangle (300x250) after features section
- **Footer**: Leaderboard ad (728x90) before footer

#### 2. Resources Page (`/resources`)
- **Sidebar**: Skyscraper ad (300x600) on desktop
- **Between articles**: Medium rectangle (300x250) after every 3-4 articles
- **Footer**: Leaderboard ad (728x90)

#### 3. CMS Content Pages (`/cms/[slug]`)
- **Top of article**: Banner ad (728x90) below title
- **Inline in content**: In-article ads (automatic placement by Google)
- **Sidebar**: Medium rectangle (300x250) on desktop
- **End of article**: Medium rectangle (300x250) after content

#### 4. CMS Listing Page (`/cms`)
- **Sidebar**: Skyscraper ad (300x600) on desktop
- **Between listings**: Medium rectangle (300x250)

---

## ⚠️ AdSense Policies & Best Practices

### Important Rules

1. **Don't Click Your Own Ads** ⛔
   - Never click on ads on your own site
   - Don't ask friends/family to click
   - This will result in account suspension

2. **Minimum Content Requirements** 📝
   - Ensure pages have sufficient content before placing ads
   - Ads should complement, not overwhelm content

3. **Proper Ad Labeling** 🏷️
   - AdSense automatically labels ads as "Advertisements"
   - Don't remove or modify this label

4. **Traffic Requirements** 👥
   - You need genuine traffic (not bots)
   - Focus on organic growth and SEO

5. **Content Quality** ✨
   - Original, valuable content performs better
   - Keep content fresh and updated regularly

### Placement Guidelines

- ✅ **Good**: Ads between content sections
- ✅ **Good**: Ads in sidebars
- ✅ **Good**: Ads above the fold (but not too many)
- ❌ **Bad**: Ads too close to navigation buttons
- ❌ **Bad**: Ads that look like content
- ❌ **Bad**: More ads than content

---

## 🎯 Expected Revenue

### Factors Affecting Revenue

1. **Traffic Volume**: More visitors = more ad impressions = more revenue
2. **Traffic Quality**: Users from search engines tend to engage more
3. **Ad Placement**: Above-the-fold ads earn more
4. **Content Niche**: Health/autism content can have good CPM (cost per 1000 impressions)
5. **Geographic Location**: Traffic from Indonesia may have different rates than US/EU

### Realistic Expectations

- **Starting**: $5-50/month with 1,000-5,000 monthly visitors
- **Growing**: $50-200/month with 5,000-20,000 monthly visitors
- **Established**: $200-1,000+/month with 20,000+ monthly visitors

**Note**: These are rough estimates. Actual revenue depends on many factors.

---

## 📊 Monitoring Performance

### AdSense Dashboard

1. **Overview**: See daily earnings and page views
2. **Reports**: Detailed analytics by date, page, device
3. **Ad units**: Performance by ad unit
4. **Alerts**: Important notifications about your account

### Key Metrics

- **Page RPM** (Revenue per 1000 page views): How much you earn per 1000 page views
- **Click-through Rate (CTR)**: Percentage of users who click ads
- **Cost Per Click (CPC)**: Average revenue per click

---

## 🔧 Troubleshooting

### Ads Not Showing

1. **Check environment variables**:
   ```bash
   echo $NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
   ```

2. **Check browser console**:
   - Look for AdSense errors
   - Common issues: Invalid publisher ID, blocked by ad blocker

3. **Verify CSP headers**:
   - Make sure `backend/src/index.ts` has AdSense domains in CSP
   - Check network tab to see if scripts are blocked

4. **Wait for approval**:
   - New accounts show test ads first
   - Real ads appear after approval (can take 1-7 days)

### Low Revenue

1. **Increase traffic**: Focus on SEO and content marketing
2. **Optimize ad placement**: Test different positions
3. **Improve content quality**: Better content = better engagement
4. **Check ad blockers**: Many users block ads (this is normal)

---

## 🚫 Where NOT to Show Ads

### Pages to Exclude

- ❌ Dashboard pages (`/dashboard/*`) - Better UX for authenticated users
- ❌ Login/Register pages - Focus on conversion
- ❌ Checkout pages - Don't distract from payment
- ❌ Error pages - Keep them clean

**Note**: Our implementation only shows ads on public pages by default.

---

## 📝 Code Examples

### Basic Ad Placement

```tsx
import { ResponsiveAd } from '@/components/ads';

// In your component
<ResponsiveAd 
  adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES}
  placement="sidebar"
/>
```

### Custom Ad Unit

```tsx
import { AdUnit } from '@/components/ads';

<AdUnit
  adSlot="ca-pub-XXXXXXXX/XXXXX-XXXXX"
  adFormat="auto"
  fullWidthResponsive={true}
  className="my-8"
  style={{ minHeight: '250px' }}
/>
```

---

## 🔐 Security & Privacy

### GDPR Compliance

If you have EU visitors, consider:
- Adding cookie consent banner
- Using Google's cookie consent mode
- Updating privacy policy to mention AdSense

### Cookie Notice

AdSense uses cookies for ad personalization. Consider adding:
- Cookie consent banner
- Privacy policy update
- Cookie policy page

---

## 📈 Optimization Tips

1. **A/B Testing**: Test different ad placements
2. **Mobile Optimization**: Ensure ads work well on mobile
3. **Page Speed**: Fast pages = better user experience = better revenue
4. **Content Freshness**: Update content regularly for better rankings
5. **User Experience**: Balance ads with good UX

---

## 📞 Support

- **AdSense Help**: https://support.google.com/adsense
- **AdSense Forum**: https://support.google.com/adsense/community
- **Policy Issues**: Check AdSense policy center

---

## ✅ Checklist

- [ ] Applied for Google AdSense
- [ ] Received approval email
- [ ] Got Publisher ID
- [ ] Created ad units in AdSense dashboard
- [ ] Added environment variables
- [ ] Updated CSP headers (done automatically)
- [ ] Tested ads on development
- [ ] Deployed to production
- [ ] Verified ads show on live site
- [ ] Monitored AdSense dashboard for first impressions
- [ ] Updated privacy policy (if needed)

---

**Last Updated**: January 2026  
**Status**: ✅ Ready to use
