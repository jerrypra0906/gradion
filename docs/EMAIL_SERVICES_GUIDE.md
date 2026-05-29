# Email Services Implementation Guide

## Overview

LangkahKecil has a comprehensive email system using Resend for transactional emails. This guide explains all available email services and how to use them.

---

## Available Email Services

### 1. Email Verification ✅ (Implemented)
- **Service**: `EmailVerificationService`
- **Location**: `backend/src/services/emailVerification.service.ts`
- **Usage**: Automatically sends verification emails when users register
- **Status**: ✅ Fully implemented and active

### 2. Password Reset 🔄 (Ready for Implementation)
- **Service**: `PasswordResetService`
- **Location**: `backend/src/services/passwordReset.service.ts`
- **Usage**: Sends password reset links to users
- **Status**: ⚠️ Code ready, needs database schema (password_reset_tokens table)

### 3. Subscription Notifications ✅ (Partially Implemented)
- **Service**: `SubscriptionNotificationService`
- **Location**: `backend/src/services/subscriptionNotification.service.ts`
- **Available Methods**:
  - ✅ `notifyAdminNewRequest()` - Notifies admin of new subscription requests
  - ✅ `notifyUserPaymentSuccess()` - Confirms successful payment
  - ✅ `sendPaymentReceipt()` - Sends payment receipt email
  - ✅ `sendRenewalReminder()` - Reminds users of upcoming expiry
  - ✅ `sendExpiryNotification()` - Notifies when subscription expires

### 4. Progress Reports 🔄 (Ready for Implementation)
- **Service**: `ProgressReportService`
- **Location**: `backend/src/services/progressReport.service.ts`
- **Methods**:
  - `sendWeeklyReport()` - Sends weekly progress summary
  - `sendMonthlyReport()` - Sends monthly progress summary
- **Status**: ⚠️ Framework ready, needs data aggregation implementation

### 5. Session Reminders 🔄 (Ready for Implementation)
- **Service**: `SessionReminderService`
- **Location**: `backend/src/services/sessionReminder.service.ts`
- **Methods**:
  - `sendSessionReminderToTherapist()` - Reminds therapist of upcoming session
  - `sendSessionReminderToParent()` - Reminds parent of upcoming session
- **Status**: ⚠️ Code ready, needs cron job/scheduler setup

---

## Implementation Status

| Email Type | Service | Status | Notes |
|------------|---------|--------|-------|
| Email Verification | `EmailVerificationService` | ✅ Active | Fully implemented |
| Password Reset | `PasswordResetService` | 🔄 Ready | Needs DB schema |
| Payment Receipt | `SubscriptionNotificationService` | ✅ Ready | Call after payment success |
| Renewal Reminder | `SubscriptionNotificationService` | ✅ Ready | Needs cron job |
| Expiry Notification | `SubscriptionNotificationService` | ✅ Ready | Needs cron job |
| Weekly Report | `ProgressReportService` | 🔄 Ready | Needs data aggregation |
| Monthly Report | `ProgressReportService` | 🔄 Ready | Needs data aggregation |
| Session Reminder | `SessionReminderService` | 🔄 Ready | Needs cron job |

---

## How to Use Each Service

### 1. Email Verification (Already Active)

Already implemented in `authRoutes`. No action needed - automatically sends when users register.

```typescript
// Already working in: backend/src/routes/auth.ts
const emailVerificationService = new EmailVerificationService();
await emailVerificationService.sendVerificationEmail(user);
```

### 2. Password Reset

**Step 1: Create Database Schema**

Add to `backend/prisma/schema.prisma`:

```prisma
model PasswordResetToken {
  id         Int      @id @default(autoincrement())
  user_id    Int
  token      String   @unique
  expires_at DateTime
  used_at    DateTime?
  created_at DateTime @default(now())

  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("password_reset_tokens")
  @@index([token])
  @@index([user_id])
}
```

Add to `User` model:

```prisma
model User {
  // ... existing fields
  passwordResetTokens PasswordResetToken[]
}
```

**Step 2: Run Migration**

```bash
cd backend
npx prisma migrate dev --name add_password_reset_tokens
```

**Step 3: Update PasswordResetService**

Uncomment and implement the database operations in `passwordReset.service.ts`.

**Step 4: Add Routes**

Add to `backend/src/routes/auth.ts`:

```typescript
// Request password reset
fastify.post('/forgot-password', async (request, reply) => {
  const body = z.object({ email: z.string().email() }).parse(request.body);
  const passwordResetService = new PasswordResetService();
  await passwordResetService.requestPasswordReset(body.email);
  return { message: 'If an account exists, a password reset link has been sent.' };
});

// Reset password
fastify.post('/reset-password', async (request, reply) => {
  const body = z.object({
    token: z.string(),
    newPassword: z.string().min(6),
  }).parse(request.body);
  
  const passwordResetService = new PasswordResetService();
  const { userId } = await passwordResetService.verifyResetToken(body.token);
  
  // Update password
  const hashedPassword = await bcrypt.hash(body.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: hashedPassword },
  });
  
  await passwordResetService.markTokenAsUsed(body.token);
  return { message: 'Password reset successfully' };
});
```

### 3. Payment Receipt

**When to Send**: After successful payment (in webhook handler)

**Location**: `backend/src/routes/subscriptions.ts` (webhook handler)

**Usage**:

```typescript
import { SubscriptionNotificationService } from '../services/subscriptionNotification.service.js';

// After payment is confirmed
const notificationService = new SubscriptionNotificationService();
await notificationService.sendPaymentReceipt(requestId);
```

### 4. Renewal Reminder

**When to Send**: 7 days before subscription expires (cron job)

**Setup Cron Job** (e.g., using node-cron or Railway cron):

```typescript
// backend/src/cron/subscriptionReminders.ts
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { SubscriptionNotificationService } from '../services/subscriptionNotification.service.js';

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const notificationService = new SubscriptionNotificationService();
  
  // Find subscriptions expiring in 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const subscriptions = await prisma.subscription.findMany({
    where: {
      renewal_date: {
        gte: new Date(sevenDaysFromNow.setHours(0, 0, 0, 0)),
        lte: new Date(sevenDaysFromNow.setHours(23, 59, 59, 999)),
      },
    },
  });
  
  for (const subscription of subscriptions) {
    await notificationService.sendRenewalReminder(subscription.user_id, 7);
  }
});
```

### 5. Expiry Notification

**When to Send**: On subscription expiry date (cron job)

**Usage**:

```typescript
// In cron job
const notificationService = new SubscriptionNotificationService();

// Find expired subscriptions
const expiredSubscriptions = await prisma.subscription.findMany({
  where: {
    renewal_date: {
      lte: new Date(),
    },
  },
});

for (const subscription of expiredSubscriptions) {
  await notificationService.sendExpiryNotification(subscription.user_id);
}
```

### 6. Weekly/Monthly Progress Reports

**Step 1: Implement Data Aggregation**

Update `generateReportData()` in `progressReport.service.ts` to actually query and calculate statistics.

**Step 2: Setup Cron Job**

```typescript
// backend/src/cron/progressReports.ts
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { ProgressReportService } from '../services/progressReport.service.js';

// Weekly reports - every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  const reportService = new ProgressReportService();
  
  const parents = await prisma.user.findMany({
    where: { role: 'parent' },
  });
  
  for (const parent of parents) {
    await reportService.sendWeeklyReport(parent.id);
  }
});

// Monthly reports - 1st of every month at 9 AM
cron.schedule('0 9 1 * *', async () => {
  const reportService = new ProgressReportService();
  
  const parents = await prisma.user.findMany({
    where: { role: 'parent' },
  });
  
  for (const parent of parents) {
    await reportService.sendMonthlyReport(parent.id);
  }
});
```

### 7. Session Reminders

**When to Send**: 24 hours before scheduled session (cron job)

**Usage**:

```typescript
// backend/src/cron/sessionReminders.ts
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { SessionReminderService } from '../services/sessionReminder.service.js';

// Run every hour
cron.schedule('0 * * * *', async () => {
  const reminderService = new SessionReminderService();
  
  // Find sessions happening in next 24-25 hours
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);
  const dayAfter = new Date();
  dayAfter.setHours(dayAfter.getHours() + 25);
  
  const upcomingSessions = await prisma.session.findMany({
    where: {
      date: {
        gte: tomorrow,
        lte: dayAfter,
      },
    },
  });
  
  for (const session of upcomingSessions) {
    await reminderService.sendSessionReminderToTherapist(session.id);
    // Optional: await reminderService.sendSessionReminderToParent(session.id);
  }
});
```

---

## Setting Up Cron Jobs

### Option 1: Railway Cron (Recommended)

Railway supports cron jobs. Create a separate service:

1. Create `backend/src/cron/index.ts`:

```typescript
import './subscriptionReminders.js';
import './progressReports.js';
import './sessionReminders.js';

console.log('Cron jobs initialized');
```

2. Update `package.json` to add a cron script:

```json
{
  "scripts": {
    "cron": "tsx src/cron/index.ts"
  }
}
```

3. In Railway, create a new service that runs `npm run cron` on a schedule.

### Option 2: Node-Cron (Simple)

Install node-cron:

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Then add cron initialization to your main server file.

### Option 3: External Cron Service

Use services like:
- **EasyCron**: https://www.easycron.com
- **Cron-job.org**: https://cron-job.org
- **GitHub Actions**: Schedule workflows

---

## Testing Email Services

### Test Individual Services

```typescript
// Test password reset
const passwordResetService = new PasswordResetService();
await passwordResetService.requestPasswordReset('user@example.com');

// Test progress report
const reportService = new ProgressReportService();
await reportService.sendWeeklyReport(userId);

// Test session reminder
const reminderService = new SessionReminderService();
await reminderService.sendSessionReminderToTherapist(sessionId);

// Test subscription notifications
const notificationService = new SubscriptionNotificationService();
await notificationService.sendRenewalReminder(userId, 7);
```

### Test via API Endpoints

You can create test endpoints (for development only):

```typescript
// In development mode only
if (process.env.NODE_ENV === 'development') {
  fastify.post('/test/password-reset', async (request, reply) => {
    const body = z.object({ email: z.string().email() }).parse(request.body);
    const service = new PasswordResetService();
    await service.requestPasswordReset(body.email);
    return { message: 'Test email sent' };
  });
  
  // ... other test endpoints
}
```

---

## Email Templates Customization

All email templates are HTML with inline styles. To customize:

1. **Colors**: Change hex color codes (e.g., `#2563eb` for primary blue)
2. **Branding**: Update `LangkahKecil` references
3. **Links**: Update `config.frontendUrl` paths
4. **Styling**: Modify inline styles in HTML strings

---

## Best Practices

1. **Error Handling**: All services log errors but don't throw (to prevent breaking user flows)
2. **Rate Limiting**: Be mindful of Resend rate limits (free tier: 2,000 emails/month)
3. **Testing**: Always test emails in development before enabling in production
4. **Cron Jobs**: Start with manual testing, then enable cron jobs
5. **Monitoring**: Monitor email delivery in Resend dashboard

---

## Next Steps

1. ✅ **Resend is configured** - Emails are working
2. 🔄 **Implement password reset** - Add DB schema and routes
3. 🔄 **Add payment receipt** - Call after successful payment
4. 🔄 **Setup renewal reminders** - Create cron job
5. 🔄 **Setup progress reports** - Implement data aggregation + cron
6. 🔄 **Setup session reminders** - Create cron job

---

## Resources

- **Resend Setup Guide**: [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)
- **Email Service Code**: `backend/src/services/email.service.ts`
- **Resend Dashboard**: https://resend.com/emails

---

*Last updated: December 2024*
