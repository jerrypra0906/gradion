# Practice videos — production setup (AWS S3 + Gemini)

Parents can optionally record (in-app) or upload a video of each program they
practice in the Weekly Home Program. Gemini analyzes how closely the parent
followed the program's guidance; an admin reviews it on
**Admin → Tools → Video Validation**, then the feedback appears in the family's
Activity Logs under that program.

Videos are stored **privately** — never behind a public URL. Without an S3
bucket the backend falls back to local disk (`backend/uploads/.private`), which
is fine for development but not for production.

## 1. Create the S3 bucket

1. **S3 → Create bucket**
   - Name: e.g. `gradion-practice-videos`
   - Region: **ap-southeast-3 (Jakarta)** — data stays in Indonesia, faster uploads.
   - **Block all public access: ON** (keep every box ticked).
   - Default encryption: SSE-S3 (default) is fine.
2. **Permissions → CORS** — the browser uploads straight to S3:

   ```json
   [
     {
       "AllowedOrigins": ["https://gradion.id", "https://www.gradion.id"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Management → Lifecycle rules** — a safety net only (the app itself deletes
   files 14 days after review, or 30 days if never reviewed):
   - Rule `practice-videos-safety-net`, prefix `program-videos/`
   - Expire current versions of objects after **60 days**
   - Delete expired object delete markers / incomplete multipart uploads after **1 day**

## 2. Give the backend EC2 access (no keys in `.env`)

1. **IAM → Policies → Create policy** (JSON), name `gradion-practice-videos`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::gradion-practice-videos/program-videos/*"
       }
     ]
   }
   ```

2. **IAM → Roles → Create role** → trusted entity *AWS service: EC2* → attach the
   policy above → name `gradion-backend`.
3. **EC2 → backend instance → Actions → Security → Modify IAM role** → `gradion-backend`.
4. The backend runs in Docker, which adds a network hop to the instance metadata
   service. Raise the IMDSv2 hop limit to 2 or the container can't get credentials:

   ```bash
   aws ec2 modify-instance-metadata-options --instance-id i-XXXXXXXX \
     --http-tokens required --http-put-response-hop-limit 2 --http-endpoint enabled
   ```

   (Alternative: put `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for an IAM user
   with the same policy in `backend/.env`. The role is safer.)

## 3. Gemini API key

Create the key in a Google Cloud project **with billing enabled**. On the paid
tier Google does not use your content to improve its products — required for
home videos of children. Free-tier keys must not be used here.

## 4. Backend `.env`

```env
AWS_S3_BUCKET=gradion-practice-videos
AWS_S3_REGION=ap-southeast-3
GEMINI_API_KEY=...
# Optional:
# GEMINI_VIDEO_MODEL=gemini-3.8-flash      # cheaper: gemini-3.5-flash-lite
# AI_PROGRAM_VIDEO_TOKEN_CHARGE=3500       # flat family AI credit per analyzed video
# PROGRAM_VIDEO_RETENTION_DAYS=14
# PROGRAM_VIDEO_UNREVIEWED_DAYS=30
```

Rebuild the backend (`git pull` then `docker compose build backend` and restart,
per the deployment guide). The migration `add_program_videos` applies on start.
The backend log should show:

- `Practice videos: private S3 bucket`
- `Practice video analysis worker started`

## Costs (approximate)

| Item | Cost |
|---|---|
| Gemini 3.8 Flash, 5-min video (low media resolution) | ~$0.045 (intro price to Dec 31 2026), ~$0.09 after |
| Gemini 3.5 Flash-Lite, same video | ~$0.02 |
| S3 storage with 2–4 week retention | ~$1–2 / month |
| Data transfer S3 → Gemini | ~$5 per 1,000 videos |

Families are charged a flat **3,500 AI tokens** per analyzed video (configurable).
Raw usage (~35k tokens per 5-minute video) would exceed whole monthly plan
quotas, so it is recorded per video for cost tracking instead. Admin re-runs are
not charged to the family. A family without AI access or quota still gets a
review — the video goes to admins for manual review without an AI score.

## Data retention

| Event | Video file | Analysis, scores, feedback |
|---|---|---|
| Approved or rejected | deleted after 14 days | kept |
| Never reviewed | deleted 30 days after upload | kept |

A daily job runs at 02:00 WIB. Parents give explicit consent the first time they
record or upload (stored on their account).
