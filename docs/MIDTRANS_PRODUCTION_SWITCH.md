# Switching Midtrans from Sandbox to Production

This guide walks you through switching your Midtrans integration from Sandbox (testing) to Production (live payments).

## Prerequisites

Before switching to production, ensure:

- ✅ Your Midtrans account has been **approved for production** (usually takes 1-3 business days)
- ✅ You have completed all required verification documents
- ✅ You have tested the payment flow thoroughly in sandbox
- ✅ Your production backend is deployed with HTTPS enabled
- ✅ Your production webhook URL is accessible

---

## Step 1: Get Production API Keys from Midtrans

1. **Login to Midtrans Production Dashboard**
   - Go to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
   - Login with your credentials

2. **Navigate to Settings → Access Keys**
   - Click **"Settings"** in the left sidebar
   - Select **"Access Keys"**

3. **Copy Production Credentials**
   - **Server Key**: Copy the Production Server Key (starts with `Mid-server-...`)
   - **Client Key**: Copy the Production Client Key (starts with `Mid-client-...`)
   - ⚠️ **Important**: These are different from your sandbox keys!
   - Save these securely - you'll need them in the next step

---

## Step 2: Update Backend Environment Variables (Railway)

1. **Go to Railway Dashboard**
   - Navigate to [https://railway.app](https://railway.app)
   - Select your backend service

2. **Update Environment Variables**
   - Go to **"Variables"** tab
   - Update or add the following variables:

   ```env
   MIDTRANS_SERVER_KEY=Mid-server-YOUR-PRODUCTION-SERVER-KEY
   MIDTRANS_CLIENT_KEY=Mid-client-YOUR-PRODUCTION-CLIENT-KEY
   MIDTRANS_IS_PRODUCTION=true
   ```

3. **Important Notes:**
   - ✅ **MIDTRANS_IS_PRODUCTION** must be set to `true` (not `"true"` or `1`)
   - ✅ Remove any quotes around the keys
   - ✅ Ensure no leading/trailing whitespace
   - ✅ Production Server Key starts with `Mid-server-` (NOT `SB-Mid-server-`)
   - ✅ Production Client Key starts with `Mid-client-` (NOT `SB-Mid-client-`)

4. **Optional: Set Webhook Secret**
   - If you want to use a custom webhook secret:
   ```env
   MIDTRANS_WEBHOOK_SECRET=your-secure-random-secret-here
   ```
   - Generate a secure random string (minimum 32 characters recommended)
   - This adds an extra layer of security for webhook verification

5. **Save Changes**
   - Railway will automatically redeploy your service when you save
   - Wait for the deployment to complete (usually 1-2 minutes)

---

## Step 3: Configure Production Webhook URL

1. **Get Your Production Backend URL**
   - From Railway Dashboard → Your Service → Settings → Domains
   - Use either:
     - **Railway Domain**: `https://your-service-name.up.railway.app`
     - **Custom Domain**: `https://api.yourdomain.com`

2. **Configure Webhook in Midtrans Dashboard**
   - Go to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
   - Navigate to **Settings → Configuration**
   - Find **"Payment Notification URL"** section
   - Enter your webhook URL:
     ```
     https://your-backend-domain.com/api/subscriptions/webhook/midtrans
     ```
   - Example:
     ```
     https://your-service-name.up.railway.app/api/subscriptions/webhook/midtrans
     ```
   - Click **"Save"**

3. **Test Webhook URL**
   - Midtrans dashboard has a **"Test Notification URL"** button
   - Click it to verify your endpoint is accessible
   - Should return 200 OK

---

## Step 4: Verify Configuration

1. **Check Backend Logs**
   - Go to Railway → Your Service → Deployments → Logs
   - Look for payment service initialization:
     ```
     Payment service initialized with Midtrans - API URL: https://app.midtrans.com/snap/v1, Production: true
     ```
   - ✅ Should show `Production: true`
   - ✅ API URL should be `https://app.midtrans.com/snap/v1` (not sandbox URL)

2. **Use Diagnostic Endpoint (Admin Only)**
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     https://your-backend-domain.com/api/subscriptions/payment-status
   ```
   
   Expected response should show:
   ```json
   {
     "success": true,
     "data": {
       "isProduction": true,
       "apiUrl": "https://app.midtrans.com/snap/v1",
       "hasServerKey": true,
       "serverKeyPrefix": "Mid-server-...",
       "keyLength": 40-50
     }
   }
   ```

---

## Step 5: Test Production Payment (Small Amount First!)

1. **Make a Test Payment**
   - Login to your production application
   - Navigate to Profile page
   - Request a subscription upgrade
   - Select a payment method
   - Complete the payment with a **real card** (start with a small amount!)

2. **Verify Payment Flow**
   - ✅ Payment redirects to Midtrans production payment page
   - ✅ You can complete payment with real payment method
   - ✅ After payment, redirects back to your application
   - ✅ Subscription is activated correctly

3. **Check Webhook Processing**
   - Go to Midtrans Dashboard → Transactions
   - Find your test transaction
   - Check if webhook notification was sent successfully
   - Check Railway logs for webhook processing:
     ```
     Received Midtrans webhook for order: SUB-xxx
     Payment status: settlement
     ```

---

## Step 6: Monitor and Verify

1. **Monitor Transactions**
   - Regularly check Midtrans Dashboard → Transactions
   - Monitor Railway logs for any errors
   - Set up alerts for failed payments

2. **Verify Subscription Activation**
   - Check that subscriptions are being activated correctly
   - Verify subscription status in your database
   - Test subscription expiration handling

---

## Troubleshooting

### Issue: Still getting 401 Unauthorized errors

**Solution:**
1. Verify `MIDTRANS_IS_PRODUCTION=true` is set correctly (must be `true`, not `"true"`)
2. Ensure you're using Production Server Key (starts with `Mid-server-`)
3. Check Railway logs for key prefix and length
4. Redeploy service after updating variables

### Issue: Webhook not receiving notifications

**Solution:**
1. Verify webhook URL is correct and publicly accessible
2. Ensure webhook URL uses HTTPS (required in production)
3. Check Railway logs for incoming webhook requests
4. Verify webhook endpoint returns 200 OK

### Issue: Payment page shows sandbox instead of production

**Solution:**
1. Verify `MIDTRANS_IS_PRODUCTION=true` in Railway
2. Clear browser cache and cookies
3. Redeploy backend service
4. Check backend logs for API URL (should be production URL)

---

## Important Notes

- ⚠️ **Production keys are different from sandbox keys** - make sure you're using the correct ones
- ⚠️ **Test with small amounts first** before processing real customer payments
- ⚠️ **Webhook URL must use HTTPS** in production (no HTTP allowed)
- ⚠️ **Never commit production keys** to version control
- ⚠️ **Keep production keys secure** - treat them like passwords

---

## Rollback Plan (If Needed)

If you need to rollback to sandbox:

1. **Update Railway Variables:**
   ```env
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR-SANDBOX-KEY
   MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR-SANDBOX-KEY
   MIDTRANS_IS_PRODUCTION=false
   ```

2. **Redeploy Service**
   - Railway will automatically redeploy
   - Wait for deployment to complete

3. **Verify Rollback**
   - Check logs for `Production: false`
   - API URL should be sandbox URL

---

## Next Steps

After successfully switching to production:

1. ✅ Monitor first few transactions closely
2. ✅ Set up error alerts and monitoring
3. ✅ Document any production-specific configurations
4. ✅ Update team on production payment flow
5. ✅ Regularly review Midtrans dashboard for transaction health
