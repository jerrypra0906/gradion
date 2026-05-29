# Support Email Setup Guide - Using Resend

## Overview

This guide will walk you through setting up a support email address (`support@langkahkecil.org`) using Resend. This email will receive contact form submissions from users.

**What you'll need:**
- ✅ Resend account (already set up)
- ✅ Access to your domain's DNS settings (Cloudflare or your DNS provider)
- ✅ Access to Railway dashboard

---

## Step 1: Choose Your Support Email Address

### Option A: Use Your Own Domain (Recommended for Production)

**Email Address**: `support@langkahkecil.org`

**Pros:**
- ✅ Professional appearance
- ✅ Better deliverability
- ✅ Brand consistency

**Cons:**
- ⚠️ Requires DNS configuration

### Option B: Use Resend's Default Domain (Quick Setup)

**Email Address**: `support@resend.dev`

**Pros:**
- ✅ No DNS configuration needed
- ✅ Works immediately

**Cons:**
- ⚠️ Less professional (uses Resend's domain)
- ⚠️ May have lower deliverability

**For this guide, we'll use Option A (your own domain).**

---

## Step 2: Verify Domain in Resend (If Using Custom Domain)

### 2.1 Check if Domain is Already Added

1. Go to **Resend Dashboard**: https://resend.com/domains
2. Check if `langkahkecil.org` is already listed
3. If it shows **"Verified"** ✅, skip to Step 3
4. If it's not listed or shows **"Pending"**, continue below

### 2.2 Add Domain to Resend (If Not Already Added)

1. Go to **Resend Dashboard** → **Domains**
2. Click **"Add Domain"** button
3. Enter your domain: `langkahkecil.org` (without www)
4. Click **"Add Domain"**

### 2.3 Configure DNS Records

Resend will show you DNS records that need to be added. You'll need:

1. **SPF Record** (Type: TXT)
2. **DKIM Record** (Type: TXT) - Resend provides the name and value
3. **DMARC Record** (Type: TXT) - Optional but recommended
4. **Domain Verification** (Type: TXT) - Resend provides this

**Example DNS Records:**

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

Type: TXT
Name: resend._domainkey (Resend will provide exact name)
Value: [Long string provided by Resend]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@langkahkecil.org
```

### 2.4 Add DNS Records in Cloudflare

1. Go to **Cloudflare Dashboard** → Select `langkahkecil.org`
2. Go to **DNS** → **Records**
3. For each record Resend provides:
   - Click **"Add record"**
   - Select **Type**: TXT
   - Enter **Name**: (exactly as Resend provides)
   - Enter **Value**: (exactly as Resend provides)
   - **Proxy status**: DNS only (grey cloud) ⚠️ **Important!**
   - Click **"Save"**

### 2.5 Verify Domain in Resend

1. After adding DNS records, go back to **Resend** → **Domains**
2. Click on `langkahkecil.org`
3. Resend will automatically verify DNS records (usually 5-15 minutes)
4. Wait until all records show **"Verified"** ✅

**Note**: DNS propagation can take up to 24 hours, but usually completes in 15-30 minutes.

---

## Step 3: Configure Support Email in Railway

### 3.1 Navigate to Railway Variables

1. Go to **Railway Dashboard**: https://railway.app
2. Select your **Backend Service** (LangkahKecil Backend)
3. Click on **"Variables"** tab

### 3.2 Add SUPPORT_EMAIL Variable

1. Click **"New Variable"** button
2. Enter:
   - **Variable Name**: `SUPPORT_EMAIL`
   - **Value**: 
     - If using custom domain: `support@langkahkecil.org`
     - If using Resend default: `support@resend.dev`
3. Click **"Save"**

**Example:**
```
Variable Name: SUPPORT_EMAIL
Value: support@langkahkecil.org
```

### 3.3 Verify Other Email Variables

Make sure these variables are also set:

- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `RESEND_FROM_EMAIL` - Email for sending (e.g., `noreply@langkahkecil.org`)
- ✅ `RESEND_FROM_NAME` - Sender name (e.g., `LangkahKecil`)

**Note**: Railway will automatically redeploy your service after adding/updating variables.

---

## Step 4: Test Support Email Setup

### 4.1 Wait for Deployment

1. After adding `SUPPORT_EMAIL` variable, wait for Railway to redeploy
2. Check Railway **Deployments** tab to see deployment status
3. Wait until deployment shows **"Active"** ✅

### 4.2 Test Contact Form

**Option 1: Using the Frontend Contact Form**

1. Go to your website: `https://langkahkecil.org/contact`
2. Fill out the contact form:
   - **Name**: Test User
   - **Email**: your-email@example.com (use your real email)
   - **Subject**: Test Support Email
   - **Message**: This is a test message to verify support email setup.
3. Click **"Send Message"**
4. You should see: **"Message sent successfully!"**

**Option 2: Using API Directly (cURL)**

```bash
curl -X POST https://api.langkahkecil.org/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-email@example.com",
    "subject": "Test Support Email",
    "message": "This is a test message to verify support email setup."
  }'
```

### 4.3 Check Your Support Email

1. Check the inbox for `support@langkahkecil.org` (or your configured email)
2. You should receive an email with:
   - **Subject**: `[Contact Form] Test Support Email`
   - **From**: `LangkahKecil <noreply@langkahkecil.org>`
   - **Content**: User's name, email, subject, and message

### 4.4 Check User Confirmation Email

1. Check the email you used in the contact form (`your-email@example.com`)
2. You should receive a confirmation email with:
   - **Subject**: `Re: Test Support Email - We've received your message`
   - **Content**: Confirmation that the message was received

---

## Step 5: Verify Email Delivery

### 5.1 Check Resend Dashboard

1. Go to **Resend Dashboard** → **Emails**
2. You should see two emails:
   - One sent to `support@langkahkecil.org`
   - One sent to the user's email
3. Check delivery status:
   - ✅ **Sent**: Email was sent successfully
   - ✅ **Delivered**: Email reached the inbox
   - ⚠️ **Bounced**: Email was rejected (check email address)

### 5.2 Check Spam Folder

If emails don't appear in inbox:
1. Check **spam/junk folder**
2. If in spam, mark as "Not Spam" to improve deliverability
3. Consider setting up SPF, DKIM, DMARC records (Step 2.3)

### 5.3 Check Railway Logs

1. Go to **Railway Dashboard** → Your Service → **Deployments** → **Logs**
2. Look for log messages:
   - ✅ `Contact form submission received and emails sent`
   - ❌ `Support email not configured` - Check `SUPPORT_EMAIL` variable
   - ❌ `Failed to send email` - Check Resend API key and configuration

---

## Step 6: Troubleshooting

### Issue 1: "Support email is not configured" Error

**Symptoms:**
- Contact form shows error: "Support email is not configured"
- API returns 503 error

**Solution:**
1. Check Railway Variables → Verify `SUPPORT_EMAIL` is set
2. Verify email format is correct (e.g., `support@langkahkecil.org`)
3. Redeploy service after adding variable

### Issue 2: Emails Not Received

**Symptoms:**
- Form submission succeeds
- But no email arrives in support inbox

**Possible Causes:**
1. **Check spam folder** - Emails might be filtered
2. **Invalid email address** - Verify `SUPPORT_EMAIL` is correct
3. **Domain not verified** - If using custom domain, verify DNS records
4. **Resend quota exceeded** - Check Resend dashboard for quota limits

**Solution:**
1. Check Resend Dashboard → Emails → See delivery status
2. Verify `SUPPORT_EMAIL` variable in Railway
3. Check Railway logs for errors
4. Verify domain is verified in Resend (if using custom domain)

### Issue 3: "Invalid domain" Error

**Symptoms:**
- Error when sending: `Invalid domain`

**Cause:**
- `SUPPORT_EMAIL` domain is not verified in Resend

**Solution:**
1. If using custom domain: Verify domain in Resend (Step 2)
2. If using Resend default: Use `support@resend.dev`
3. Check DNS records are correctly configured

### Issue 4: DNS Records Not Verifying

**Symptoms:**
- DNS records show "Pending" or "Failed" in Resend

**Solutions:**
1. **Wait for DNS propagation** (can take up to 24 hours, usually 15-30 minutes)
2. **Verify DNS records are correct**
   - Check Cloudflare DNS records match Resend's exactly
   - Ensure no typos in names or values
3. **Check Proxy status**
   - Make sure records have **"DNS only"** (grey cloud) in Cloudflare
   - Orange cloud (proxied) can cause verification issues
4. **Use DNS checker tools**
   - Check: https://mxtoolbox.com/SuperTool.aspx
   - Verify records are visible publicly

---

## Step 7: Best Practices

### 7.1 Email Management

- ✅ **Use a dedicated support email** (not your personal email)
- ✅ **Set up email forwarding** (forward `support@langkahkecil.org` to your main email)
- ✅ **Use email filters** to organize support requests
- ✅ **Set up auto-replies** (optional) to acknowledge receipt

### 7.2 Response Time

- ✅ **Aim for 24-48 hour response time** (mentioned in confirmation email)
- ✅ **Set up email notifications** on your phone/computer
- ✅ **Create email templates** for common responses

### 7.3 Monitoring

- ✅ **Monitor Resend dashboard** for delivery issues
- ✅ **Check Railway logs** regularly for errors
- ✅ **Set up alerts** for bounced emails
- ✅ **Track email quota** (free tier: 2,000 emails/month)

---

## Quick Reference Checklist

After setup, verify:

- [ ] Domain added to Resend (if using custom domain) ✅
- [ ] DNS records configured and verified ✅
- [ ] `SUPPORT_EMAIL` variable added to Railway ✅
- [ ] Railway deployment completed successfully ✅
- [ ] Contact form accessible at `/contact` ✅
- [ ] Test message sent successfully ✅
- [ ] Support email received the submission ✅
- [ ] User received confirmation email ✅
- [ ] Emails not going to spam ✅

---

## Configuration Summary

### Required Variables (Minimum)

```env
RESEND_API_KEY=re_your_api_key_here
SUPPORT_EMAIL=support@langkahkecil.org
```

### Recommended Variables (Full Setup)

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@langkahkecil.org
RESEND_FROM_NAME=LangkahKecil
SUPPORT_EMAIL=support@langkahkecil.org
```

---

## Next Steps

After setting up support email:

1. ✅ **Test contact form** - Submit a test message
2. ✅ **Verify email delivery** - Check both support and user emails
3. ✅ **Set up email forwarding** - Forward support emails to your main inbox
4. ✅ **Create email templates** - Prepare responses for common questions
5. ✅ **Monitor email quota** - Track usage in Resend dashboard

---

## Resources

- **Resend Dashboard**: https://resend.com/emails
- **Resend Domains**: https://resend.com/domains
- **Resend Documentation**: https://resend.com/docs
- **Contact Form**: https://langkahkecil.org/contact

---

*Last updated: December 2024*
