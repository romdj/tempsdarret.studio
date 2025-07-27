# Photography Platform - Event-Driven Architecture with Kafka

## Technology Stack

**Backend Framework:** Fastify v5.4.0 (high-performance, TypeScript-first)  
**Schema Definition:** TypeSpec v1.2.1 → OpenAPI 3.0 generation  
**Database:** MongoDB with Mongoose v8.16.4  
**Authentication:** Magic Links (JWT-based)  
**Event Streaming:** Kafka (for service communication)  
**File Storage:** Sharp v0.34.3 for image processing  
**Validation:** Zod v4.0.10 schemas  
**Security:** bcryptjs v3.0.2, Helmet, Rate limiting  

---

## Core Microservices & Their Responsibilities

### 1. User Service (Authentication + User Management)
- **Authentication**: Handle magic link validation and token issuance
- **User profiles**: Manage client and admin user data
- **Session management**: JWT token lifecycle and validation
- **Publish events**: `user.created`, `user.authenticated`, `user.session-expired`
- **Subscribe to**: `invite.accepted` → activate user access

### 2. Invite Service (Magic Link Management)
- **Magic link generation**: Create secure tokens for client access
- **Invite workflows**: Send invites, track status, handle expiration
- **Client onboarding**: Link invites to shoots and users
- **Publish events**: `invite.created`, `invite.sent`, `invite.accepted`, `invite.expired`
- **Subscribe to**: `shoot.created` → enable client access

### 3. Shoot Service (Core Business Logic)
- **Shoot lifecycle**: Create, update, manage photography shoots
- **Client assignment**: Link clients to their specific shoots
- **Gallery organization**: Structure photos within shoots for client access
- **Access control**: Manage permissions and expiration
- **Publish events**: `shoot.created`, `shoot.updated`, `shoot.published`, `shoot.archived`
- **Subscribe to**: `file.uploaded`, `user.created`, `invite.accepted`

### 4. File Service (Large File Management + Archives)
- **File uploads**: Handle 25MB+ RAW files with multi-resolution processing
- **Storage management**: Self-hosted files with `/shoots/{shootId}/` structure
- **Archive generation**: Create 50-300GB ZIP packages (JPEGs, RAWs, complete)
- **Streaming downloads**: Resumable downloads with HTTP range support
- **Publish events**: `file.uploaded`, `file.processed`, `archive.ready`, `file.downloaded`
- **Subscribe to**: `shoot.created` → enable file uploads, `archive.requested`

### 5. Portfolio Service (Public Website)
- **Public portfolio**: Curated work for marketing and SEO
- **Category management**: Weddings, portraits, corporate, landscapes
- **SEO optimization**: Meta tags, structured data, sitemaps
- **Publish events**: `portfolio.updated`, `portfolio.published`
- **Subscribe to**: `shoot.published` → add to public portfolio

### 6. Notification Service (Client Communications)
- **Magic link delivery**: Send secure access links to clients
- **Status notifications**: Shoot ready, archive generated, access expiring
- **Communication channels**: Email (primary), SMS (optional)
- **Subscribe to**: `invite.created`, `archive.ready`, `shoot.delivered`, `invite.expiring`

### 7. Content Management Service (CMS)
- **Email templates**: Invitation emails, notification templates, branded content
- **Content management**: Configurable text, branding, terms of service
- **Template rendering**: Dynamic content injection for personalized emails
- **Configuration storage**: System settings, feature flags, business rules
- **API endpoints**: Template fetching, content updates, configuration management
- **No event subscription**: Provides content via direct API calls to other services

### 8. API Gateway / BFF (Backend For Frontend)
- **Client portal**: `/portfolio?ref={shootId}` access pattern
- **Admin dashboard**: Shoot management, client oversight, analytics
- **Authentication proxy**: Magic link validation and session management
- **File access**: Secure file serving with permission validation
- **API aggregation**: Combine data from multiple services  

---

## Photography Platform Event Flows

### 1. Complete Shoot Workflow (Admin → Client Delivery)

**Phase 1: Shoot Creation**
1. Admin creates shoot → Shoot Service publishes `shoot.created`
2. Invite Service subscribes → generates magic link for client access
3. File Service subscribes → enables file upload for shoot
4. Notification Service subscribes → sends welcome email to client

**Phase 2: File Processing** 
1. Admin uploads files → File Service processes and publishes `file.uploaded`
2. Shoot Service subscribes → updates shoot photo count
3. File Service completes processing → publishes `file.processed`
4. Shoot Service subscribes → marks shoot as "ready for client"

**Phase 3: Client Access**
1. Client clicks magic link → User Service validates and publishes `user.authenticated`
2. Shoot Service enables gallery access → publishes `shoot.accessed`
3. Client views/downloads → File Service publishes `file.downloaded`

**Phase 4: Large Archive Generation**
1. Client requests complete archive → Shoot Service publishes `archive.requested`
2. File Service generates 50-300GB ZIP → publishes `archive.ready`
3. Notification Service sends download link → client downloads via resumable HTTP

### 2. Magic Link Authentication Flow

1. Client accesses `/portfolio?ref={shootId}` 
2. API Gateway calls User Service for magic link validation
3. User Service validates token → publishes `user.authenticated`
4. Shoot Service checks access permissions → enables gallery view
5. File Service validates download permissions → serves files securely

---

## Photography Platform Kafka Topics

| Topic Name           | Description                         | Producers              | Consumers                        |
|----------------------|------------------------------------|------------------------|----------------------------------|
| **Shoot Lifecycle** |                                    |                        |                                  |
| `shoot.created`      | New photography shoot created      | Shoot Service          | Invite, File, Notification      |
| `shoot.updated`      | Shoot details modified             | Shoot Service          | Portfolio, Notification         |
| `shoot.published`    | Shoot made public for portfolio    | Shoot Service          | Portfolio Service                |
| `shoot.archived`     | Shoot moved to archived status     | Shoot Service          | File (cleanup), Notification    |
| **Authentication**   |                                    |                        |                                  |
| `user.created`       | Client user account created       | User Service           | Shoot, Invite                    |
| `user.authenticated` | Magic link validation success      | User Service           | Shoot, File                      |
| `user.session-expired` | User session timeout             | User Service           | API Gateway                      |
| **Magic Links**      |                                    |                        |                                  |
| `invite.created`     | Magic link generated for client    | Invite Service         | Notification                     |
| `invite.sent`        | Magic link email dispatched       | Notification Service   | Monitoring                       |
| `invite.accepted`    | Client used magic link            | User Service           | Shoot, File                      |
| `invite.expiring`    | Magic link expires soon (7 days)  | Invite Service         | Notification                     |
| **File Operations**  |                                    |                        |                                  |
| `file.uploaded`      | New file uploaded to shoot         | File Service           | Shoot, Notification              |
| `file.processed`     | Multi-resolution processing done   | File Service           | Shoot, Notification              |
| `file.downloaded`    | Client downloaded file             | File Service           | Shoot (analytics)                |
| `file.deleted`       | File removed from shoot            | File Service           | Shoot (update counts)            |
| **Large Archives**   |                                    |                        |                                  |
| `archive.requested`  | Client requested 50-300GB archive  | Shoot Service          | File Service                     |
| `archive.queued`     | Archive generation queued          | File Service           | Notification                     |
| `archive.ready`      | Large archive ready for download   | File Service           | Notification                     |
| `archive.downloaded` | Large archive downloaded           | File Service           | Shoot (analytics)                |
| `archive.expired`    | Archive automatically cleaned up   | File Service           | Shoot, Monitoring                |
| **Public Portfolio** |                                    |                        |                                  |
| `portfolio.updated`  | Public portfolio content changed   | Portfolio Service      | Notification (admin)             |
| **Notifications**    |                                    |                        |                                  |
| `notification.sent`  | Email/SMS notification delivered   | Notification Service   | Monitoring                       |

---

## Architecture Decisions & Rationale

### ✅ **Consolidated Authentication** (No Separate Auth Service)
- **User Service handles authentication** directly (magic links, JWT tokens)
- **Simpler architecture**: One less service to maintain
- **Photography-focused**: Magic links are the primary auth method
- **Session management**: Built into user service for efficiency

### ✅ **Self-Hosted File Storage** 
- **Cost control**: No cloud fees for 150GB+ photo collections
- **Direct serving**: Nginx handles file delivery efficiently
- **Large files**: 50-300GB archives with resumable downloads
- **Privacy**: Complete control over client photo access

### ✅ **Event-Driven Large File Processing**
- **Async processing**: Non-blocking 25MB+ file uploads
- **Archive queuing**: Background generation of massive ZIP files
- **Client notifications**: Real-time updates when archives are ready
- **Cleanup automation**: Scheduled removal of expired archives

## Photography Platform Considerations

### Large File Handling
- **Streaming uploads**: Handle 25MB+ RAW files without memory issues
- **Multi-resolution processing**: Generate 4 variants asynchronously
- **Archive segmentation**: Consider 2GB chunks for 300GB archives
- **HTTP Range requests**: Resumable downloads for large files

### Client Experience
- **Mobile-first galleries**: Primary client access via mobile devices
- **Passwordless access**: Magic links eliminate password friction
- **Privacy controls**: Isolated access per shoot with expiration
- **Download tracking**: Monitor client engagement and file access

### Business Intelligence
- **Event sourcing**: Complete audit trail of client interactions
- **Analytics events**: Track downloads, gallery views, archive requests
- **Performance monitoring**: File processing times, archive generation
- **Client behavior**: Access patterns, favorite photos, download preferences

## Technical Implementation Notes

### Kafka Best Practices
- **Consumer groups**: Scale file processing and notification delivery
- **Idempotency**: Prevent duplicate file processing and notifications
- **Dead letter queues**: Handle failed archive generation gracefully  
- **Schema evolution**: Use Avro for event schema management
- **Partitioning**: Partition by shootId for ordered processing

### Database Design
- **MongoDB collections**: Users, Shoots, Files, Archives, Invites
- **Indexing strategy**: shootId, userId, fileId, createdAt
- **File metadata**: Store paths, not content in database
- **Archive tracking**: Status, progress, expiration, download count

### Monitoring & Observability
- **File operation metrics**: Upload success rates, processing times
- **Archive generation**: Queue depth, generation times, failure rates
- **Client access patterns**: Gallery views, download success, mobile usage
- **System health**: Service availability, Kafka lag, storage usage

---

This architecture is specifically designed for a **photography business** with **large files**, **client privacy**, and **mobile-first experience** as core requirements.  
