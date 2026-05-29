# Manual Email Sending Guide

## Overview

Admins can send emails manually to registered users using the custom domain `@langkahkecil.org` via Resend.

## Prerequisites

1. **Resend Domain Setup**: Follow [RESEND_CUSTOM_DOMAIN_SETUP.md](./RESEND_CUSTOM_DOMAIN_SETUP.md) to set up `@langkahkecil.org`
2. **Environment Variables**: Ensure these are set in your `.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@langkahkecil.org
   RESEND_FROM_NAME=LangkahKecil
   ```

## API Endpoint

**POST** `/api/admin/send-email`

**Authentication**: Admin only (requires JWT token)

## Request Body

```json
{
  "to": "email@example.com" | ["email1@example.com", "email2@example.com"] | "all" | "parents" | "therapists" | "admins",
  "subject": "Email Subject",
  "html": "<h1>Email Content</h1><p>Your HTML email content here</p>",
  "user_ids": [1, 2, 3]  // Optional: specific user IDs to send to
}
```

## Recipient Options

### Single Email
```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Hello!</p>"
}
```

### Multiple Emails (Array)
```json
{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Hello",
  "html": "<p>Hello!</p>"
}
```

### All Users
```json
{
  "to": "all",
  "subject": "Announcement",
  "html": "<p>Important announcement for all users!</p>"
}
```

### By Role
```json
{
  "to": "parents",  // or "therapists" or "admins"
  "subject": "Parent Update",
  "html": "<p>Update for parents only</p>"
}
```

### Specific User IDs
```json
{
  "to": "all",  // Can be any option
  "subject": "Custom Message",
  "html": "<p>Custom message</p>",
  "user_ids": [1, 5, 10]  // Only these users will receive
}
```

## Example: Send Welcome Email to New Parents

```bash
curl -X POST https://your-api.com/api/admin/send-email \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "parents",
    "subject": "Welcome to LangkahKecil!",
    "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
      <h1 style=\"color: #2563eb;\">Welcome to LangkahKecil!</h1>
      <p>Dear Parent,</p>
      <p>Thank you for joining LangkahKecil. We are excited to help you track your child\'s progress.</p>
      <p>Best regards,<br>The LangkahKecil Team</p>
    </div>"
  }'
```

## Example: Send to Specific Users

```bash
curl -X POST https://your-api.com/api/admin/send-email \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "all",
    "subject": "Important Update",
    "html": "<p>Important update for selected users</p>",
    "user_ids": [1, 2, 3]
  }'
```

## Response

### Success
```json
{
  "success": true,
  "message": "Email sent to 10 recipient(s)",
  "data": {
    "total_recipients": 10,
    "successful": 10,
    "failed": 0,
    "recipients": ["user1@example.com", "user2@example.com", ...]
  }
}
```

### Error
```json
{
  "success": false,
  "error": "No valid recipients found"
}
```

## HTML Email Templates

### Simple Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Title</h1>
  <p>Your content here</p>
</div>
```

### Professional Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #2563eb; margin-top: 0;">Title</h1>
    <p style="color: #374151; line-height: 1.6;">Your content here</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 12px;">LangkahKecil Team</p>
  </div>
</div>
```

## Notes

- Only **verified users** (`is_email_verified: true`) will receive emails
- Emails are sent asynchronously - the API returns immediately
- Failed sends are reported in the response
- Maximum recipients per request: No limit (but be mindful of rate limits)
- Emails are sent from `noreply@langkahkecil.org` (or value in `RESEND_FROM_EMAIL`)

## Testing

Use the test endpoint first:
```bash
POST /api/health/test-email
{
  "to": "your-email@example.com"
}
```

This will send a test email to verify your Resend configuration is working.
