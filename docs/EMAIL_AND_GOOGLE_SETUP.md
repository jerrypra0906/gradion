# Email (Google Workspace SMTP) & Google Sign‑In Setup

This guide covers two setup tasks for Gradion:

1. **Send activation/verification emails from `care@gradion.id`** via Google Workspace SMTP.
2. **Enable "Sign in / Sign up with Google".**

Both require values that only you can create (an app password, an OAuth client). You add the
secrets to `backend/.env` (git‑ignored); nothing secret goes into the repo.

---

## 1. Send email from `care@gradion.id` (Google Workspace SMTP)

The backend now supports SMTP. When `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are set, it sends
via SMTP (Gmail/Workspace); otherwise it falls back to Resend.

### Step 1 — Turn on 2‑Step Verification for `care@gradion.id`
App Passwords require 2‑Step Verification.

1. Sign in as `care@gradion.id`.
2. Go to **https://myaccount.google.com/security** → **2‑Step Verification** → turn it **On**.

> If your Workspace **admin** has disabled 2‑Step Verification or App Passwords for the org, you'll
> need an admin to allow it (Admin console → Security → Authentication), or use OAuth2 instead
> (more involved — ask me if App Passwords are blocked).

### Step 2 — Create an App Password
1. Go to **https://myaccount.google.com/apppasswords** (visible only after 2FA is on).
2. App name: `Gradion`. Click **Create**.
3. Copy the **16‑character** password (shown like `abcd efgh ijkl mnop`). **Remove the spaces** →
   `abcdefghijklmnop`.

### Step 3 — Add the SMTP settings to `backend/.env`
Create/edit `backend/.env` (NOT `.env.example`) and add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=care@gradion.id
SMTP_PASSWORD=abcdefghijklmnop      # the 16-char app password, no spaces
SMTP_FROM_EMAIL=care@gradion.id
RESEND_FROM_NAME=Gradion            # display name shown to recipients
```

(`SMTP_PORT=587` + `SMTP_SECURE=false` uses STARTTLS — recommended for Gmail. For port 465 set
`SMTP_SECURE=true`.)

### Step 4 — Restart the backend
```bash
docker compose up -d backend          # recreate to pick up backend/.env
# (or: docker compose up -d --build backend)
```
On boot the logs will say `Sending email via SMTP` instead of `via Resend`.

### Step 5 — Test
Register a new account in the app. The verification email should arrive from
`Gradion <care@gradion.id>`, and a copy appears in the `care@gradion.id` **Sent** folder.

### Deliverability (recommended for production)
So emails don't land in spam, add these DNS records for `gradion.id` (Workspace provides exact
values in Admin console → Apps → Google Workspace → Gmail → Authenticate email):
- **SPF**: `v=spf1 include:_spf.google.com ~all`
- **DKIM**: enable in the Workspace admin console and publish the generated record.
- **DMARC**: a `_dmarc.gradion.id` TXT record.

### Troubleshooting
- **`Username and Password not accepted`** → 2FA not enabled, wrong/space‑included app password, or
  org policy blocks SMTP/app passwords.
- **Timeouts** → port blocked; try `SMTP_PORT=465` + `SMTP_SECURE=true`.
- **Gmail/Workspace sending limit** ≈ 2,000 recipients/day — fine for activation emails.

---

## 2. Enable Google Sign‑In / Sign‑Up

When configured, clicking **"Sign in with Google"** creates the account automatically as a
**parent** with the email already **verified** (no activation email needed), or links Google to an
existing account with the same email.

### Step 1 — Create a Google Cloud project
1. Go to **https://console.cloud.google.com/** → create a project (e.g. `Gradion`).

### Step 2 — Configure the OAuth consent screen
1. **APIs & Services → OAuth consent screen**.
2. User type: **External**. Fill app name `Gradion`, support email `care@gradion.id`, developer
   contact.
3. Scopes: add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
4. While in **Testing** mode, add the Google accounts you'll test with under **Test users**.
   (Publish the app later for public use.)

### Step 3 — Create an OAuth Client ID
1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins** (no trailing slash):
   - `http://localhost:5050` (local)
   - `https://YOUR_PROD_DOMAIN` (production, when ready)
4. **Authorized redirect URIs**:
   - `http://localhost:5050` (and your prod domain)
5. **Create**, then copy the **Client ID** and **Client secret**.

### Step 4 — Set the env values
The **same Client ID** must be set on both frontend and backend.

`frontend/.env.local` (or `frontend/.env.example` for local dev):
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abcd.apps.googleusercontent.com
```

`backend/.env`:
```env
GOOGLE_CLIENT_ID=1234567890-abcd.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

### Step 5 — Rebuild & restart
`NEXT_PUBLIC_*` is baked in at build time, so the frontend must be **rebuilt**:
```bash
docker compose up -d --build frontend
docker compose up -d backend
```

### Step 6 — Test
Open `/login`, click **Sign in with Google**, pick the account, approve consent → you should land on
`/dashboard` as a parent.

### Troubleshooting
- **`Error 400: redirect_uri_mismatch` / origin mismatch** → the origin must match exactly
  (scheme + host + port, no trailing slash). Add `http://localhost:5050`.
- **`Google authentication is not configured`** (backend) → `GOOGLE_CLIENT_ID` not set on the backend.
- **`access_blocked` / app not verified** → consent screen is in Testing; add the account under
  Test users, or publish the app.
- The Client ID is not a secret; the **Client secret** is — keep it only in `backend/.env`.
