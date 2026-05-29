# Payment Integration with Midtrans

## Overview

This document describes the complete payment integration system implemented for subscription management using Midtrans payment gateway.

## Features Implemented

### 1. Database Model for Subscription Requests

- **Table**: `subscription_requests`
- **Fields**:
  - `id`: Primary key
  - `user_id`: Foreign key to users table
  - `plan_type`: Subscription plan (free, pro, premium, therapist)
  - `status`: Request status (pending, processing, completed, cancelled, failed)
  - `amount`: Price in IDR
  - `payment_method`: Payment method used (midtrans, free, manual)
  - `payment_reference`: Transaction ID or reference
  - `midtrans_order_id`: Midtrans order ID
  - `midtrans_token`: Midtrans snap token for frontend
  - `notes`: Optional notes
  - `created_at`, `updated_at`, `completed_at`: Timestamps

### 2. Email Notifications

#### Admin Notifications
- Sent to all admin users when a new subscription request is created
- Includes:
  - Request details (ID, user info, plan, amount, status)
  - Link to review the request in admin panel
  - Formatted HTML email

#### User Notifications
- Sent to users when payment is successful
- Includes:
  - Confirmation of subscription activation
  - Plan details and subscription period
  - Link to profile page

### 3. Midtrans Payment Integration

#### Payment Service (`backend/src/services/payment.service.ts`)
- Creates Midtrans Snap transactions
- Generates payment tokens and redirect URLs
- Verifies webhook signatures
- Handles both production and sandbox environments

#### Configuration
Required environment variables:
- `MIDTRANS_SERVER_KEY`: Midtrans server key
- `MIDTRANS_CLIENT_KEY`: Midtrans client key (for frontend)
- `MIDTRANS_IS_PRODUCTION`: Boolean (false for sandbox, true for production)
- `MIDTRANS_WEBHOOK_SECRET`: Secret for webhook verification

### 4. Payment Flow

#### Request Flow
1. User clicks "Request Upgrade" or "Request Plan" on Profile page
2. Frontend sends POST request to `/api/subscriptions/request`
3. Backend:
   - Creates subscription request record
   - Gets plan configuration and pricing
   - For free plans: Auto-activates subscription immediately
   - For paid plans:
     - Creates Midtrans payment transaction
     - Stores payment token and order ID
     - Sends email notification to admins
     - Returns payment redirect URL to frontend
4. Frontend redirects user to Midtrans payment page

#### Webhook Flow (Payment Confirmation)
1. Midtrans sends webhook to `/api/subscriptions/webhook/midtrans`
2. Backend:
   - Verifies webhook signature
   - Finds subscription request by order ID
   - Updates request status based on payment status:
     - `capture` + `accept`: Activate subscription
     - `settlement`: Activate subscription
     - `pending`: Mark as processing
     - `deny`/`expire`/`cancel`: Mark as failed
3. If payment successful:
   - Activates subscription (creates/updates subscription record)
   - Updates AI token wallet
   - Marks request as completed
   - Sends success email to user

### 5. Auto-Activation

Subscriptions are automatically activated when:
- Free plan is requested (immediate activation)
- Payment is successfully captured or settled (via webhook)
- Admin manually activates (existing functionality)

### 6. Frontend Integration

#### Profile Page Updates
- Displays detailed plan information:
  - Plan name and pricing
  - Subscription period (weeks)
  - Features list (AI access, token limits)
  - Visual distinction between plans
- "Request Upgrade" / "Request Plan" buttons
- Handles payment redirects
- Shows payment status messages

#### Payment Status Handling
- Checks URL parameters for payment status
- Displays appropriate messages:
  - `?payment=success`: Payment successful
  - `?payment=error`: Payment failed
  - `?payment=pending`: Payment pending

## API Endpoints

### POST `/api/subscriptions/request`
Request a subscription plan upgrade.

**Request Body:**
```json
{
  "plan_type": "pro",
  "message": "Optional message"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment link generated...",
  "data": {
    "request_id": 1,
    "plan_type": "pro",
    "amount": 50000,
    "payment_token": "abc123...",
    "payment_redirect_url": "https://app.sandbox.midtrans.com/...",
    "requires_payment": true
  }
}
```

### POST `/api/subscriptions/webhook/midtrans`
Midtrans webhook endpoint for payment notifications.

**Headers:**
- `x-midtrans-signature`: Webhook signature for verification

**Body:**
Midtrans webhook payload (automatically handled)

## Environment Variables

Add to `.env`:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_server_key_here
MIDTRANS_CLIENT_KEY=your_client_key_here
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_WEBHOOK_SECRET=your_webhook_secret_here

# Email Configuration (for notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@langkahkecil.com
RESEND_FROM_NAME=LangkahKecil
```

## Setup Instructions

### 1. Midtrans Account Setup
1. Create account at https://midtrans.com
2. Get Server Key and Client Key from dashboard
3. Configure webhook URL: `https://your-domain.com/api/subscriptions/webhook/midtrans`
4. Set webhook secret in environment variables

### 2. Database Migration
The subscription_requests table is created automatically via SQL script:
```bash
docker-compose exec postgres psql -U langkahkecil_user -d langkahkecil < backend/create_subscription_requests.sql
```

### 3. Testing

#### Sandbox Testing
1. Set `MIDTRANS_IS_PRODUCTION=false`
2. Use sandbox credentials from Midtrans dashboard
3. Test with Midtrans test cards:
   - Success: 4811 1111 1111 1114
   - Failure: 4911 1111 1111 1113

#### Production
1. Set `MIDTRANS_IS_PRODUCTION=true`
2. Use production credentials
3. Ensure webhook URL is publicly accessible
4. Configure SSL certificate

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using signature
2. **HTTPS Required**: Production webhooks must use HTTPS
3. **Token Storage**: Payment tokens are stored securely in database
4. **Admin Notifications**: Only admins receive subscription request notifications
5. **User Privacy**: Payment details are not exposed to frontend

## Error Handling

- Payment creation failures: Request is still created, admin can manually activate
- Webhook failures: Logged for investigation, manual activation available
- Email failures: Non-blocking, logged for monitoring

## Future Enhancements

1. Payment retry mechanism
2. Subscription renewal automation
3. Refund handling
4. Payment history page
5. Invoice generation
6. Multiple payment methods support

