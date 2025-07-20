# Invite Service

## Overview
Handles client invitation flows, magic link generation, and project access management. Simplifies client onboarding by eliminating complex registration processes.

## Responsibilities
- **Invite generation**: Create project invites with unique magic links
- **Email delivery**: Send invitation emails to clients
- **Access tracking**: Monitor invite usage and expiration
- **Link validation**: Verify invite tokens and grant access
- **Invite management**: Admin tools for invite oversight

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware
- **Database**: MongoDB with Mongoose ODM
- **Email**: SMTP or email service integration
- **Testing**: Jest with email mocking

## API Endpoints

### Invite Management
- `POST /invites/create` - Create new project invite
- `GET /invites/{token}` - Validate invite token
- `POST /invites/{token}/accept` - Accept invite and grant access
- `GET /admin/invites` - List all invites (admin only)
- `DELETE /admin/invites/{id}` - Revoke invite (admin only)

### Project Access
- `GET /invites/project/{projectId}` - Get invite for specific project
- `POST /invites/resend/{id}` - Resend invite email
- `PUT /invites/{id}/extend` - Extend invite expiration

## Database Schema

### Invite Document
```typescript
{
  id: string;
  email: string;
  projectId: string;
  token: string; // Unique magic link token
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';
  message?: string; // Optional personal message
  sentAt?: Date;
  acceptedAt?: Date;
  expiresAt: Date;
  createdBy: string; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}
```

## Email Templates

### Project Invite Email
```
Subject: Your photos are ready - {Project Name}

Hi {Client Name},

Your photos from {Event/Project Name} are ready for viewing and download.

Access your gallery: {Magic Link URL}

This link will expire on {Expiration Date}.

Best regards,
{Photographer Name}
```

## Event Publishing (Kafka)
- `invite.created` - New invite generated
- `invite.sent` - Invite email delivered
- `invite.accepted` - Client accessed project via invite
- `invite.expired` - Invite reached expiration
- `invite.revoked` - Admin revoked invite access
- `email.delivery-failed` - Email sending failed

## Event Consumption
- `project.created` - Automatically generate invites if clients specified
- `user.created` - Link accepted invites to new user accounts
- `project.updated` - Update invite metadata if project details change

## Implementation Phases

### Phase 1: Core Invite System
- [ ] Set up Express.js service with TypeScript
- [ ] Implement MongoDB schema for invites
- [ ] Create invite generation with unique tokens
- [ ] Build token validation and access granting
- [ ] Add basic CRUD operations for invites

### Phase 2: Email Integration
- [ ] Set up email service (SMTP/SendGrid/SES)
- [ ] Create responsive email templates
- [ ] Implement email sending with retry logic
- [ ] Add email delivery tracking
- [ ] Build email unsubscribe handling

### Phase 3: Advanced Features
- [ ] Add invite analytics and reporting
- [ ] Implement bulk invite operations
- [ ] Create invite scheduling for future sends
- [ ] Add custom message capabilities
- [ ] Build invite link preview functionality

## Integration Points

### With User Service
- Validate user permissions before creating invites
- Link accepted invites to user accounts
- Sync project access permissions

### With Project Service
- Verify project exists before creating invite
- Get project metadata for email content
- Update project access logs

### With Notification Service
- Delegate email sending to notification service
- Receive delivery status updates
- Handle email bounce and complaint processing

## Security Considerations
- **Token uniqueness**: Cryptographically secure token generation
- **Expiration enforcement**: Automatic cleanup of expired invites
- **Rate limiting**: Prevent invite spam
- **Access validation**: Verify project permissions before granting access
- **Audit trail**: Log all invite actions for security review

## Quality Standards
- **Idempotent operations**: Safe to retry invite creation
- **Graceful email failures**: Continue operation if email fails
- **Comprehensive logging**: Track invite lifecycle events
- **Error recovery**: Retry mechanisms for transient failures
- **Data consistency**: Ensure invite state is always accurate