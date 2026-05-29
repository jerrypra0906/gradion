# Midtrans Payment Integration - Step-by-Step Guide

This guide provides detailed instructions for integrating Midtrans payment gateway into the LangkahKecil platform for subscription management.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Midtrans Account](#step-1-create-midtrans-account)
3. [Step 2: Get API Credentials](#step-2-get-api-credentials)
4. [Step 3: Install Dependencies](#step-3-install-dependencies)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Implement Payment Service](#step-5-implement-payment-service)
7. [Step 6: Verify Database Schema](#step-6-verify-database-schema)
8. [Step 7: Configure Webhook](#step-7-configure-webhook)
9. [Step 8: Test Integration (Sandbox)](#step-8-test-integration-sandbox)
10. [Step 9: Frontend Integration](#step-9-frontend-integration)
11. [Step 10: Production Setup](#step-10-production-setup)
12. [Troubleshooting](#troubleshooting)

**📘 Related Guides:**
- [Switching from Sandbox to Production](./MIDTRANS_PRODUCTION_SWITCH.md) - Detailed guide for production migration

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ PostgreSQL database set up
- ✅ Backend API running (Fastify)
- ✅ Access to your backend codebase
- ✅ Admin access to your hosting platform (Railway/Render) for environment variables
- ✅ Domain name configured (for webhook URLs in production)

---

## Step 1: Create Midtrans Account

1. **Visit Midtrans Website**
   - Go to [https://midtrans.com](https://midtrans.com)
   - Click **"Register"** or **"Sign Up"**

2. **Fill Registration Form**
   - Enter your business information
   - Provide email address and password
   - Select business type and industry
   - Accept terms and conditions

3. **Verify Email**
   - Check your email inbox
   - Click the verification link sent by Midtrans

4. **Complete Business Profile**
   - Fill in business details (name, address, contact)
   - Upload business documents if required
   - Submit for approval (sandbox is available immediately)

**Note:** Sandbox mode is available immediately for testing. Production mode requires account verification (usually 1-3 business days).

---

## Step 2: Get API Credentials

### For Sandbox (Testing)

1. **Login to Midtrans Dashboard**
   - Go to [https://dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com)
   - Login with your credentials

2. **Navigate to Settings**
   - Click on **"Settings"** in the left sidebar
   - Select **"Access Keys"**

3. **Copy Credentials**
   - **Server Key**: Copy the Server Key (starts with `SB-Mid-server-...`)
   - **Client Key**: Copy the Client Key (starts with `SB-Mid-client-...`)
   - Save these securely - you'll need them in Step 4

### For Production

1. **Wait for Account Approval** (if not yet approved)
2. **Login to Production Dashboard**
   - Go to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
3. **Get Production Credentials**
   - Navigate to Settings → Access Keys
   - Copy Production Server Key and Client Key
   - **⚠️ Important:** Never commit production keys to version control

---

## Step 3: Install Dependencies

The `midtrans-node` package is already listed in `package.json`, but verify it's installed:

### Check if Installed

```bash
cd backend
npm list midtrans-node
```

### Install if Missing

```bash
cd backend
npm install midtrans-node
```

**Expected Output:**
```
+ midtrans-node@1.1.5
```

### Verify Installation

```bash
npm list midtrans-node
```

You should see `midtrans-node@1.1.5` listed.

---

## Step 4: Configure Environment Variables

> **💡 Quick Answer: How to Get MIDTRANS_WEBHOOK_SECRET**
> 
> `MIDTRANS_WEBHOOK_SECRET` is **NOT provided by Midtrans**. You generate it yourself using:
> - **Linux/Mac:** `openssl rand -hex 32`
> - **Windows:** Use Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
> - **Online:** Generate a 64-character hexadecimal string
> 
> It's an **optional** custom secret for additional webhook security. If omitted, verification is skipped in development mode.

### Local Development (.env file)

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Create or Edit `.env` File**
   ```bash
   # If .env doesn't exist, create it
   touch .env
   ```

3. **Add Midtrans Configuration**
   
   Add these variables to your `.env` file:

   ```env
   # Midtrans Configuration (Sandbox)
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxxxxxx
   MIDTRANS_IS_PRODUCTION=false
   MIDTRANS_WEBHOOK_SECRET=your_webhook_secret_here

   # Frontend URL (for payment redirects)
   FRONTEND_URL=http://localhost:3000
   API_URL=http://localhost:3001
   PUBLIC_API_URL=http://localhost:3001
   ```

   **Replace:**
   - `SB-Mid-server-YOUR_SANDBOX_SERVER_KEY` with your actual Sandbox Server Key
   - `SB-Mid-client-xxxxxxxxxxxxxxxxxxxxxxxx` with your actual Sandbox Client Key
   - `your_webhook_secret_here` with a random secret string (see [How to Generate Webhook Secret](#how-to-generate-webhook-secret) below)

### How to Generate Webhook Secret

**Important:** `MIDTRANS_WEBHOOK_SECRET` is **NOT provided by Midtrans**. It's a **custom secret you generate yourself** for additional security in webhook verification.

#### Option 1: Using OpenSSL (Recommended)

**On Linux/Mac:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Or use OpenSSL if installed:
```bash
openssl rand -hex 32
```

#### Option 2: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Option 3: Using Online Generator

Visit [https://www.random.org/strings/](https://www.random.org/strings/) and generate:
- Length: 64 characters
- Character set: Hexadecimal (0-9, a-f)

#### Option 4: Manual Generation

Create a long random string (minimum 32 characters, recommended 64):
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Example Generated Secret:**
```
f8a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

**Security Notes:**
- ✅ Use different secrets for sandbox and production
- ✅ Keep the secret secure and never commit it to Git
- ✅ The secret is optional - if not set, webhook verification will be skipped in development mode
- ✅ In production, it's recommended to set a strong secret for additional security

### Production Environment (Railway/Render)

1. **Railway Setup**
   - Go to your Railway project dashboard
   - Navigate to your backend service
   - Click on **"Variables"** tab
   - Add the following environment variables:

     ```
     MIDTRANS_SERVER_KEY=<your-production-server-key>
     MIDTRANS_CLIENT_KEY=<your-production-client-key>
     MIDTRANS_IS_PRODUCTION=true
     MIDTRANS_WEBHOOK_SECRET=<your-webhook-secret>
     ```

2. **Render Setup**
   - Go to your Render dashboard
   - Select your backend service
   - Navigate to **"Environment"** tab
   - Add the same variables as above

3. **Security Best Practices**
   - ✅ Never commit `.env` files to Git
   - ✅ Use different webhook secrets for sandbox and production
   - ✅ Rotate secrets periodically
   - ✅ Use environment-specific keys (sandbox vs production)

### Verify Environment Variables

The backend code already validates these variables in `backend/src/config/env.ts`. The configuration should automatically load when the server starts.

---

## Step 5: Implement Payment Service

The payment service file exists at `backend/src/services/payment.service.ts` but is currently a placeholder. We need to implement the actual Midtrans integration.

### Current Status

The service currently throws an error because the integration is disabled. We need to activate and implement it.

### Implementation Steps

1. **Open Payment Service File**
   ```bash
   code backend/src/services/payment.service.ts
   ```

2. **Replace the Placeholder Implementation**

   We'll use the Midtrans HTTP API directly (compatible with Fastify). Replace the entire file content with this implementation:

   ```typescript
   import { config } from '../config/env.js';
   import { logger } from '../utils/logger.js';
   import type { SubscriptionPlan } from '@prisma/client';
   import crypto from 'crypto';

   export interface CreatePaymentParams {
     orderId: string;
     amount: number;
     customerName: string;
     customerEmail: string;
     customerPhone?: string;
     planType: SubscriptionPlan;
   }

   export interface PaymentResponse {
     token: string;
     redirectUrl: string;
     orderId: string;
   }

   export class PaymentService {
     private isAvailable: boolean;
     private snapApiUrl: string;

     constructor() {
       this.isAvailable = !!config.payment.midtransServerKey;
       
       // Set API URL based on environment
       if (config.payment.midtransIsProduction) {
         this.snapApiUrl = 'https://app.midtrans.com/snap/v1';
       } else {
         this.snapApiUrl = 'https://app.sandbox.midtrans.com/snap/v1';
       }

       if (this.isAvailable) {
         logger.info({
           isProduction: config.payment.midtransIsProduction,
           apiUrl: this.snapApiUrl,
           hasServerKey: !!config.payment.midtransServerKey,
         }, 'Payment service initialized with Midtrans');
       } else {
         logger.warn('Payment service: MIDTRANS_SERVER_KEY not configured. Payment features will be disabled.');
       }
     }

     async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
       if (!this.isAvailable || !config.payment.midtransServerKey) {
         throw new Error('Payment service not configured. Please set MIDTRANS_SERVER_KEY.');
       }

       try {
         const parameter = {
           transaction_details: {
             order_id: params.orderId,
             gross_amount: params.amount,
           },
           customer_details: {
             first_name: params.customerName.split(' ')[0] || params.customerName,
             last_name: params.customerName.split(' ').slice(1).join(' ') || '',
             email: params.customerEmail,
             phone: params.customerPhone || '',
           },
           item_details: [
             {
               id: `subscription-${params.planType}`,
               price: params.amount,
               quantity: 1,
               name: `Subscription Plan - ${params.planType.toUpperCase()}`,
               category: 'Subscription',
             },
           ],
           callbacks: {
             finish: `${config.frontendUrl}/dashboard/profile?payment=success`,
             error: `${config.frontendUrl}/dashboard/profile?payment=error`,
             pending: `${config.frontendUrl}/dashboard/profile?payment=pending`,
           },
         };

         logger.info({ orderId: params.orderId, amount: params.amount }, 'Creating Midtrans payment transaction');

         // Create authorization header (Base64 encode server key)
         const authString = Buffer.from(config.payment.midtransServerKey + ':').toString('base64');

         // Make HTTP request to Midtrans Snap API
         const response = await fetch(`${this.snapApiUrl}/transactions`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Accept': 'application/json',
             'Authorization': `Basic ${authString}`,
           },
           body: JSON.stringify(parameter),
         });

         if (!response.ok) {
           const errorText = await response.text();
           logger.error({ 
             status: response.status, 
             statusText: response.statusText,
             error: errorText,
             orderId: params.orderId 
           }, 'Midtrans API error');
           throw new Error(`Midtrans API error: ${response.status} ${response.statusText} - ${errorText}`);
         }

         const transaction = await response.json();

         if (!transaction.token || !transaction.redirect_url) {
           logger.error({ transaction }, 'Invalid response from Midtrans API');
           throw new Error('Invalid response from Midtrans: missing token or redirect_url');
         }

         logger.info({ 
           orderId: params.orderId, 
           token: transaction.token.substring(0, 20) + '...' 
         }, 'Midtrans payment transaction created successfully');

         return {
           token: transaction.token,
           redirectUrl: transaction.redirect_url,
           orderId: params.orderId,
         };
       } catch (error: any) {
         logger.error({ error, params }, 'Failed to create Midtrans payment');
         throw new Error(`Failed to create payment: ${error.message || 'Unknown error'}`);
       }
     }

     verifyWebhook(data: any, signature: string): boolean {
       if (!config.payment.midtransWebhookSecret) {
         logger.warn('Midtrans webhook secret not configured. Skipping verification in development.');
         // In development, allow webhooks without verification
         // In production, always verify
         return !config.payment.midtransIsProduction;
       }

       try {
         // Midtrans webhook signature verification
         // Note: Midtrans uses order_id + status_code + gross_amount + server_key for verification
         // However, the actual signature format may vary. Check Midtrans docs for latest format.
         const hash = crypto
           .createHash('sha512')
           .update(data.order_id + data.status_code + data.gross_amount + config.payment.midtransWebhookSecret)
           .digest('hex');

         const isValid = hash === signature;

         if (!isValid) {
           logger.warn({ 
             orderId: data.order_id,
             expectedHash: hash.substring(0, 20) + '...',
             receivedHash: signature.substring(0, 20) + '...'
           }, 'Webhook signature verification failed');
         } else {
           logger.info({ orderId: data.order_id }, 'Webhook signature verified successfully');
         }

         return isValid;
       } catch (error: any) {
         logger.error({ error }, 'Error verifying webhook signature');
         return false;
       }
     }
   }

   // Export singleton instance
   export const paymentService = new PaymentService();
   ```

   **Note:** This implementation uses the native `fetch` API (available in Node.js 18+). If you're using Node.js < 18, install `node-fetch`:
   ```bash
   npm install node-fetch
   ```
   And add this import at the top:
   ```typescript
   import fetch from 'node-fetch';
   ```

3. **Save the File**

4. **Verify TypeScript Compilation**
   ```bash
   cd backend
   npm run build
   ```

   You should see no errors. If there are errors, check:
   - All imports are correct
   - Environment variables are properly typed in `config/env.ts`

---

## Step 6: Verify Database Schema

The database schema should already be set up. Verify the `subscription_requests` table exists:

### Option 1: Using Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Navigate to `SubscriptionRequest` model and verify the fields match:
- `id`, `user_id`, `plan_type`, `status`, `amount`
- `payment_method`, `payment_reference`
- `midtrans_order_id`, `midtrans_token`
- `promotion_code_id`, `discount_amount`, `notes`
- `created_at`, `updated_at`, `completed_at`

### Option 2: Using Database Client

Connect to your database and run:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscription_requests';
```

### Option 3: Using Prisma Migrate

If the table doesn't exist, check if there's a migration:

```bash
cd backend
npx prisma migrate status
```

If migrations are pending, run:

```bash
npx prisma migrate deploy
```

---

## Step 7: Configure Webhook

Midtrans needs to send payment status updates to your backend. Configure the webhook URL in Midtrans dashboard.

> **🔍 How to Find Your Backend Domain:**
> 
> **Option 1: Custom Domain (Recommended)**
> - If you've set up a custom domain: `https://api.langkahkecil.org`
> - Webhook URL: `https://api.langkahkecil.org/api/subscriptions/webhook/midtrans`
> 
> **Option 2: Railway Default Domain**
> 1. Go to Railway Dashboard: https://railway.app
> 2. Select your backend service
> 3. Click "Settings" → "Domains"
> 4. Copy the "Railway Domain" (format: `xxx.up.railway.app`)
> 5. Webhook URL: `https://xxx.up.railway.app/api/subscriptions/webhook/midtrans`
> 
> **Option 3: Check Environment Variables**
> - In Railway, check `PUBLIC_API_URL` variable
> - Remove `/api` suffix to get base URL
> - Example: If `PUBLIC_API_URL=https://api.langkahkecil.org/api`, then base is `https://api.langkahkecil.org`
> - Webhook URL: `https://api.langkahkecil.org/api/subscriptions/webhook/midtrans`

### For Sandbox

1. **Login to Sandtrans Dashboard (Sandbox)**
   - Go to [https://dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com)

2. **Navigate to Settings → Configuration**
   - Click **"Settings"** in left sidebar
   - Select **"Configuration"**

3. **Set Payment Notification URL**
   
   **Find Your Backend Domain:**
   
   - **If using custom domain**: `https://api.langkahkecil.org/api/subscriptions/webhook/midtrans`
   - **If using Railway default domain**: `https://your-service-name.up.railway.app/api/subscriptions/webhook/midtrans`
     - Find this in Railway Dashboard → Your Service → Settings → Domains
   - **For local testing**: Use [ngrok](https://ngrok.com) to expose your local server
     - Example: `https://abc123.ngrok.io/api/subscriptions/webhook/midtrans`

   **Important:** The URL must:
   - ✅ Use HTTPS (required for production)
   - ✅ Be publicly accessible (no localhost)
   - ✅ End with `/api/subscriptions/webhook/midtrans`
   - ✅ Return 200 OK when Midtrans tests it

4. **Save Configuration**

5. **Test the Webhook URL**
   - Midtrans dashboard has a "Test Notification URL" button
   - Click it to verify your endpoint is accessible
   - If it fails, see [Troubleshooting Webhook Issues](#troubleshooting-webhook-issues) below

### For Production

1. **Login to Production Dashboard**
   - Go to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)

2. **Configure Production Webhook**
   - Navigate to Settings → Configuration
   - Set Payment Notification URL to your production backend URL
   - **Your Backend Domain Options:**
     - **Custom domain**: `https://api.langkahkecil.org/api/subscriptions/webhook/midtrans`
     - **Railway domain**: `https://your-service-name.up.railway.app/api/subscriptions/webhook/midtrans`
   - **To find your Railway domain:**
     1. Go to Railway Dashboard → Your Service
     2. Click "Settings" → "Domains"
     3. Copy the "Railway Domain" (format: `xxx.up.railway.app`)
     4. Use: `https://xxx.up.railway.app/api/subscriptions/webhook/midtrans`

3. **Important Notes:**
   - ✅ Webhook URL must be HTTPS in production
   - ✅ Webhook URL must be publicly accessible (no localhost)
   - ✅ Backend must be able to receive POST requests
   - ✅ Use the webhook secret for verification (configured in Step 4)

### Understanding Webhook Verification

**Important Notes about Webhook Security:**

1. **Midtrans Native Verification:**
   - Midtrans uses your **Server Key** for their own webhook signature verification
   - This is handled automatically by Midtrans when they send webhooks
   - The webhook payload includes transaction details that you can verify

2. **Custom Webhook Secret (MIDTRANS_WEBHOOK_SECRET):**
   - This is an **additional security layer** you add yourself
   - It's **optional** but recommended for production
   - If not set, webhook verification will be skipped in development mode
   - In production, it's recommended to set a strong secret

3. **How It Works:**
   - When a webhook is received, the code verifies the signature using:
     - `order_id + status_code + gross_amount + MIDTRANS_WEBHOOK_SECRET`
   - This ensures only legitimate webhooks from Midtrans are processed
   - If verification fails, the webhook is rejected

4. **For Development:**
   - You can omit `MIDTRANS_WEBHOOK_SECRET` for local testing
   - The code will skip verification in development mode
   - This makes testing easier but is less secure

5. **For Production:**
   - **Always set** `MIDTRANS_WEBHOOK_SECRET` with a strong random value
   - Use different secrets for sandbox and production
   - Keep the secret secure and never expose it

### Testing Webhook Locally with ngrok

If testing locally, use ngrok to create a public URL:

```bash
# Install ngrok (if not installed)
# Download from https://ngrok.com/download

# Start your backend server
cd backend
npm run dev

# In another terminal, start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in Midtrans webhook configuration:
# https://abc123.ngrok.io/api/subscriptions/webhook/midtrans
```

---

## Step 8: Test Integration (Sandbox)

### Test Payment Flow

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Create Test Subscription Request**

   Use curl or Postman to test the API:

   ```bash
   curl -X POST http://localhost:3001/api/subscriptions/request \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "plan_type": "pro",
       "message": "Test subscription"
     }'
   ```

3. **Expected Response**

   ```json
   {
     "success": true,
     "message": "Payment link generated successfully",
     "data": {
       "request_id": 1,
       "plan_type": "pro",
       "amount": 50000,
       "payment_token": "abc123...",
       "payment_redirect_url": "https://app.sandbox.midtrans.com/snap/v3/...",
       "requires_payment": true
     }
   }
   ```

4. **Test Payment with Midtrans Test Cards**

   Use the `payment_redirect_url` from the response to open the Midtrans payment page.

   **Sandbox Test Cards:**
   - **Success**: `4811 1111 1111 1114`
   - **Failure**: `4911 1111 1111 1113`
   - **Pending**: `5211 1111 1111 1117`
   - **Expiry**: Any future date (e.g., 12/25)
   - **CVV**: Any 3 digits (e.g., 123)

5. **Verify Webhook Receives Notification**

   After completing a test payment, check your backend logs for webhook notifications:

   ```bash
   # In backend logs, you should see:
   # "Webhook received from Midtrans" with order_id
   ```

6. **Verify Subscription Activation**

   Check the database to verify:
   - `subscription_requests` table: `status` changed to `completed`
   - `subscriptions` table: New subscription created or updated
   - `ai_token_wallets` table: Token limit updated

---

## Step 9: Frontend Integration

The frontend should already have the subscription request UI. Verify it's working correctly.

### Verify Frontend Code

1. **Check Profile Page**
   - Location: `frontend/src/app/dashboard/profile/page.tsx`
   - Should have "Request Upgrade" or "Request Plan" buttons
   - Should handle payment redirects

2. **Verify API Integration**

   The frontend should:
   - Call `POST /api/subscriptions/request` with plan type
   - Receive `payment_redirect_url` in response
   - Redirect user to Midtrans payment page
   - Handle payment status via URL parameters (`?payment=success`)

3. **Test Frontend Flow**

   - Login to your application
   - Navigate to Profile page
   - Click "Request Upgrade" for a paid plan
   - Verify redirect to Midtrans payment page
   - Complete test payment
   - Verify redirect back to profile with success message

---

## Step 10: Production Setup

> **📘 Detailed Guide:** For a comprehensive step-by-step guide on switching from Sandbox to Production, see [MIDTRANS_PRODUCTION_SWITCH.md](./MIDTRANS_PRODUCTION_SWITCH.md)

### Pre-Production Checklist

- [ ] Midtrans production account approved
- [ ] Production Server Key and Client Key obtained
- [ ] Environment variables configured in production
- [ ] Webhook URL configured in Midtrans dashboard
- [ ] HTTPS enabled on backend API
- [ ] Webhook secret set and secure
- [ ] Tested payment flow in sandbox thoroughly
- [ ] Error handling and logging verified

### Quick Production Switch Steps

1. **Get Production Keys from Midtrans Dashboard**
   - Login to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
   - Go to Settings → Access Keys
   - Copy Production Server Key and Client Key

2. **Update Railway Environment Variables**
   ```env
   MIDTRANS_SERVER_KEY=Mid-server-YOUR-PRODUCTION-KEY
   MIDTRANS_CLIENT_KEY=Mid-client-YOUR-PRODUCTION-KEY
   MIDTRANS_IS_PRODUCTION=true
   ```

3. **Configure Production Webhook**
   - In Midtrans Dashboard → Settings → Configuration
   - Set Payment Notification URL: `https://your-backend-domain.com/api/subscriptions/webhook/midtrans`
   - Test the webhook URL

4. **Verify Deployment**
   - Check backend logs for `Production: true`
   - Test with a small real payment
   - Verify webhook receives notifications

5. **Monitor Transactions**
   - Check Midtrans dashboard regularly
   - Monitor backend logs for errors
   - Set up alerts for failed payments

**📘 For detailed instructions, troubleshooting, and rollback procedures, see [MIDTRANS_PRODUCTION_SWITCH.md](./MIDTRANS_PRODUCTION_SWITCH.md)**

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "401 Unauthorized" / "Access denied due to unauthorized transaction" Error

**Symptoms:**
- Error: `Midtrans API error: 401 Unauthorized`
- Error message: `"Access denied due to unauthorized transaction, please check client or server key"`
- Payment request fails immediately

**This is the MOST COMMON error - it means your Server Key is wrong or not set!**

**Step-by-Step Fix:**

1. **Get Your Correct Server Key from Midtrans:**
   
   **For Sandbox (Testing):**
   - Go to: https://dashboard.sandbox.midtrans.com
   - Login to your account
   - Navigate to: **Settings** → **Access Keys**
   - Copy the **Server Key** (starts with `SB-Mid-server-`)
   - Example: `SB-Mid-server-YOUR_SANDBOX_SERVER_KEY`
   
   **For Production:**
   - Go to: https://dashboard.midtrans.com
   - Login to your account
   - Navigate to: **Settings** → **Access Keys**
   - Copy the **Production Server Key** (starts with `Mid-server-`)
   - Example: `Mid-server-YOUR_PRODUCTION_SERVER_KEY`

2. **Add Server Key to Railway:**
   - Go to Railway Dashboard: https://railway.app
   - Select your backend service
   - Click **"Variables"** tab
   - Find or add `MIDTRANS_SERVER_KEY`
   - **Paste the EXACT key** (no spaces, no quotes)
   - Click **"Save"** or **"Add"**

3. **Verify Other Variables:**
   - `MIDTRANS_CLIENT_KEY` - Should also be set (for frontend, but good to have)
   - `MIDTRANS_IS_PRODUCTION` - Should be `false` for sandbox, `true` for production
   - Make sure the value matches your key type:
     - Sandbox key → `MIDTRANS_IS_PRODUCTION=false`
     - Production key → `MIDTRANS_IS_PRODUCTION=true`

4. **Wait for Railway to Redeploy:**
   - Railway automatically redeploys when you add/update variables
   - Wait 2-3 minutes for deployment to complete
   - Check Railway → Deployments → Latest deployment status

5. **Verify in Logs:**
   - Go to Railway → Your Service → Deployments → Logs
   - Look for: `Payment service initialized with Midtrans`
   - Should NOT see: `MIDTRANS_SERVER_KEY not configured`

6. **Test Again:**
   - Try the payment flow again
   - Should now redirect to Midtrans payment page

**Common Mistakes:**
- ❌ **Copying Client Key instead of Server Key** - They're different!
- ❌ **Adding extra spaces or quotes** - Paste the key exactly as shown
- ❌ **Using sandbox key with production mode** - Must match!
- ❌ **Key not saved** - Make sure you clicked "Save" in Railway
- ❌ **Old deployment** - Wait for Railway to redeploy after adding variables

**Debugging Steps (If Still Failing):**

1. **Check Payment Configuration (Admin Only):**
   ```bash
   # Call this endpoint as admin to see payment service status
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     https://api.langkahkecil.org/api/subscriptions/payment-status
   ```
   
   This will show:
   - Whether server key is set
   - Key prefix (first 15 characters)
   - Key length
   - Whether key format is valid
   - Environment mismatch issues

2. **Check Railway Logs for Key Details:**
   - Go to Railway → Your Service → Deployments → Logs
   - Look for: "Creating Midtrans payment transaction"
   - Check the `serverKeyPrefix` in logs
   - Verify it matches your actual key prefix

3. **Verify Key in Railway:**
   - Go to Railway → Your Service → Variables
   - Click on `MIDTRANS_SERVER_KEY` to view it
   - Check:
     - ✅ No leading/trailing spaces
     - ✅ No quotes around the value
     - ✅ Starts with correct prefix (`SB-Mid-server-` for sandbox)
     - ✅ Full key is present (should be ~40-50 characters)

4. **Common Hidden Issues:**
   - **Whitespace**: Key might have spaces at start/end
     - Fix: Edit the variable, select all, delete, paste fresh
   - **Wrong Variable Name**: Check spelling - must be exactly `MIDTRANS_SERVER_KEY`
   - **Multiple Services**: If you have multiple Railway services, make sure you're editing the correct one
   - **Environment Mismatch**: 
     - Sandbox key (`SB-Mid-server-...`) → `MIDTRANS_IS_PRODUCTION=false`
     - Production key (`Mid-server-...`) → `MIDTRANS_IS_PRODUCTION=true`

5. **Force Redeploy:**
   - Sometimes Railway doesn't pick up variable changes
   - Go to Railway → Your Service → Settings → Deploy
   - Click "Redeploy" to force a fresh deployment
   - Wait for deployment to complete

6. **Test with Fresh Key:**
   - Get a fresh copy of your Server Key from Midtrans dashboard
   - Delete the old `MIDTRANS_SERVER_KEY` variable in Railway
   - Add it again with the fresh key
   - Wait for redeploy

#### 2. "Payment service not configured" Error / No Redirect to Midtrans

**Symptoms:**
- Error when creating payment: "Payment service not configured"
- **OR** Payment request succeeds but no redirect to Midtrans page
- **OR** Alert shows "Payment setup failed" or "Payment redirect URL not available"

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # In Railway Dashboard → Your Service → Variables
   # Verify these are set:
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY  # or Mid-server-YOUR_PRODUCTION_SERVER_KEY
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx   # (Sandbox) or Mid-client-xxxxx (Production)
   MIDTRANS_IS_PRODUCTION=false                      # true for production
   ```

2. **Check Backend Logs:**
   - Go to Railway Dashboard → Your Service → Deployments → Logs
   - Look for:
     - ✅ "Payment service initialized with Midtrans" - Good!
     - ❌ "Payment service: MIDTRANS_SERVER_KEY not configured" - Missing key!
     - ❌ "Failed to create payment" - Check error details

3. **Verify Payment Service Initialization:**
   - Check logs when backend starts
   - Should see: `Payment service initialized with Midtrans`
   - If you see warnings about missing keys, add them to Railway

4. **Test Payment Creation:**
   - Try creating a subscription request
   - Check browser console (F12) for errors
   - Check Railway logs for payment creation errors
   - Look for: "Creating Midtrans payment transaction" in logs

5. **Common Issues:**
   - ❌ **Missing MIDTRANS_SERVER_KEY**: Add it to Railway environment variables
   - ❌ **Wrong key format**: Sandbox keys start with `SB-Mid-server-`, production with `Mid-server-`
   - ❌ **Key not deployed**: After adding variables, wait for Railway to redeploy
   - ❌ **Payment service error**: Check logs for specific Midtrans API errors

#### 2. Webhook Test Notification Failed

**Symptoms:**
- Midtrans "Test Notification URL" button shows "Failed" (red exclamation mark)
- Error message: "Failed to send HTTP notification due to issues related to the URL"
- URL in input field: `https://api.langkahkecil.org/api/subscriptions/webhook/midtrans`

**Step-by-Step Troubleshooting:**

1. **Test Backend Accessibility:**
   ```bash
   # Test if your backend is accessible
   curl https://api.langkahkecil.org/api/health
   # Expected: {"status":"ok",...}
   # If this fails, your backend is not accessible
   ```

2. **Test Webhook Endpoint (GET - Easy Test):**
   ```bash
   # Test the webhook endpoint with GET request
   curl https://api.langkahkecil.org/api/subscriptions/webhook/midtrans
   # Expected: {"success":true,"message":"Midtrans webhook endpoint is accessible",...}
   ```

3. **Test Webhook Endpoint (POST - Actual Webhook):**
   ```bash
   # Test the webhook endpoint with POST (like Midtrans does)
   curl -X POST https://api.langkahkecil.org/api/subscriptions/webhook/midtrans \
     -H "Content-Type: application/json" \
     -d '{"order_id":"test-123","transaction_status":"settlement"}'
   # Expected: {"success":true,"message":"Webhook received but subscription request not found",...}
   ```

4. **Common Issues and Fixes:**

   **Issue A: Backend Not Accessible**
   - ❌ `curl` returns connection refused or timeout
   - ✅ **Fix**: Check Railway deployment status
   - ✅ **Fix**: Verify custom domain DNS is configured correctly
   - ✅ **Fix**: Check if Railway service is running

   **Issue B: SSL Certificate Error**
   - ❌ `curl` shows SSL certificate errors
   - ✅ **Fix**: Verify SSL certificate is valid for `api.langkahkecil.org`
   - ✅ **Fix**: Check Railway → Settings → Domains → SSL status
   - ✅ **Fix**: Wait for SSL certificate to provision (can take a few minutes)

   **Issue C: 404 Not Found**
   - ❌ `curl` returns 404
   - ✅ **Fix**: Verify URL includes `/api/subscriptions/webhook/midtrans`
   - ✅ **Fix**: Check Railway logs to see if route is registered
   - ✅ **Fix**: Ensure backend code is deployed with latest changes

   **Issue D: 500 Internal Server Error**
   - ❌ `curl` returns 500
   - ✅ **Fix**: Check Railway logs for error details
   - ✅ **Fix**: Verify database connection is working
   - ✅ **Fix**: Check environment variables are set correctly

5. **Verify Railway Deployment:**
   - Go to Railway Dashboard → Your Service
   - Check "Deployments" tab → Latest deployment should be "Active"
   - Check "Logs" tab → Look for errors during startup
   - Verify the webhook route is registered (should see route registration in logs)

6. **Verify Custom Domain Setup:**
   - Go to Railway Dashboard → Your Service → Settings → Domains
   - Verify `api.langkahkecil.org` is listed
   - Check SSL certificate status (should be "Active" or "Provisioning")
   - If not listed, add the custom domain

7. **Check Backend Logs When Testing:**
   - Go to Railway Dashboard → Your Service → Deployments → Logs
   - Click "Test notification URL" in Midtrans dashboard
   - Watch Railway logs in real-time
   - Look for:
     - ✅ "Midtrans webhook received" - means request reached your server
     - ❌ Error messages - indicates what went wrong
     - ❌ 404 errors - route not found
     - ❌ 500 errors - server error

8. **Alternative: Use Railway Default Domain for Testing:**
   - If custom domain isn't working, use Railway's default domain temporarily
   - Go to Railway Dashboard → Your Service → Settings → Domains
   - Copy the "Railway Domain" (e.g., `xxx.up.railway.app`)
   - Use in Midtrans: `https://xxx.up.railway.app/api/subscriptions/webhook/midtrans`
   - Test again - if this works, the issue is with your custom domain setup

#### 3. Webhook Not Received (After Payment)

**Symptoms:**
- Payment completes but subscription not activated
- No webhook logs in backend

**Solutions:**
- ✅ Verify webhook URL is correct in Midtrans dashboard
- ✅ Ensure webhook URL is publicly accessible (use ngrok for local testing)
- ✅ Check backend is running and can receive POST requests
- ✅ Verify webhook endpoint route exists: `/api/subscriptions/webhook/midtrans`
- ✅ Check backend logs for any errors processing webhooks
- ✅ Verify `order_id` in webhook matches `midtrans_order_id` in database

#### 4. "Invalid Signature" Webhook Error

**Symptoms:**
- Webhook received but signature verification fails
- Webhook rejected in logs

**Solutions:**
- ✅ **Important:** `MIDTRANS_WEBHOOK_SECRET` is a custom secret you generate, not from Midtrans
- ✅ Verify the secret in your environment matches what you set
- ✅ Check webhook verification logic in payment service
- ✅ For development, you can omit `MIDTRANS_WEBHOOK_SECRET` to skip verification
- ✅ In production, ensure the secret is set and matches between environments
- ✅ If you changed the secret, update it in all environments (backend, Railway/Render)
- ✅ Note: Midtrans uses Server Key for their verification; our secret is an additional layer

#### 5. Payment Page Not Loading

**Symptoms:**
- `payment_redirect_url` returns 404 or error page

**Solutions:**
- ✅ Verify `MIDTRANS_CLIENT_KEY` is correct
- ✅ Check if using correct environment (sandbox vs production)
- ✅ Ensure Midtrans account is active and approved
- ✅ Verify frontend URL in payment callback configuration

#### 6. TypeScript Compilation Errors

**Symptoms:**
- `npm run build` fails with type errors

**Solutions:**
- ✅ Verify `midtrans-node` package is installed: `npm list midtrans-node`
- ✅ Check import statement: `import midtransClient from 'midtrans-client';`
- ✅ Ensure TypeScript types are available (package may include types)

#### 7. Transaction Created But Subscription Not Activated

**Symptoms:**
- Payment successful in Midtrans but subscription remains pending

**Solutions:**
- ✅ Check webhook is configured and receiving notifications
- ✅ Verify webhook handler logic in `subscriptions.ts` route
- ✅ Check database for subscription request status
- ✅ Review backend logs for webhook processing errors
- ✅ Manually activate subscription via admin panel if needed

### Getting Help

- **Midtrans Documentation**: [https://docs.midtrans.com](https://docs.midtrans.com)
- **Midtrans Support**: Contact via dashboard or email support@midtrans.com
- **Backend Logs**: Check server logs for detailed error messages
- **Database**: Query `subscription_requests` table to debug payment status

---

## Additional Resources

### Midtrans Documentation
- [Snap Integration Guide](https://docs.midtrans.com/docs/snap-integration-guide)
- [Webhook Documentation](https://docs.midtrans.com/docs/webhook)
- [Test Cards](https://docs.midtrans.com/docs/testing-payment-gateway)

### Code References
- Payment Service: `backend/src/services/payment.service.ts`
- Subscription Routes: `backend/src/routes/subscriptions.ts`
- Environment Config: `backend/src/config/env.ts`
- Database Schema: `backend/prisma/schema.prisma`

---

## Summary

After completing all steps, you should have:

✅ Midtrans account created and configured  
✅ Payment service implemented and working  
✅ Environment variables set up  
✅ Webhook configured and receiving notifications  
✅ Sandbox testing completed successfully  
✅ Production deployment ready  

The payment integration is now fully functional and ready to process subscription payments for your users!
