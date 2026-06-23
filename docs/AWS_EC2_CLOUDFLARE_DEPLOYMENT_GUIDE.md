# AWS EC2 + Cloudflare Deployment Guide (2 servers)

This guide deploys **Gradion** to AWS using **two EC2 servers**:

- **Frontend server**: Next.js app behind Nginx at `gradion.id`
- **Backend+DB server**: Fastify API + PostgreSQL (Docker) behind Nginx at `api.gradion.id`

Cloudflare is used for **DNS** for `gradion.id`.

---

## 1) Minimum recommended specs

### 1.1 Frontend EC2 (Next.js)

- **Instance type**: `t3.small` (2 vCPU, 2 GB RAM)
- **Disk**: 30 GB `gp3`
- **OS**: Ubuntu 22.04 LTS
- **Security Group inbound**
  - TCP **80** from `0.0.0.0/0`
  - TCP **443** from `0.0.0.0/0`
  - TCP **22** from **your IP** only (e.g. `x.x.x.x/32`)

### 1.2 Backend+DB EC2 (Fastify + Postgres)

- **Instance type**: `t3.medium` (2 vCPU, 4 GB RAM)
- **Disk**: 120 GB `gp3` (Postgres, uploads, logs will grow)
- **OS**: Ubuntu 22.04 LTS
- **Security Group inbound**
  - TCP **80** from `0.0.0.0/0`
  - TCP **443** from `0.0.0.0/0`
  - TCP **22** from **your IP** only
  - **Do NOT expose Postgres 5432 publicly**

> Notes:
> - `t3.micro` for frontend can work for very small traffic but is fragile with Node + containers.
> - For production reliability, move Postgres to **RDS** later. This guide follows your “2 servers only” requirement.

---

## 2) Domain plan (Cloudflare)

Use these hostnames:

- `gradion.id` (apex / `@` record) → **Frontend EC2 public IP**
- `api.gradion.id` → **Backend EC2 public IP**

Recommended initial Cloudflare setting:

- **Proxy status**: **DNS only** (turn on Cloudflare proxy later after everything works)

---

## 3) Create AWS resources (Console)

### 3.1 Create 2 Elastic IPs (recommended)

EC2 → **Elastic IPs** → Allocate (x2), then later attach:

- EIP #1 → Frontend instance
- EIP #2 → Backend instance

Why: stable IPs for Cloudflare DNS + easier TLS.

### 3.2 Create Security Groups

Create two security groups:

**SG-frontend**
- Inbound:
  - HTTP 80 `0.0.0.0/0`
  - HTTPS 443 `0.0.0.0/0`
  - SSH 22 `YOUR_IP/32`

**SG-backend**
- Inbound:
  - HTTP 80 `0.0.0.0/0`
  - HTTPS 443 `0.0.0.0/0`
  - SSH 22 `YOUR_IP/32`

### 3.3 Launch EC2 instances

Create two instances:

**Frontend instance**
- AMI: Ubuntu 22.04 LTS
- Type: `t3.small`
- Disk: 30 GB gp3
- Security group: SG-frontend

**Backend instance**
- AMI: Ubuntu 22.04 LTS
- Type: `t3.medium`
- Disk: 120 GB gp3
- Security group: SG-backend

Create/download an SSH keypair (`.pem`).

### 3.4 Attach Elastic IPs

Associate each Elastic IP to its instance.

#### Step-by-step (AWS Console)

1. Go to **AWS Console → EC2 → Network & Security → Elastic IPs**
2. If you see **“No Elastic IP addresses found in this Region”** (like your screenshot), do this:
   - **Double-check region (top-right of AWS Console)**: Elastic IPs are **region-specific**. Make sure you’re in the same region where you created the EC2 instances.
   - Click **Allocate Elastic IP address** (top-right button)
   - Leave defaults → click **Allocate**
   - Repeat until you have **2** Elastic IPs total (one for frontend, one for backend)
3. You should now have **two** Elastic IPs allocated:
   - one intended for **frontend**
   - one intended for **backend**
4. For the first Elastic IP (frontend):
   - Select the Elastic IP row
   - Click **Actions → Associate Elastic IP address**
   - **Resource type**: `Instance`
   - **Instance**: select your **frontend** instance
   - **Private IP address**: keep default (auto-selected)
   - Click **Associate**
5. Repeat for the second Elastic IP (backend):
   - Associate it to your **backend** instance

#### If you don’t want Elastic IPs (not recommended)

You *can* skip Elastic IPs and use the instance **Public IPv4 address** in Cloudflare DNS, but be aware:
- If you **stop/start** the instance, AWS may change the public IP.
- That would break `gradion.id` / `api.gradion.id` until you update Cloudflare DNS.

Elastic IPs avoid this problem.

#### Confirm it worked

1. EC2 → **Instances**
2. Click each instance
3. Confirm these fields match what you expect:
   - **Public IPv4 address** == the Elastic IP you associated
   - **Public IPv4 DNS** is populated

#### If you already had a public IP before

EC2 instances get a temporary public IP by default. After attaching an Elastic IP:
- the temporary public IP may change / disappear
- you should use the **Elastic IP** for Cloudflare DNS and SSH going forward

#### Optional but recommended: name the resources

In AWS Console:
- Name the instances: `gradion-frontend`, `gradion-backend-db`
- Tag Elastic IPs similarly (helps avoid mixing them up later)

---

## 4) Configure Cloudflare DNS

Cloudflare → your zone `gradion.id` → DNS:

- **A** record: `@` → `<FRONTEND_EIP>` (serves `https://gradion.id`)
- **A** record: `api` → `<BACKEND_EIP>`

Set both to:
- **DNS only** (grey cloud)
- TTL: Auto

Verify from your laptop:

```bash
nslookup gradion.id
nslookup api.gradion.id
```

---

## 5) Bootstrap both servers (Docker + Nginx + TLS)

Do this on **both** servers.

### 5.1 SSH into the server

```bash
ssh -i /path/to/key.pem ubuntu@<SERVER_PUBLIC_IP>
```

### 5.2 Install Docker, Git, Nginx, Certbot

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git ufw

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Nginx + Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
```

### 5.3 Enable firewall (recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 6) Deploy backend + Postgres (backend server)

### 6.1 Clone repository

```bash
cd ~
git clone <YOUR_REPO_URL> Gradion
cd ~/Gradion
```

> **Already cloned?** If `~/Gradion` exists, skip `git clone` and run `cd ~/Gradion && git pull` instead.

### 6.2 Create production env files for Docker Compose

**A) Compose / infra variables** — create `~/Gradion/.env` (repo root):

```bash
nano ~/Gradion/.env
```

Recommended minimum (replace secrets):

```env
# ========= URLs =========
FRONTEND_URL=https://gradion.id
API_URL=https://api.gradion.id
PUBLIC_API_URL=https://api.gradion.id/api
CORS_ORIGIN=https://gradion.id

# ========= Postgres =========
POSTGRES_DB=gradion
POSTGRES_USER=gradion_user
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
POSTGRES_PORT_EXTERNAL=5434

# ========= Backend =========
NODE_ENV=production
BACKEND_PORT=5001

# ========= Auth =========
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_32+_CHARS
JWT_REFRESH_SECRET=REPLACE_WITH_LONG_RANDOM_32+_CHARS
SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_32+_CHARS

# ========= Optional: Email =========
RESEND_API_KEY=
# Omit RESEND_FROM_EMAIL until you have a verified sender in Resend (do not leave blank)
# RESEND_FROM_EMAIL=noreply@gradion.id
RESEND_FROM_NAME=Gradion

# ========= Optional: AI =========
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
ENABLE_VIDEO_FIDELITY=true
```

**B) Backend app secrets (optional but recommended)** — copy the example and edit:

```bash
cp ~/Gradion/backend/.env.example ~/Gradion/backend/.env
nano ~/Gradion/backend/.env
```

Set at least:

- `NODE_ENV=production`
- `FRONTEND_URL`, `API_URL`, `PUBLIC_API_URL`, `CORS_ORIGIN` (same as root `.env`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` (same long random values as root `.env`)
- `DB_SSL_REQUIRED=false` (Postgres is on the same Docker network)
- Optional: `GEMINI_API_KEY`, `RESEND_*`, `GOOGLE_CLIENT_*`, Midtrans, R2 storage

> **Note:** If `backend/.env` is missing, older Compose versions error on `docker compose exec`. Either create the file above or pull the latest `docker-compose.yml` (uses `required: false` for that path).

### 6.3 Start backend stack with Docker Compose

From repo root:

```bash
cd ~/Gradion
mkdir -p backend/uploads/banners backend/uploads/cms backend/uploads/videos backend/logs
docker compose -f docker-compose.yml -f docker-compose.backend.yml up -d --build
docker compose ps
```

> **Note:** Use `docker-compose.backend.yml` on the **backend EC2** so the frontend container is not started here. The frontend runs on the separate frontend server (§7). Running `docker compose up -d` without that override starts **all** services including frontend.

> **Note:** First backend build on EC2 can take several minutes. You do **not** need `--no-cache` for normal deploys — use `docker compose build backend` after `git pull`.

### 6.4 Run database migrations

Migrations run automatically when the backend container starts (`docker-entrypoint.sh`). After the first deploy, verify:

```bash
cd ~/Gradion
docker compose logs backend --tail 30
```

You should see `Running database migrations...` followed by `Starting API server...`.

To run migrations manually (e.g. if the container is restarting):

```bash
docker compose run --rm --no-deps backend npx prisma migrate deploy
```

Optional seed:

```bash
docker compose exec backend sh -lc "npm run prisma:seed:prod"
```

If the backend container is restarting, use a one-off container instead:

```bash
docker compose run --rm --no-deps backend npm run prisma:seed:prod
```

### 6.5 Configure Nginx reverse proxy for the API domain

Create Nginx site file:

```bash
sudo nano /etc/nginx/sites-available/api.gradion.id
```

Paste:

```nginx
server {
  listen 80;
  server_name api.gradion.id;

  # Let's Encrypt HTTP-01 (must not be proxied to the API)
  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/api.gradion.id /etc/nginx/sites-enabled/api.gradion.id
sudo nginx -t
sudo systemctl reload nginx
```

### 6.6 Issue HTTPS certificate (Let’s Encrypt)

**Before Certbot:** Cloudflare `@` / `api` records must be **DNS only** (grey cloud). If proxy is on (orange cloud), validation hits Cloudflare and fails.

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
dig +short api.gradion.id   # must show your backend EC2 public IP, not a Cloudflare IP
sudo certbot --nginx -d api.gradion.id
```

Verify:

```bash
curl -s https://api.gradion.id/api/health
```

---

## 7) Deploy frontend (frontend server)

### 7.1 Clone repository

```bash
cd ~
git clone <YOUR_REPO_URL> Gradion
cd ~/Gradion
```

> **Already cloned?** If `~/Gradion` exists, skip `git clone` and run `cd ~/Gradion && git pull` instead.

### 7.2 Create frontend env file

Create `frontend/.env.local`:

```bash
nano ~/Gradion/frontend/.env.local
```

Minimum recommended:

```env
NEXT_PUBLIC_API_URL=https://api.gradion.id/api
NEXT_PUBLIC_APP_NAME=Gradion
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_CMS=true
```

> If you have more `NEXT_PUBLIC_*` feature flags in your real production environment, add them here.

### 7.3 Build and run frontend container

This keeps frontend server independent from backend-compose.

```bash
cd ~/Gradion/frontend
docker build -t gradion-frontend:prod -f Dockerfile .
docker rm -f gradion-frontend >/dev/null 2>&1 || true
docker run -d --name gradion-frontend --restart unless-stopped -p 5050:3000 gradion-frontend:prod
docker ps
```

### 7.4 Configure Nginx reverse proxy for the frontend domain

Create Nginx site file:

```bash
sudo nano /etc/nginx/sites-available/gradion.id
```

Paste:

```nginx
server {
  listen 80;
  server_name gradion.id;

  # Let's Encrypt HTTP-01 (must not be proxied to Next.js)
  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    proxy_pass http://127.0.0.1:5050;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/gradion.id /etc/nginx/sites-enabled/gradion.id
sudo nginx -t
sudo systemctl reload nginx
```

### 7.5 Issue HTTPS certificate (Let’s Encrypt)

**Before Certbot:** In Cloudflare DNS, set the `@` record for `gradion.id` to **DNS only** (grey cloud). Remove or grey-cloud any **AAAA** records for `@` while issuing the cert.

Verify DNS points to **this frontend EC2** (not Cloudflare):

```bash
dig +short gradion.id
dig +short AAAA gradion.id   # should be empty while DNS-only on A record only
```

Prepare webroot and issue cert:

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo certbot --nginx -d gradion.id
```

If `--nginx` still fails, use webroot instead:

```bash
sudo certbot certonly --webroot -w /var/www/html -d gradion.id
sudo certbot install --nginx -d gradion.id
```

After HTTPS works, you may turn Cloudflare proxy back on and set SSL/TLS mode to **Full (strict)**.

Verify:
- Open `https://gradion.id`
- Login and confirm requests hit `https://api.gradion.id/api`

---

## 8) Post-deploy checklist

### 8.1 Backend checks

```bash
cd ~/Gradion
docker compose ps
docker compose logs -f backend
```

Health:

```bash
curl -s https://api.gradion.id/api/health
```

### 8.2 Frontend checks

```bash
docker logs -f gradion-frontend
```

### 8.3 Security checks (minimum)

- SSH: only your IP can connect (SG rule).
- Postgres: **not publicly reachable**.
- Secrets: replace all defaults, use long random secrets.

---

## 9) Update / redeploy workflow

### 9.1 Backend server update

```bash
cd ~/Gradion
git pull
docker compose up -d --build
docker compose exec backend sh -lc "npx prisma migrate deploy"
```

### 9.2 Frontend server update

```bash
cd ~/Gradion
git pull
cd frontend
docker build -t gradion-frontend:prod -f Dockerfile .
docker rm -f gradion-frontend
docker run -d --name gradion-frontend --restart unless-stopped -p 5050:3000 gradion-frontend:prod
```

---

## 10) Common issues

### 10.1 CORS errors

Browser error: `No 'Access-Control-Allow-Origin' header` when logging in from `https://gradion.id`.

**Cause:** `CORS_ORIGIN` on the backend still points at `localhost` or the wrong domain.

**Fix:** Set these in **`~/Gradion/.env`** (repo root — Docker Compose reads this file for `${CORS_ORIGIN}`):

```env
FRONTEND_URL=https://gradion.id
API_URL=https://api.gradion.id
PUBLIC_API_URL=https://api.gradion.id/api
CORS_ORIGIN=https://gradion.id
```

If you also serve `www.gradion.id`, use a comma-separated list:

```env
CORS_ORIGIN=https://gradion.id,https://www.gradion.id
```

Mirror the same values in `~/Gradion/backend/.env`, then recreate the backend container:

```bash
cd ~/Gradion
docker compose up -d --force-recreate backend
```

Verify CORS preflight:

```bash
curl -i -X OPTIONS "https://api.gradion.id/api/auth/login" \
  -H "Origin: https://gradion.id" \
  -H "Access-Control-Request-Method: POST"
```

You should see `access-control-allow-origin: https://gradion.id` in the response headers.

### 10.2 Certbot failing

- Confirm DNS resolves to the correct server (`dig +short gradion.id` must show your EC2 IP, **not** `104.x`, `172.x`, or `2606:4700:` Cloudflare ranges).
- Confirm ports 80/443 are open in SG and UFW.
- Set Cloudflare `@` and `api` records to **DNS only** (grey cloud) before running Certbot. Orange-cloud proxy breaks HTTP-01 validation.
- Ensure Nginx serves `/.well-known/acme-challenge/` locally (see §6.5 / §7.4) — do **not** proxy that path to Next.js/API or you get **500** on the challenge URL.
- Error example: `2606:4700:... Invalid response ... acme-challenge ... 500` → Cloudflare proxy is on and/or challenge is hitting your app instead of Nginx webroot.

### 10.3 Postgres disk fills up

- Increase EBS volume size (AWS) and extend filesystem.
- Add backup/rotation for logs and periodic `pg_dump`.

### 10.4 `prisma generate` fails during Docker build

Error example:

```text
Cannot find module '.../query_compiler_fast_bg.postgresql.wasm-base64.js'
```

**Cause:** `prisma` CLI and `@prisma/client` were on different versions (e.g. 7.8 vs 7.2).

**Fix:** Pull latest code, then rebuild:

```bash
cd ~/Gradion
git pull
docker compose build backend
docker compose up -d
docker compose exec backend sh -lc "npx prisma migrate deploy"
```

Use `--no-cache` only if a normal rebuild still fails.

### 10.5 Docker build slow or fails during `apt-get` / `libvips-dev`

If you see:

```text
E: Failed to fetch ... libmagickcore-6-arch-config ... Connection reset by peer
```

**Cause:** Older Dockerfiles installed `libvips-dev` (300+ packages, ~680 MB). That is **not needed** — the `sharp` npm package ships prebuilt binaries.

**Fix:** Pull latest code (minimal Dockerfile) and rebuild:

```bash
cd ~/Gradion
git pull
docker compose build backend
docker compose up -d
```

If apt still fails transiently (network blip), retry once:

```bash
docker compose build backend
```

### 10.6 Docker build slow or fails after `npm run build`

First backend build on **`t3.small`** (2 GB RAM) often takes **3–6 minutes**. That is normal for this stack.

If the build stops after `npm run build` with only `failed to execute bake: exit status 1`, check **disk space first**, then memory:

**Fix (try in order):**

1. Pull latest Dockerfile (single build path — one `npm ci`):

```bash
cd ~/Gradion
git pull
docker compose build backend
```

2. Capture the real error:

```bash
docker compose --progress plain build backend 2>&1 | tee /tmp/docker-build.log
tail -30 /tmp/docker-build.log
```

3. Free disk space (common on default 8 GB EBS volumes):

```bash
docker system prune -f
df -h
```

Ensure **≥5 GB free** before building. If the volume is full, expand EBS in AWS or use at least a **20 GB** root volume.

4. Optional: add **2 GB swap** for Docker build headroom on 2 GB RAM:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

5. Rebuild (no `--no-cache` unless debugging):

```bash
docker compose build backend && docker compose up -d
```

### 10.7 Backend container keeps restarting

If `docker compose exec backend ...` says **"Container is restarting"**:

**1. Read the crash reason:**

```bash
cd ~/Gradion
docker compose logs backend --tail 80
```

Common log lines and fixes:

| Log message | Fix |
|-------------|-----|
| `Invalid environment variables` / `RESEND_FROM_EMAIL: Invalid email` | Remove `RESEND_FROM_EMAIL=` from `~/Gradion/backend/.env` (omit the line entirely until Resend is configured). Do not set it to an empty string. |
| SSL / `DB_SSL_REQUIRED` errors | Set `DB_SSL_REQUIRED=false` in root `.env` or `backend/.env` (Docker Postgres does not use SSL). |
| `initial_observation_templates` does not exist | Schema/migration drift. `git pull` then run `docker compose run --rm --no-deps backend npx prisma migrate deploy` and restart backend. |
| `EACCES` on `uploads` or `logs` | `sudo mkdir -p backend/uploads/banners backend/uploads/cms backend/uploads/videos backend/logs && sudo chown -R 1000:1000 backend/uploads backend/logs` then `docker compose up -d --build backend`. Latest images also fix permissions on startup via entrypoint. |

**2. Pull latest fixes and rebuild:**

```bash
git pull
docker compose up -d --build backend
docker compose logs backend --tail 30
```

**3. Run migrations while the container is down** (one-off container, same env):

```bash
docker compose stop backend
docker compose run --rm --no-deps backend npx prisma migrate deploy
docker compose up -d backend
```

**4. Verify health:**

```bash
curl -s http://127.0.0.1:5001/api/health
```


## 11) Optional hardening (recommended next)

- Create a **non-root** deploy user and disable password SSH
- Add automatic security updates (`unattended-upgrades`)
- Add daily DB backups to S3 (`pg_dump` + cron)
- Configure **Cloudflare R2** for uploads (see backend `R2_*` env vars and `backend/src/lib/storage.ts`)
- Move Postgres to **RDS** when ready (see [11.1](#111-moving-postgres-to-rds))

### 11.1 Moving Postgres to RDS

When traffic grows or you need managed backups, migrate Postgres off the backend EC2.

#### Step A — Create RDS instance

1. AWS Console → **RDS → Create database**.
2. Engine: **PostgreSQL 16**.
3. Template: **Production** (or Dev/Test for staging).
4. **Multi-AZ**: enable for production.
5. Instance class: `db.t4g.micro` (start small) or larger as needed.
6. Storage: gp3, enable autoscaling.
7. **VPC**: same VPC as backend EC2 (or default VPC if EC2 uses it).
8. **Public access**: **No**.
9. Security group: allow inbound **5432** only from backend EC2 security group.
10. Database name: `gradion`, master username/password — store securely.

Note the RDS endpoint, e.g. `gradion.xxxx.ap-southeast-2.rds.amazonaws.com`.

#### Step B — Prepare backend EC2

1. Ensure backend EC2 can reach RDS (same VPC/subnet routing, SG rules).
2. Install client tools if needed: `sudo apt install -y postgresql-client`.

#### Step C — Migrate data

**Option 1 — pg_dump / pg_restore (simplest)**

On backend EC2 while Docker Postgres is still running:

```bash
# Dump from Docker Postgres
docker compose exec -T postgres pg_dump -U gradion_user -d gradion -Fc > gradion.dump

# Restore to RDS (replace host and credentials)
pg_restore -h gradion.xxxx.ap-southeast-2.rds.amazonaws.com \
  -U gradion_admin -d gradion --no-owner --no-acl gradion.dump
```

**Option 2 — logical replication** for near-zero-downtime (advanced; use AWS DMS or native logical replication).

#### Step D — Update backend `.env`

```env
DATABASE_URL=postgresql://gradion_admin:STRONG_PASSWORD@gradion.xxxx.ap-southeast-2.rds.amazonaws.com:5432/gradion?schema=public&sslmode=require
DB_SSL_REQUIRED=true
```

Remove or comment out the `postgres` service in `docker-compose.yml` on the backend server once RDS is verified.

#### Step E — Deploy and verify

```bash
cd ~/Gradion
docker compose up -d --build backend
docker compose exec backend npx prisma migrate deploy
curl -s https://api.gradion.id/api/health
```

Run smoke tests: login, list children, create parent log.

#### Step F — Backups and monitoring

- Enable RDS **automated backups** (retention 7–35 days).
- Enable **Enhanced Monitoring** and CloudWatch alarms (CPU, storage, connections).
- Optional: snapshot before major migrations.

#### Rollback plan

Keep the Docker Postgres volume until RDS is stable for 24–48 hours. To roll back, point `DATABASE_URL` back to `postgres:5432` and restart backend.

