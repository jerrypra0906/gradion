# UptimeRobot Monitoring Setup Guide

## Overview

UptimeRobot is a free monitoring service that checks your application's uptime and sends alerts when services go down. The free tier includes:
- ✅ **50 monitors** (more than enough for MVP)
- ✅ **5-minute check intervals**
- ✅ **Email & SMS alerts**
- ✅ **Status pages** (optional)
- ✅ **Mobile app** for monitoring on the go

---

## Step 1: Create UptimeRobot Account

### 1.1 Sign Up

1. Go to **https://uptimerobot.com**
2. Click **"Sign Up"** (top right)
3. Enter your email address
4. Create a password
5. Verify your email address

### 1.2 Complete Profile

1. After login, go to **"My Settings"** → **"Profile"**
2. Add your phone number (for SMS alerts)
3. Verify your phone number if you want SMS notifications

---

## Step 2: Monitor Frontend (Vercel)

### 2.1 Add New Monitor

1. In UptimeRobot dashboard, click **"+ Add New Monitor"**
2. Select **"HTTP(s)"** as monitor type

### 2.2 Configure Frontend Monitor

Fill in the following details:

**Monitor Details:**
- **Friendly Name**: `LangkahKecil Frontend`
- **URL**: `https://langkahkecil.org` (or `https://www.langkahkecil.org` if you prefer)
- **Monitor Type**: `HTTP(s)`
- **Monitoring Interval**: `Every 5 minutes` (free tier)

**Alert Contacts:**
- Select your email address
- (Optional) Select your phone number for SMS alerts

**Advanced Options:**
- **Alert When**: `Down` (default)
- **HTTP Method**: `GET`
- **Expected Status Code**: `200`
- **Keyword**: Leave empty (or add a unique keyword from your homepage if you want keyword monitoring)

### 2.3 Save Monitor

Click **"Create Monitor"**

**Expected Response:**
- Status Code: `200`
- Response Time: Should be < 2 seconds
- Status: `Up` ✅

---

## Step 3: Monitor Backend API (Railway)

### 3.1 Add New Monitor

1. Click **"+ Add New Monitor"** again
2. Select **"HTTP(s)"** as monitor type

### 3.2 Configure Backend Monitor

Fill in the following details:

**Monitor Details:**
- **Friendly Name**: `LangkahKecil API`
- **URL**: `https://api.langkahkecil.org/api/health`
- **Monitor Type**: `HTTP(s)`
- **Monitoring Interval**: `Every 5 minutes`

**Alert Contacts:**
- Select your email address
- (Optional) Select your phone number for SMS alerts

**Advanced Options:**
- **Alert When**: `Down`
- **HTTP Method**: `GET`
- **Expected Status Code**: `200`
- **Keyword**: `"status":"ok"` (to verify the health endpoint returns the correct response)

### 3.3 Save Monitor

Click **"Create Monitor"**

**Expected Response:**
- Status Code: `200`
- Response Body: `{"status":"ok","timestamp":"...","uptime":...}`
- Response Time: Should be < 1 second
- Status: `Up` ✅

---

## Step 4: Monitor Database Connection (Optional but Recommended)

### 4.1 Why Monitor Database?

Even if your API is up, if the database connection fails, your app won't work properly. Monitoring the health endpoint ensures the database connection is working.

The `/api/health` endpoint already checks:
- ✅ Server is running
- ✅ API routes are accessible
- ✅ Database connection (implicitly, since Prisma queries would fail if DB is down)

**Note**: The health endpoint doesn't explicitly test the database, but if the database is down, API requests will fail, and the monitor will catch it.

### 4.2 Alternative: Monitor a Database-Dependent Endpoint

If you want to explicitly test database connectivity:

1. Create a monitor for: `https://api.langkahkecil.org/api/auth/login`
2. **HTTP Method**: `POST`
3. **Expected Status Code**: `400` or `401` (we expect it to fail with invalid credentials, but the endpoint should respond)
4. **Keyword**: Leave empty

This ensures the database is accessible (even if login fails, the endpoint should respond).

---

## Step 5: Configure Alert Contacts

### 5.1 Add Email Alerts

1. Go to **"My Settings"** → **"Alert Contacts"**
2. Your email should already be there
3. Verify it's enabled for all monitors

### 5.2 Add SMS Alerts (Optional)

1. In **"Alert Contacts"**, click **"Add Alert Contact"**
2. Select **"SMS"**
3. Enter your phone number
4. Verify via SMS code
5. Enable SMS alerts for critical monitors (API, Frontend)

**Note**: Free tier includes limited SMS alerts. Use them for critical monitors only.

### 5.3 Add Webhook Alerts (Advanced - Optional)

If you want to integrate with Slack, Discord, or other services:

1. Go to **"My Settings"** → **"Alert Contacts"**
2. Click **"Add Alert Contact"**
3. Select **"Webhook"**
4. Enter your webhook URL
5. Test the webhook

**Example Webhook URLs:**
- **Slack**: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
- **Discord**: `https://discord.com/api/webhooks/YOUR/WEBHOOK/URL`
- **Custom**: Your own endpoint that receives POST requests

---

## Step 6: Configure Monitor Groups (Optional)

### 6.1 Create Monitor Groups

Organize your monitors for better visibility:

1. Go to **"My Settings"** → **"Monitor Groups"**
2. Click **"Add Group"**
3. Name: `LangkahKecil Production`
4. Add monitors: Frontend, API
5. Save

### 6.2 Benefits

- Better organization
- Group-level status pages
- Easier to manage multiple environments (Production, Staging, etc.)

---

## Step 7: Set Up Status Page (Optional but Recommended)

### 7.1 Create Public Status Page

1. Go to **"My Settings"** → **"Status Pages"**
2. Click **"Create Status Page"**
3. Fill in:
   - **Page Name**: `LangkahKecil Status`
   - **Page URL**: Choose a subdomain (e.g., `langkahkecil-status.uptimerobot.com`)
   - **Description**: `Real-time status of LangkahKecil services`
   - **Theme**: Choose your preferred theme
4. Select monitors to display: Frontend, API
5. Click **"Create Status Page"**

### 7.2 Share Status Page

- Share the URL with your team
- Add a link to your website footer: "Status"
- Use it in support communications

**Example Status Page URL:**
```
https://langkahkecil-status.uptimerobot.com
```

---

## Step 8: Test Your Monitors

### 8.1 Manual Test

1. Go to your monitor dashboard
2. Click on each monitor
3. Click **"Test Monitor"** button
4. Verify it shows **"Up"** status

### 8.2 Simulate Downtime (Optional)

To test alerts:

1. Temporarily stop your Railway service (or Vercel deployment)
2. Wait 5-10 minutes
3. Check if you receive an alert email/SMS
4. Restart the service
5. Verify you receive an "Up" notification

**Note**: Only do this during non-critical hours!

---

## Step 9: Monitor Best Practices

### 9.1 Recommended Monitoring Setup

| Monitor | URL | Type | Interval | Priority |
|---------|-----|------|----------|----------|
| Frontend | `https://langkahkecil.org` | HTTP(s) | 5 min | High |
| API Health | `https://api.langkahkecil.org/api/health` | HTTP(s) | 5 min | High |
| API Login | `https://api.langkahkecil.org/api/auth/login` | HTTP(s) | 10 min | Medium |

### 9.2 Monitoring Intervals

- **Critical Services** (Frontend, API): `5 minutes` (free tier limit)
- **Less Critical**: `10-30 minutes` (if you upgrade to paid)

### 9.3 Alert Strategy

- **Email**: Enable for all monitors
- **SMS**: Enable only for critical monitors (Frontend, API)
- **Webhook**: Use for team notifications (Slack, Discord)

### 9.4 Response Time Monitoring

UptimeRobot tracks response times. Monitor these:

- **Frontend**: Should be < 2 seconds
- **API Health**: Should be < 1 second
- **API Endpoints**: Should be < 3 seconds

If response times increase significantly, investigate:
- Database performance
- API rate limiting
- Vercel/Railway resource limits

---

## Step 10: Advanced Configuration

### 10.1 Keyword Monitoring

For the API health endpoint, you can add keyword monitoring:

- **Keyword**: `"status":"ok"`
- **Alert When**: Keyword is **not** found

This ensures the health endpoint returns the correct JSON response, not just a 200 status.

### 10.2 Maintenance Windows

If you need to perform maintenance:

1. Go to monitor settings
2. Click **"Pause Monitor"**
3. Perform maintenance
4. Click **"Resume Monitor"**

This prevents false alerts during planned maintenance.

### 10.3 Custom Alert Thresholds

For paid plans, you can set:
- Custom response time thresholds
- Multiple alert contacts with different priorities
- Escalation policies

---

## Step 11: Mobile App Setup

### 11.1 Install UptimeRobot Mobile App

1. Download from App Store (iOS) or Google Play (Android)
2. Login with your UptimeRobot credentials
3. Enable push notifications

### 11.2 Benefits

- Real-time alerts on your phone
- Quick status checks
- Monitor management on the go

---

## Step 12: Integration with Other Services

### 12.1 Slack Integration

1. Create a Slack webhook: https://api.slack.com/messaging/webhooks
2. In UptimeRobot, add webhook alert contact
3. Paste Slack webhook URL
4. Enable for critical monitors

### 12.2 Discord Integration

1. Create a Discord webhook: Server Settings → Integrations → Webhooks
2. In UptimeRobot, add webhook alert contact
3. Paste Discord webhook URL
4. Enable for critical monitors

### 12.3 PagerDuty Integration (For Teams)

If you have a larger team:
1. Set up PagerDuty account
2. Add PagerDuty webhook in UptimeRobot
3. Configure escalation policies in PagerDuty

---

## Troubleshooting

### Issue 1: Monitor Shows "Down" But Site Is Up

**Possible Causes:**
- SSL certificate issues
- Firewall blocking UptimeRobot IPs
- Incorrect URL or port

**Solutions:**
- Verify the URL is correct
- Check SSL certificate is valid
- Test the URL manually in a browser
- Check Railway/Vercel logs for errors

### Issue 2: False Alerts

**Possible Causes:**
- Temporary network issues
- Rate limiting
- Maintenance windows

**Solutions:**
- Increase monitoring interval (if on paid plan)
- Use maintenance windows for planned downtime
- Check if your service has rate limiting that blocks UptimeRobot

### Issue 3: No Alerts Received

**Possible Causes:**
- Email in spam folder
- Incorrect alert contact configuration
- SMS not verified

**Solutions:**
- Check spam/junk folder
- Verify alert contacts are enabled for monitors
- Test alert contacts manually
- Check UptimeRobot notification logs

### Issue 4: Slow Response Times

**Possible Causes:**
- Database performance issues
- High server load
- Network latency

**Solutions:**
- Check Railway/Vercel metrics
- Review database query performance
- Optimize API endpoints
- Consider upgrading hosting plan

---

## Monitoring Checklist

After setup, verify:

- [ ] Frontend monitor is **Up** ✅
- [ ] API health monitor is **Up** ✅
- [ ] Response times are acceptable (< 2s for frontend, < 1s for API)
- [ ] Email alerts are configured and tested
- [ ] SMS alerts are configured (optional)
- [ ] Status page is created and accessible (optional)
- [ ] Mobile app is installed and notifications enabled (optional)
- [ ] Team members have access (if using status page)

---

## Cost Summary

**UptimeRobot Free Tier:**
- ✅ 50 monitors
- ✅ 5-minute intervals
- ✅ Email alerts
- ✅ SMS alerts (limited)
- ✅ Status pages
- ✅ Mobile app
- **Cost: $0/month**

**Upgrade to Paid (if needed):**
- More monitors (unlimited)
- 1-minute intervals
- More SMS alerts
- Advanced features
- **Cost: $7-49/month** (depending on plan)

For MVP, the free tier is more than sufficient!

---

## Next Steps

After setting up monitoring:

1. ✅ **Set up email service** (Resend) - See email configuration docs
2. ✅ **Configure backups** - See Supabase backup documentation
3. ✅ **Set up error tracking** (optional) - Consider Sentry or similar
4. ✅ **Set up analytics** (optional) - Google Analytics or similar
5. ✅ **Document incident response** - Create a runbook for common issues

---

## Resources

- **UptimeRobot Documentation**: https://uptimerobot.com/api/
- **UptimeRobot Status Page Examples**: https://status.uptimerobot.com/
- **UptimeRobot API** (for advanced integrations): https://uptimerobot.com/api/

---

*Last updated: December 2024*

