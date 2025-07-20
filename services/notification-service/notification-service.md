# Notification Service

## Overview
Handles all external communications including email notifications, SMS alerts, and client messaging. Acts as the centralized communication hub for client engagement and system notifications.

## Core Responsibilities
- **Email delivery**: Magic links, photo ready notifications, system alerts
- **Client communication**: Automated and manual messaging workflows
- **Template management**: Branded email and message templates
- **Delivery tracking**: Monitor message delivery and engagement
- **Communication preferences**: Respect client notification settings

## Key Features

### Email Workflows
- **Magic link delivery**: Secure project access via email
- **Photo ready notifications**: Alert clients when gallery is available
- **Project updates**: Notify about new photos or changes
- **Administrative alerts**: System notifications for photographer
- **Marketing communications**: Newsletter and promotional content (with opt-in)

### Template System
- **Responsive email design**: Mobile-optimized professional templates
- **Brand consistency**: Photographer's visual identity throughout
- **Dynamic content**: Personalized messages with project/client details
- **Multi-language support**: Localized templates when needed
- **A/B testing capability**: Optimize message effectiveness

### Communication Channels
- **Primary**: Email for all client communications
- **Secondary**: SMS for urgent notifications (optional)
- **Administrative**: Slack/Discord integration for photographer alerts
- **Analytics**: Email open rates, click tracking, engagement metrics

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Email service**: SMTP (self-hosted) or service provider (SendGrid, SES)
- **Template engine**: Handlebars or React Email for dynamic content
- **Queue processing**: Bull/BullMQ for reliable message delivery
- **Database**: MongoDB for message logs and templates

## API Endpoints

### Message Sending
- `POST /send/magic-link` - Send project access magic link
- `POST /send/photos-ready` - Notify client photos are available
- `POST /send/project-update` - Send project status update
- `POST /send/custom-message` - Send custom message to client
- `POST /send/bulk-notification` - Send to multiple recipients

### Template Management
- `GET /templates` - List available message templates
- `POST /templates` - Create new template
- `PUT /templates/{id}` - Update template
- `GET /templates/{id}/preview` - Preview template with sample data

### Communication History
- `GET /messages/{projectId}` - Get all messages for project
- `GET /messages/client/{email}` - Get client communication history
- `POST /messages/{id}/resend` - Resend failed message

## Message Templates

### Magic Link Email
```
Subject: Access your photos - {Project Name}

Hi {Client Name},

Your photos from {Event Name} are ready for viewing and download.

[View Photos Button] → {Magic Link URL}

This link will expire on {Expiration Date}.

If you have any questions, simply reply to this email.

Best regards,
{Photographer Name}
```

### Photos Ready Notification
```
Subject: 📸 Your {Event Type} photos are ready!

Hello {Client Name},

Great news! All your photos from {Event Name} have been processed and are now available for download.

Gallery highlights:
• {Total Photo Count} high-quality images
• Full resolution downloads available
• Photos organized by {Categories}

[Access Gallery] → {Project URL}

Thank you for choosing us for your special day!

{Photographer Name}
```

## Event-Driven Communication

### Event Consumption (Kafka)
```typescript
// Listen for events that trigger communications
'file.processed' → Send "photos ready" email
'invite.created' → Send magic link email  
'project.updated' → Send update notification
'auth.project-accessed' → Send welcome message (first time)
'file.download-started' → Send download confirmation
'invite.expiring-soon' → Send reminder email
```

### Event Publishing
```typescript
// Publish communication events for analytics
'notification.sent' → Message delivered successfully
'notification.failed' → Delivery failed, retry needed
'notification.opened' → Client opened email (tracking pixel)
'notification.clicked' → Client clicked link in email
'notification.bounced' → Email bounced back
'notification.unsubscribed' → Client opted out
```

## Message Schema

```typescript
interface NotificationMessage {
  id: string;
  
  // Target and content
  recipient: {
    email: string;
    name?: string;
    projectId?: string;
  };
  
  // Message details
  content: {
    templateId: string;
    subject: string;
    variables: Record<string, any>;  // Template variables
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  // Delivery tracking
  delivery: {
    status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced';
    attempts: number;
    lastAttempt?: Date;
    deliveredAt?: Date;
    error?: string;
  };
  
  // Engagement tracking
  engagement: {
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    unsubscribed: boolean;
  };
  
  // Context
  metadata: {
    source: string;           // Which service triggered this
    correlationId?: string;   // Link to originating event
    campaignId?: string;      // For marketing emails
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Communication Workflows

### Magic Link Flow
```
1. Invite Service creates project invite
2. Notification Service receives 'invite.created' event
3. Load magic link email template
4. Populate with project details and secure link
5. Queue email for delivery
6. Send via SMTP/email service
7. Track delivery and engagement
8. Log communication in project history
```

### Photo Ready Flow
```
1. File Service completes processing all project photos
2. Event Service publishes 'project.photos-ready' event  
3. Notification Service receives event
4. Check if client should be notified (preferences)
5. Load "photos ready" template
6. Include gallery link and project highlights
7. Send notification email
8. Track engagement and downloads
```

## Client Communication Preferences

```typescript
interface ClientPreferences {
  email: string;
  
  notifications: {
    photosReady: boolean;        // Notify when photos are processed
    projectUpdates: boolean;     // Updates to existing projects
    marketing: boolean;          // Newsletter and promotions
    reminders: boolean;          // Access expiration reminders
  };
  
  frequency: {
    immediate: boolean;          // Send immediately
    daily: boolean;             // Daily digest
    weekly: boolean;            // Weekly summary
  };
  
  language: string;              // Template language preference
  timezone: string;              // For scheduling
}
```

## Integration Points

### With Invite Service
- Receive invite creation events
- Send magic link emails with project access
- Handle invite expiration reminders

### With File Service  
- React to file processing completion
- Send photo ready notifications
- Include file counts and sizes in messages

### With Project Service
- Access project metadata for personalized messages
- Include event details (date, location, type)
- Get client information for addressing

### With Analytics Service
- Share email engagement metrics
- Track communication effectiveness
- Provide client engagement insights

## Implementation Phases

### Phase 1: Core Email Infrastructure
- [ ] Set up SMTP/email service integration
- [ ] Create basic template engine with dynamic content
- [ ] Implement message queue for reliable delivery
- [ ] Build fundamental email sending capabilities
- [ ] Add delivery status tracking

### Phase 2: Template System & Workflows
- [ ] Create branded email templates for all scenarios
- [ ] Implement event-driven messaging workflows
- [ ] Add client preference management
- [ ] Build message history and logging
- [ ] Create email engagement tracking

### Phase 3: Advanced Features
- [ ] Add SMS notification capabilities
- [ ] Implement marketing automation features
- [ ] Create A/B testing for message optimization
- [ ] Build communication analytics dashboard
- [ ] Add multi-language template support

## Business Benefits
- **Professional client experience**: Branded, timely communications
- **Automated workflows**: Reduces manual communication overhead
- **Client engagement**: Track how clients interact with notifications
- **Marketing opportunities**: Newsletter and repeat business outreach
- **Support efficiency**: Centralized communication history