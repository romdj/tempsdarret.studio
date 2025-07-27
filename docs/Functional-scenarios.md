# Functional Scenarios - Temps D'arrêt Studio

This document outlines the key functional scenarios for the photography platform, providing detailed workflows and sequence diagrams for implementation guidance.

## Overview

The platform supports the complete photography business workflow from initial client contact to final photo delivery. Each scenario represents a critical user journey that must be implemented and tested.

## User Roles

- **Photographer**: Admin user who manages shoots and uploads photos
- **Client**: Primary user who commissioned the photography session
- **Guest**: Invited by client, limited access (print-quality downloads only)
- **Portfolio Visitor**: Public website visitor (out of scope for services - handled by frontend)

## Core Scenarios

### Scenario 1: Photographer Creates New Shoot and Invites Client
**Goal**: Enable photographer to create a photography session and invite client with secure access

**Actors**: Photographer (Admin), Client
**Preconditions**: Photographer is authenticated
**Postconditions**: Client receives magic link invitation and can access their gallery

**Diagram**: [01-shoot-creation-and-invitation.mmd](./diagrams/01-shoot-creation-and-invitation.mmd)

### Scenario 2: Client Accesses Gallery via Magic Link
**Goal**: Secure, passwordless client access to their specific photos

**Actors**: Client
**Preconditions**: Client has received magic link email
**Postconditions**: Client is authenticated and viewing their gallery

**Diagram**: [02-client-magic-link-access.mmd](./diagrams/02-client-magic-link-access.mmd)

### Scenario 3: Client Invites Guests with Limited Access
**Goal**: Enable client to share photos with family/friends with restricted permissions

**Actors**: Client, Guest
**Preconditions**: Client has access to shoot gallery
**Postconditions**: Guest receives invitation and can view/download print-quality photos only

**User Role**: `guest` 
**Permissions**: 
- View gallery (high/medium resolution)
- Download print-quality images (high resolution)
- NO archive download access
- NO original/RAW file access

**Diagram**: [03-client-invites-guests.mmd](./diagrams/03-client-invites-guests.mmd)

### Scenario 4: Photographer Uploads and Processes Photos
**Goal**: Bulk photo upload with automatic multi-resolution processing

**Actors**: Photographer
**Preconditions**: Shoot exists and is in progress
**Postconditions**: Photos are processed, stored, and client is notified

**Diagram**: [04-photo-upload-and-processing.mmd](./diagrams/04-photo-upload-and-processing.mmd)

### Scenario 5: Client/Guest Downloads Individual Photos
**Goal**: Secure photo download with role-appropriate resolution options

**Actors**: Client, Guest
**Preconditions**: User is authenticated and has access to shoot
**Postconditions**: Photos are downloaded with proper tracking and resolution limits

**Download Permissions**:
- **Client**: All resolutions (original, high, medium, thumb) + RAW files
- **Guest**: Print-quality only (high, medium, thumb) - NO original/RAW

**Diagram**: [05-photo-download-by-role.mmd](./diagrams/05-photo-download-by-role.mmd)

### Scenario 6: Client Requests Complete Archive (Clients Only)
**Goal**: Generate and deliver large ZIP archive (50-300GB) of all photos

**Actors**: Client only (Guests cannot access archives)
**Preconditions**: Client has shoot access, shoot is completed
**Postconditions**: Archive is generated and download link provided

**Diagram**: [06-archive-generation-client-only.mmd](./diagrams/06-archive-generation-client-only.mmd)

### Scenario 7: Photographer Manages Public Portfolio
**Goal**: Curate and publish selected photos for marketing website

**Actors**: Photographer
**Preconditions**: Photos exist in various shoots
**Postconditions**: Public portfolio is updated with new content

**Note**: Portfolio visitors (public website users) are out of scope for services - handled by frontend as static content.

**Diagram**: [07-portfolio-management.mmd](./diagrams/07-portfolio-management.mmd)

### Scenario 8: Magic Link Expiration and Renewal
**Goal**: Handle expired access and provide renewal mechanism

**Actors**: Client, Guest, Photographer
**Preconditions**: Magic link has expired or will expire soon
**Postconditions**: User receives new access link with appropriate permissions

**Diagram**: [08-magic-link-renewal.mmd](./diagrams/08-magic-link-renewal.mmd)

### Scenario 9: Shoot Lifecycle Management
**Goal**: Complete shoot workflow from planning to archival

**Actors**: Photographer, Client, Guests
**Preconditions**: Photography business workflow
**Postconditions**: Shoot progresses through all lifecycle stages

**Diagram**: [09-shoot-lifecycle-management.mmd](./diagrams/09-shoot-lifecycle-management.mmd)

## Service Interactions Summary

### Core Services
- **User Service**: Authentication, user management, magic links, role-based permissions
- **Shoot Service**: Photography session lifecycle and metadata
- **File Service**: Upload, processing, storage, and role-based delivery
- **Invite Service**: Magic link generation for clients and guests
- **Portfolio Service**: Public content curation (services only - not public visitors)
- **Notification Service**: Email communications and status updates
- **Content Management Service (CMS)**: Email templates, content management, configuration

### User Role Management
```typescript
type UserRole = 'photographer' | 'client' | 'admin' | 'guest';

interface PermissionMatrix {
  photographer: ['all']; // Full access to everything
  client: ['view', 'download_all', 'download_archive', 'invite_guests'];
  guest: ['view', 'download_print_quality']; // NO archive, NO original/RAW
  admin: ['all']; // System admin
}
```

### Event-Driven Architecture
**Event Bus**: Kafka handles all inter-service communication

**Event Flows**:
1. **Shoot Creation**: `shoot.created` → User Service, Invite Service
2. **User Management**: `user.created`, `user.verified` → Invite Service
3. **Invitation Process**: `invite.created` → Notification Service
4. **File Processing**: `file.uploaded` → `file.processed` → Shoot Service
5. **Notifications**: `invite.sent`, `notification.delivered` → Monitoring

**Direct API Calls** (Limited):
- API Gateway ↔ Services (command handling only)
- Notification Service ↔ CMS (template fetching)
- File Service ↔ CMS (content metadata)

## Implementation Priority

### Phase 1: Core Authentication (Scenarios 1-2)
- User Service with magic link authentication and role system
- Invite Service for secure client access
- Basic Shoot Service for session management

### Phase 2: Guest System (Scenario 3)
- Extend User Service for guest role management
- Client-initiated guest invitations
- Role-based permission validation

### Phase 3: File Management (Scenarios 4-5)
- File Service with upload and multi-resolution processing
- Role-based download mechanisms (client vs guest permissions)
- Client gallery interface with guest management

### Phase 4: Advanced Features (Scenarios 6-7)
- Client-only archive generation and delivery
- Portfolio management for marketing content
- Advanced notification system

### Phase 5: Operations (Scenarios 8-9)
- Magic link lifecycle management for all roles
- Complete shoot workflow automation
- Performance optimization and monitoring

## Out of Scope for Services

### Public Portfolio Website
- **Static content delivery**: Handled by frontend/CDN
- **SEO and marketing pages**: Frontend responsibility
- **Anonymous visitors**: No authentication required
- **Contact forms**: Frontend → API Gateway (simple endpoint)

The services focus on authenticated workflows and business logic, not public marketing website functionality.

## Testing Strategy

Each scenario includes:
- **Unit Tests**: Individual service components with role validation
- **Integration Tests**: Service-to-service communication with permission checks
- **End-to-End Tests**: Complete user workflows for each role
- **Performance Tests**: Large file handling and archive generation
- **Security Tests**: Authentication, authorization, and role-based access control

## Technical Considerations

### Role-Based Security
- Magic links contain role information
- File downloads validate user permissions
- Archive access restricted to clients only
- Guest permissions explicitly limited

### Scalability
- Microservice architecture enables independent scaling
- File processing can be horizontally scaled with role validation
- Archive generation uses background job queues with client-only access

### Performance
- Multi-resolution image processing for role-appropriate delivery
- Progressive image loading based on user permissions
- Resumable downloads for large files (client role only)
- CDN integration for role-appropriate assets

---

*This document serves as the blueprint for implementing the photography platform's core functionality with proper service separation, role-based access control, and clear user workflows.*