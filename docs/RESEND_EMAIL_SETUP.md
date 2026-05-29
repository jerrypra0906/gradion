# Resend Email Service Setup Guide

## Overview

Resend is a modern email API service that makes it easy to send transactional emails. LangkahKecil uses Resend for:
- ✅ Email verification (when users register)
- ✅ Password reset emails (future)
- ✅ Notification emails (therapist invitations, etc.)
- ✅ Transactional emails

**Why Resend?**
- ✅ **Free tier**: 2,000 emails/month (perfect for MVP)
- ✅ **Developer-friendly**: Simple API, great documentation
- ✅ **Good deliverability**: Emails reach inboxes, not spam
- ✅ **No credit card required** for free tier

---

## Step 1: Create Resend Account

### 1.1 Sign Up

1. Go to **https://resend.com**
2. Click **"Sign Up"** (top right)
3. Enter your email address
4. Create a password
5. Verify your email address (check your inbox)

### 1.2 Complete Profile

1. After login, go to **Settings** → **Profile**
2. Fill in your details (optional but recommended)
3. Add your phone number if you want SMS notifications

---

## Step 2: Get API Key

### 2.1 Navigate to API Keys

1. After login, go to **"API Keys"** in the left sidebar
2. Or go directly to: https://resend.com/api-keys

### 2.2 Create API Key

1. Click **"Create API Key"** button
2. Fill in:
   - **Name**: `LangkahKecil Production` (or your preferred name)
   - **Permission**: Select **"Sending access"** (default)
   - **Domain**: Leave empty (we'll use Resend's default domain first)
3. Click **"Add"**

### 2.3 Copy API Key

⚠️ **Important**: Copy the API key immediately! You won't be able to see it again.

- The API key will look like: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Save it securely** - you'll need it for Railway configuration

**Note**: If you lose the API key, you'll need to create a new one and update it in Railway.

---

## Step 3: Set Up Domain (Recommended for Production)

### 3.1 Why Use Your Own Domain?

Using your own domain (e.g., `noreply@langkahkecil.org`) instead of Resend's default domain provides:
- ✅ **Better deliverability** (emails less likely to go to spam)
- ✅ **Professional appearance** (your domain, not Resend's)
- ✅ **Brand consistency** (matches your website domain)

**For MVP**: You can skip this step and use Resend's default domain (`onboarding@resend.dev`). You can add your domain later.

### 3.2 Add Domain to Resend

1. Go to **"Domains"** in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain: `langkahkecil.org` (without www or subdomain)
4. Click **"Add Domain"**

### 3.3 Configure DNS Records

Resend will provide DNS records you need to add to Cloudflare (or your DNS provider):

**Required DNS Records:**

1. **SPF Record** (Type: TXT)
   - Name: `@` (or root domain)
   - Value: `v=spf1 include:resend.com ~all`

2. **DKIM Record** (Type: TXT)
   - Name: Resend will provide (e.g., `resend._domainkey`)
   - Value: Resend will provide (long string)

3. **DMARC Record** (Type: TXT) - Optional but recommended
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@langkahkecil.org`

4. **Domain Verification** (Type: TXT)
   - Name: Resend will provide
   - Value: Resend will provide

### 3.4 Add DNS Records in Cloudflare

1. Go to **Cloudflare Dashboard** → Select your domain
2. Go to **DNS** → **Records**
3. For each record Resend provides:
   - Click **"Add record"**
   - Select the **Type** (usually TXT)
   - Enter the **Name** (exactly as Resend provides)
   - Enter the **Value** (exactly as Resend provides)
   - **Proxy status**: DNS only (grey cloud) ⚠️ Important!
   - Click **"Save"**

### 3.5 Verify Domain in Resend

1. After adding DNS records, go back to Resend → **Domains**
2. Click on your domain
3. Resend will automatically verify DNS records (usually takes 5-15 minutes)
4. Wait until all records show **"Verified"** ✅

**Note**: DNS propagation can take up to 24 hours, but usually completes in 15-30 minutes.

---

## Step 4: Configure Environment Variables in Railway

### 4.1 Required Environment Variables

Go to **Railway Dashboard** → Your Service → **Variables** → Add these variables:

#### 4.1.1 RESEND_API_KEY

- **Variable Name**: `RESEND_API_KEY`
- **Value**: Your API key from Step 2 (e.g., `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Required**: ✅ Yes (without this, emails won't work)

#### 4.1.2 RESEND_FROM_EMAIL

- **Variable Name**: `RESEND_FROM_EMAIL`
- **Value**: 
  - **If using your own domain**: `noreply@langkahkecil.org`
  - **If using Resend default**: `onboarding@resend.dev`
- **Required**: ⚠️ Optional (defaults to `no-reply@langkahkecil.com` if not set)

#### 4.1.3 RESEND_FROM_NAME

- **Variable Name**: `RESEND_FROM_NAME`
- **Value**: `LangkahKecil` (or your preferred sender name)
- **Required**: ⚠️ Optional (defaults to `LangkahKecil` if not set)

#### 4.1.4 SUPPORT_EMAIL

- **Variable Name**: `SUPPORT_EMAIL`
- **Value**: `support@langkahkecil.org` (or your preferred support email address)
- **Required**: ⚠️ Optional (but recommended for contact form functionality)
- **Note**: This email will receive contact form submissions from users

#### 4.1.5 EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS (Optional)

- **Variable Name**: `EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS`
- **Value**: `24` (default)
- **Required**: ⚠️ Optional (defaults to 24 hours)

#### 4.1.6 EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES (Optional)

- **Variable Name**: `EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES`
- **Value**: `10` (default)
- **Required**: ⚠️ Optional (defaults to 10 minutes)

### 4.2 Quick Setup Example

For a quick setup (using Resend's default domain):

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=LangkahKecil
SUPPORT_EMAIL=support@langkahkecil.org
```

For production (using your own domain):

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@langkahkecil.org
RESEND_FROM_NAME=LangkahKecil
SUPPORT_EMAIL=support@langkahkecil.org
```

### 4.3 Add Variables to Railway

1. Go to **Railway Dashboard** → Your Service
2. Click **"Variables"** tab
3. Click **"New Variable"** for each variable above
4. Enter **Variable Name** and **Value**
5. Click **"Save"**

**Important**: After adding/updating variables, Railway will automatically redeploy your service.

---

## Step 5: Test Email Configuration

### 5.1 Use Health Check Endpoint

The application has a built-in test endpoint to verify email configuration.

**Option 1: Using cURL**

```bash
curl -X POST https://api.langkahkecil.org/api/health/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

**Option 2: Using Postman or Insomnia**

1. Create a new POST request
2. URL: `https://api.langkahkecil.org/api/health/test-email`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
   ```json
   {
     "to": "your-email@example.com"
   }
   ```
5. Send request

**Option 2: Using Browser Console (if you have a test page)**

```javascript
fetch('https://api.langkahkecil.org/api/health/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'your-email@example.com' })
})
  .then(res => res.json())
  .then(console.log);
```

### 5.2 Expected Response

**Success Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully to your-email@example.com",
  "config": {
    "apiKeyConfigured": true,
    "fromEmail": "noreply@langkahkecil.org",
    "fromName": "LangkahKecil"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to send test email: [error details]"
}
```

### 5.3 Check Your Email

1. Check your inbox for the test email
2. If not in inbox, check **spam/junk folder**
3. The email should show:
   - **From**: `LangkahKecil <noreply@langkahkecil.org>` (or your configured email)
   - **Subject**: `Resend Configuration Test - LangkahKecil`
   - **Content**: Configuration status and test message

### 5.4 Test Real Registration Flow

1. Go to your frontend: `https://langkahkecil.org`
2. Try to register a new account with your email
3. Check your email for the verification email
4. Click the verification link
5. Verify the account is activated

---

## Step 6: Email Types in LangkahKecil

### 6.1 Email Verification

**When**: Sent automatically when a user registers
**Purpose**: Verify user's email address before they can login
**Template**: Located in `backend/src/services/emailVerification.service.ts`

**Email Content:**
- Welcome message
- Verification button/link
- Expiration notice (default: 24 hours)

**Configuration:**
- Token expiration: `EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS` (default: 24)
- Resend cooldown: `EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES` (default: 10)

### 6.2 Therapist Invitation

**When**: Sent when a parent tries to link a therapist that doesn't exist
**Purpose**: Invite therapist to register
**Template**: Located in `backend/src/routes/children.ts`

**Email Content:**
- Invitation message
- Link to registration page
- Instructions to register as therapist

### 6.3 Future Email Types (Implementation Ready)

All future email types have been implemented and are ready to use:

- ✅ **Password reset emails** - See [EMAIL_SERVICES_GUIDE.md](./EMAIL_SERVICES_GUIDE.md) for setup
- ✅ **Contact/Support form emails** - Sends contact form submissions to support email
- ✅ **Subscription renewal reminders** - Ready, needs cron job setup
- ✅ **Payment receipts** - Ready, call after successful payment
- ✅ **Weekly/monthly progress reports** - Ready, needs data aggregation + cron job
- ✅ **Session reminders** - Ready, needs cron job setup

**Full Implementation Guide**: See [EMAIL_SERVICES_GUIDE.md](./EMAIL_SERVICES_GUIDE.md) for detailed setup instructions.

---

## Step 7: Monitor Email Sending

### 7.1 Resend Dashboard

1. Go to **Resend Dashboard** → **Emails**
2. View all sent emails
3. See delivery status (sent, delivered, bounced, etc.)
4. Check open rates and click rates (if tracking enabled)

### 7.2 Email Logs in Railway

Check Railway logs to see email sending activity:

1. Go to **Railway Dashboard** → Your Service → **Deployments** → **Logs**
2. Look for email-related log messages
3. Check for errors like:
   - `Email service not configured`
   - `Failed to send email`
   - API key errors

### 7.3 Monitor Email Quota

1. Go to **Resend Dashboard** → **Overview**
2. Check your email quota usage
3. Free tier: **2,000 emails/month**
4. Monitor usage to avoid hitting limits

---

## Step 8: Troubleshooting

### Issue 1: "Email service not configured" Warning

**Symptoms:**
- Emails not being sent
- Log shows: `Email service not configured. Skipping send.`

**Cause:**
- `RESEND_API_KEY` is missing or incorrect in Railway

**Solution:**
1. Check Railway Variables → Verify `RESEND_API_KEY` is set
2. Verify API key is correct (starts with `re_`)
3. Check for typos or extra spaces
4. Redeploy service after updating variables

### Issue 2: "Failed to send email" Error

**Symptoms:**
- API returns error when trying to send email
- Log shows: `Failed to send email`

**Possible Causes:**
1. **Invalid API Key**
   - Solution: Verify API key in Resend dashboard → Create new key if needed
2. **Domain not verified** (if using custom domain)
   - Solution: Check Resend → Domains → Verify all DNS records are verified
3. **Invalid "From" email**
   - Solution: Verify `RESEND_FROM_EMAIL` matches verified domain
4. **Rate limiting**
   - Solution: Check Resend dashboard for rate limit errors

### Issue 3: Emails Going to Spam

**Symptoms:**
- Emails sent successfully but end up in spam folder

**Solutions:**
1. **Use your own domain** (instead of Resend default)
   - Follow Step 3 to set up domain
   - Verify all DNS records (SPF, DKIM, DMARC)
2. **Warm up domain** (for new domains)
   - Start with low volume
   - Gradually increase sending volume
3. **Avoid spam triggers**
   - Don't use ALL CAPS in subject
   - Don't use too many links
   - Include unsubscribe link (for marketing emails)
   - Use proper HTML structure

### Issue 4: "Invalid domain" Error

**Symptoms:**
- Error when sending: `Invalid domain`

**Cause:**
- `RESEND_FROM_EMAIL` domain is not verified in Resend

**Solution:**
1. If using custom domain: Verify domain in Resend (Step 3)
2. If using Resend default: Use `onboarding@resend.dev`
3. Check DNS records are correctly configured

### Issue 5: Emails Not Received

**Symptoms:**
- Test endpoint returns success
- But email never arrives

**Possible Causes:**
1. **Check spam folder**
   - Solution: Look in spam/junk folder
2. **Email address typo**
   - Solution: Verify email address is correct
3. **Email provider blocking**
   - Solution: Check Resend dashboard → Emails → See delivery status
4. **Domain reputation issue**
   - Solution: Use verified domain, check Resend reputation

### Issue 6: API Key Not Working

**Symptoms:**
- Error: `Unauthorized` or `Invalid API key`

**Solutions:**
1. Verify API key is copied correctly (no extra spaces)
2. Check API key hasn't been revoked in Resend dashboard
3. Create new API key and update in Railway
4. Verify API key has "Sending access" permission

### Issue 7: DNS Records Not Verifying

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

## Step 9: Best Practices

### 9.1 Email Configuration

- ✅ **Always use your own domain** for production (better deliverability)
- ✅ **Use a dedicated email** like `noreply@langkahkecil.org` (not your personal email)
- ✅ **Set up SPF, DKIM, DMARC** records (prevents spoofing)
- ✅ **Monitor email quota** (free tier: 2,000/month)

### 9.2 Security

- ✅ **Never commit API keys** to Git (use environment variables)
- ✅ **Rotate API keys** periodically (every 3-6 months)
- ✅ **Use separate API keys** for development and production
- ✅ **Revoke unused API keys** immediately

### 9.3 Email Content

- ✅ **Professional HTML templates** (responsive, mobile-friendly)
- ✅ **Clear call-to-action** buttons/links
- ✅ **Include expiration notices** for verification links
- ✅ **Plain text fallback** (Resend handles this automatically)
- ✅ **Test emails** on multiple email clients (Gmail, Outlook, etc.)

### 9.4 Monitoring

- ✅ **Monitor email delivery rates** in Resend dashboard
- ✅ **Set up alerts** for bounced emails
- ✅ **Track email open rates** (if needed, enable tracking in Resend)
- ✅ **Log email sending** in application logs

---

## Step 10: Upgrade Plan (When Needed)

### 10.1 When to Upgrade

Upgrade from free tier when:
- ✅ Sending more than **2,000 emails/month**
- ✅ Need **higher rate limits**
- ✅ Need **advanced features** (webhooks, templates, etc.)

### 10.2 Resend Pricing

- **Free**: 2,000 emails/month, 1 domain
- **Pro**: $20/month, 50,000 emails, unlimited domains
- **Enterprise**: Custom pricing, dedicated support

### 10.3 How to Upgrade

1. Go to Resend Dashboard → **Billing**
2. Click **"Upgrade Plan"**
3. Select plan
4. Add payment method
5. API key remains the same (no code changes needed)

---

## Quick Reference Checklist

After setup, verify:

- [ ] Resend account created ✅
- [ ] API key generated and saved securely ✅
- [ ] Domain added and verified (if using custom domain) ✅
- [ ] DNS records configured (SPF, DKIM, DMARC) ✅
- [ ] `RESEND_API_KEY` added to Railway ✅
- [ ] `RESEND_FROM_EMAIL` configured in Railway ✅
- [ ] `RESEND_FROM_NAME` configured in Railway ✅
- [ ] Test email sent successfully ✅
- [ ] Email received in inbox (not spam) ✅
- [ ] Registration email flow tested ✅
- [ ] Email quota monitored ✅

---

## Configuration Summary

### Required Variables (Minimum)

```env
RESEND_API_KEY=re_your_api_key_here
```

### Recommended Variables (Production)

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@langkahkecil.org
RESEND_FROM_NAME=LangkahKecil
SUPPORT_EMAIL=support@langkahkecil.org
EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS=24
EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES=10
```

### Default Values

If variables are not set:
- `RESEND_FROM_EMAIL`: `no-reply@langkahkecil.com`
- `RESEND_FROM_NAME`: `LangkahKecil`
- `SUPPORT_EMAIL`: Not set (contact form will be disabled)
- `EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS`: `24`
- `EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES`: `10`

---

## Next Steps

After setting up Resend:

1. ✅ **Test email sending** using health check endpoint
2. ✅ **Test user registration flow** to verify email verification works
3. ✅ **Monitor email delivery** in Resend dashboard
4. ✅ **Set up domain** (if not done yet) for better deliverability
5. ✅ **Configure email templates** (optional - customize HTML templates)

---

## Resources

- **Resend Documentation**: https://resend.com/docs
- **Resend API Reference**: https://resend.com/docs/api-reference
- **Resend Dashboard**: https://resend.com/emails
- **DNS Record Guide**: https://resend.com/docs/dashboard/domains/introduction
- **Email Deliverability Guide**: https://resend.com/docs/dashboard/domains/spf-dkim-dmarc

---

*Last updated: December 2024*
