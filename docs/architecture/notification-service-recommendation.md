# Notification Service Architecture Recommendation

## Executive Summary

For the Temps D'arrêt Studio photography platform, **Nodemailer with Gmail SMTP** is the recommended email solution. Twilio is overkill for this project's scale and requirements.

## Option Analysis

### Option 1: Nodemailer + Gmail SMTP ⭐ **RECOMMENDED**

**Pros:**
- **Cost**: Free for up to 500 emails/day, $6/month for Google Workspace (2000/day)
- **Complexity**: Very low - simple SMTP configuration
- **Reliability**: Gmail's proven infrastructure
- **Development Speed**: Fastest implementation
- **Perfect Fit**: Ideal for invitation emails and basic notifications

**Cons:**
- Gmail daily limits (500-2000 emails)
- Basic analytics
- Limited template customization

**Implementation:**
```typescript
// Simple Nodemailer setup
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

await transporter.sendMail({
  from: '"Temps D\'arrêt Studio" <info@tempsdarret.studio>',
  to: client.email,
  subject: 'Your Wedding Photos Are Ready',
  html: generateInvitationTemplate({ shootTitle, magicLink })
});
```

### Option 2: Resend.dev 🥈 **ALTERNATIVE**

**Pros:**
- Modern developer experience
- 3,000 emails/month free
- Great deliverability
- Built-in templates and analytics
- Simple API

**Cons:**
- External dependency
- $20/month after free tier
- Newer service (less proven)

**Implementation:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Temps D\'arrêt Studio <noreply@tempsdarret.studio>',
  to: client.email,
  subject: 'Your Wedding Photos Are Ready',
  react: InvitationTemplate({ shootTitle, magicLink })
});
```

### Option 3: Twilio SendGrid ❌ **OVERKILL**

**Why Not Recommended:**
- **Over-engineered**: Advanced features not needed (A/B testing, advanced analytics)
- **Cost**: $15/month minimum for meaningful features
- **Complexity**: Additional API complexity for simple use case
- **Development Time**: Longer setup for minimal benefit

## Recommended Architecture

```typescript
// services/notification-service/src/features/email/
├── services/
│   ├── email.service.ts           // Core email sending logic
│   ├── template.service.ts        // HTML template generation
│   └── delivery-status.service.ts // Track delivery status
├── templates/
│   ├── invitation.template.ts     // Magic link invitation
│   ├── reminder.template.ts       // Shoot reminders
│   └── gallery-ready.template.ts  // Photos ready notification
├── models/
│   └── notification.model.ts      // Notification tracking
└── controllers/
    └── notification.controller.ts // Event-driven processing
```

## Event-Driven Integration

Following the sequence diagram pattern:

```typescript
// Listen for invite.created events
eventBus.subscribe('invites', 'invite.created', async (event) => {
  const { inviteId, email, shootId, token, expiresAt } = event;
  
  // Generate magic link
  const magicLinkUrl = `${process.env.FRONTEND_URL}/auth/magic?token=${token}`;
  
  // Fetch shoot details for email context
  const shoot = await shootService.getShoot(shootId);
  
  // Send invitation email
  await emailService.sendInvitation({
    to: email,
    shootTitle: shoot.title,
    photographerName: shoot.photographerName,
    magicLink: magicLinkUrl,
    expiresAt: new Date(expiresAt)
  });
  
  // Publish success event
  await eventBus.publish('notifications', {
    eventType: 'invite.sent',
    inviteId,
    email,
    sentAt: new Date().toISOString(),
    status: 'sent'
  }, inviteId);
});
```

## Template System

Use simple HTML templates with variable replacement:

```typescript
// templates/invitation.template.ts
export function generateInvitationTemplate({
  shootTitle,
  photographerName,
  magicLink,
  expiresAt
}: InvitationData) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 40px 20px;">
        <h1 style="color: #2c3e50;">Your Photos Are Ready!</h1>
        <p>Hello,</p>
        <p>${photographerName} has shared your photos from <strong>${shootTitle}</strong>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" 
             style="background: #3498db; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            View Your Photos
          </a>
        </div>
        
        <p><small>This link expires on ${expiresAt.toLocaleDateString()} and can only be used once.</small></p>
        <p>Best regards,<br>Temps D'arrêt Studio</p>
      </div>
    </body>
    </html>
  `;
}
```

## Delivery Tracking

Track email status for business insights:

```typescript
// Track delivery status
await notificationRepository.create({
  id: generateId(),
  inviteId,
  type: 'invitation_email',
  recipient: email,
  status: 'sent',
  sentAt: new Date(),
  attempts: 1,
  metadata: {
    shootId,
    magicLinkToken: token
  }
});
```

## Implementation Priority

1. **Phase 1**: Basic Nodemailer setup with Gmail SMTP
2. **Phase 2**: HTML email templates  
3. **Phase 3**: Delivery tracking and retry logic
4. **Phase 4**: Multiple template types (reminders, gallery updates)

## Cost Analysis (Annual)

| Solution | Cost/Year | Features | Recommendation |
|----------|-----------|----------|----------------|
| **Nodemailer + Gmail** | $0-72 | Basic sending | ✅ **Start Here** |
| **Resend.dev** | $0-240 | Modern API, templates | 🔄 **Upgrade Later** |
| **Twilio SendGrid** | $180+ | Enterprise features | ❌ **Overkill** |

## Migration Path

Start with Nodemailer, migrate to Resend when:
- Sending >2000 emails/day consistently
- Need advanced templates and analytics  
- Business justifies $20/month cost
- Team prefers modern API over SMTP

This approach minimizes initial complexity while providing a clear upgrade path as the business grows.