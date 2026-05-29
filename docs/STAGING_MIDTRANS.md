# Staging — Midtrans sandbox

Use this guide to test subscription checkout on a **staging** environment before enabling production payments.

## 1. Create sandbox credentials

1. Sign in to [Midtrans Dashboard](https://dashboard.midtrans.com/).
2. Switch to **Sandbox** mode (top-left environment toggle).
3. Open **Settings → Access Keys**.
4. Copy **Server Key** and **Client Key**.

## 2. Backend environment

Add to `backend/.env` (or your staging secrets manager):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_WEBHOOK_SECRET=your-random-webhook-secret-min-32-chars
MIDTRANS_FEE_PERCENTAGE=2.5
```

Restart the backend after changing env vars:

```bash
docker compose up -d --build backend
```

## 3. Frontend environment

Add to `frontend/.env.local` (staging):

```env
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
```

Rebuild the frontend container or run `npm run build` so Next.js picks up public env vars.

## 4. Webhook URL (staging)

In Midtrans Sandbox → **Settings → Configuration → Payment Notification URL**:

```text
https://api-staging.gradion.id/api/subscriptions/webhook
```

(Replace with your staging API hostname.)

The backend validates notifications using `MIDTRANS_WEBHOOK_SECRET` when configured.

## 5. Test cards (sandbox)

| Scenario | Card number | CVV | Exp |
|----------|-------------|-----|-----|
| Success | `4811 1111 1111 1114` | `123` | any future |
| Deny | `4911 1111 1111 1113` | `123` | any future |

Use OTP `112233` when prompted in sandbox 3DS flows.

## 6. Verify end-to-end

1. Log in as a parent on staging.
2. Open subscription / checkout flow.
3. Complete payment with a sandbox success card.
4. Confirm:
   - Midtrans dashboard shows **settlement** (sandbox).
   - Backend logs show webhook received.
   - User subscription status updates in the app (`GET /api/subscriptions/me`).

## 7. Local Docker note

Local `docker-compose.yml` does **not** include Midtrans keys by default. Without the variables above, checkout endpoints return configuration errors — this is expected. Use staging for payment QA.

## References

- Midtrans sandbox docs: https://docs.midtrans.com/docs/sandbox
- Backend env schema: `backend/src/config/env.ts`
- Railway template: `backend/railway.env.template`
