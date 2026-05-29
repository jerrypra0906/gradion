# Resend Custom Domain Setup Guide

## Step 1: Add Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `langkahkecil.org`
4. Resend will provide you with DNS records to add

## Step 2: Add DNS Records

Add these DNS records to your domain provider (where you bought langkahkecil.org):

### Required DNS Records:

1. **SPF Record** (TXT):
   ```
   v=spf1 include:resend.com ~all
   ```

2. **DKIM Record** (TXT):
   - Resend will provide a specific DKIM record
   - Format: `resend._domainkey.langkahkecil.org` with a long string value

3. **DMARC Record** (TXT):
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@langkahkecil.org
   ```

4. **MX Record** (Optional, for receiving emails):
   - Not required for sending only

### Where to Add DNS Records:

- **Cloudflare**: DNS → Records → Add record
- **GoDaddy**: DNS Management → Add
- **Namecheap**: Advanced DNS → Add New Record

## Step 3: Verify Domain in Resend

1. After adding DNS records, go back to Resend Dashboard
2. Click **"Verify"** next to your domain
3. Wait 5-10 minutes for DNS propagation
4. Once verified, you'll see a green checkmark ✅

## Step 4: Configure Environment Variables

Update your `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Your Resend API key
RESEND_FROM_EMAIL=noreply@langkahkecil.org  # or support@langkahkecil.org
RESEND_FROM_NAME=LangkahKecil
SUPPORT_EMAIL=support@langkahkecil.org  # Optional
```

## Step 5: Test Email Sending

Use the test endpoint:
```bash
POST /api/health/test-email
{
  "to": "your-email@example.com"
}
```

Or use the manual email endpoint (see below).

## Troubleshooting

- **Domain not verifying**: Wait 24-48 hours for DNS propagation
- **Emails going to spam**: Check SPF/DKIM records are correct
- **"Domain not verified" error**: Make sure DNS records are added correctly

## Email Addresses You Can Use

Once domain is verified, you can use any email address:
- `noreply@langkahkecil.org`
- `support@langkahkecil.org`
- `hello@langkahkecil.org`
- `notifications@langkahkecil.org`
- etc.
