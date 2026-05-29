# ⚠️ Deployment Required: ads.txt File

## Current Status

You're getting a **404 error** when visiting `https://www.langkahkecil.org/ads.txt` because:

1. ✅ Code has been pushed to GitHub
2. ❌ **Code has NOT been deployed to production yet**

## Next Steps

### Step 1: Deploy Your Application

You need to **redeploy your frontend** so the `ads.txt` file becomes available. The deployment method depends on where your frontend is hosted:

#### If using Railway:
1. Go to Railway Dashboard → Your Frontend Service
2. Click **"Redeploy"** or **"Deploy Latest"**
3. Wait for deployment to complete (usually 5-10 minutes)

#### If using Vercel:
1. Vercel automatically deploys from GitHub
2. Check your Vercel dashboard for latest deployment
3. If auto-deploy is off, trigger a manual deployment

#### If using Docker manually:
```bash
cd frontend
docker-compose up -d --build frontend
```

### Step 2: Verify ads.txt is Accessible

After deployment, test:
```bash
curl https://www.langkahkecil.org/ads.txt
```

You should see the ads.txt content (even if it's just comments/placeholder).

### Step 3: Add Your Publisher ID

Once ads.txt is accessible, you need to add your actual Publisher ID:

1. **Get your Publisher ID:**
   - Go to AdSense Dashboard → Account → Account information
   - Copy your Publisher ID (format: `ca-pub-XXXXXXXXXXXXXX`)

2. **Update the file:**

   **Option A: Use Environment Variable (Recommended)**
   - Add to production environment:
     ```bash
     NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXX
     ```
   - The route handler will auto-generate the correct ads.txt
   - Redeploy after adding the variable

   **Option B: Edit Static File**
   - Edit `frontend/public/ads.txt`
   - Uncomment and replace the line:
     ```bash
     # Change from:
     # google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
     
     # To (replace with your actual Publisher ID without "ca-" prefix):
     google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
     ```
   - Commit and push:
     ```bash
     git add frontend/public/ads.txt
     git commit -m "Add Publisher ID to ads.txt"
     git push origin master
     ```
   - Redeploy

### Step 4: Verify Again

After adding your Publisher ID and deploying:

1. Visit: `https://www.langkahkecil.org/ads.txt`
2. You should see:
   ```
   google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   (with your actual Publisher ID)

3. Wait 24-48 hours for Google to verify
4. Check AdSense dashboard → Manage your sites
5. Status should change from "Not found" to "Found" or "Valid"

---

## Troubleshooting

### Still Getting 404 After Deployment?

1. **Check deployment logs:**
   - Verify the build completed successfully
   - Check if `public/ads.txt` was copied during build

2. **Verify file exists in production:**
   - SSH into your server (if possible)
   - Check: `ls -la /app/public/ads.txt` (or wherever your app is deployed)

3. **Check CDN/caching:**
   - Clear CDN cache if using Cloudflare or similar
   - Wait a few minutes and try again

4. **Test both URLs:**
   - `https://www.langkahkecil.org/ads.txt`
   - `https://langkahkecil.org/ads.txt` (without www)

### File Shows but Google Says "Not Found"?

1. **Wait longer:** Google checks every 24-48 hours
2. **Verify format:** Must be exactly: `google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
3. **Check Publisher ID:** Make sure it's correct (without "ca-" prefix in the file)
4. **No comments:** The actual line should NOT be commented (no `#` at the start)

---

## Quick Checklist

- [ ] Code pushed to GitHub ✅
- [ ] Frontend deployed to production ⏳ **← You are here**
- [ ] ads.txt accessible at `https://www.langkahkecil.org/ads.txt` ⏳
- [ ] Publisher ID added to ads.txt ⏳
- [ ] Google verifies ads.txt (24-48 hours) ⏳

---

**Last Updated:** January 10, 2026
