# Kafka Event Infrastructure

## Overview
Event-driven messaging backbone for microservices communication. Provides governance, data modeling standards, and pub-sub patterns for the photography portfolio platform.

## Event-Driven Architecture Philosophy

### Why Event-Driven for Photography Business
- **Async workflows**: File processing doesn't block user uploads
- **Client experience**: Automatic notifications when photos are ready  
- **Business insights**: Track client engagement and popular content
- **Service isolation**: Each service operates independently
- **Audit compliance**: Complete event history for business records

## Event Governance

### Event Naming Convention
```
{domain}.{entity}.{action}
auth.user.logged-in
file.media.processed
project.invite.sent
analytics.download.completed
```

### Event Ownership
- **File Service**: Owns file.* events (upload, processing, deletion)
- **User Service**: Owns auth.* events (login, access, permissions)
- **Invite Service**: Owns project.invite.* events
- **Notification Service**: Consumes events, doesn't own domain events
- **Analytics Service**: Consumes all events for business intelligence

### Data Consistency Rules
- **Event ordering**: Use partition keys for related events
- **Idempotency**: All consumers must handle duplicate events gracefully
- **Backward compatibility**: Never break existing event schemas
- **Retention**: Business events kept for 30 days, analytics events for 1 year

## Event Schema Modeling

### Standard Event Envelope
```typescript
interface BusinessEvent<T> {
  // Event identification
  id: string;                    // Unique event ID
  type: string;                  // Event type (domain.entity.action)
  source: string;                // Originating service
  
  // Business context
  aggregateId: string;           // Primary entity ID (projectId, userId, etc.)
  aggregateType: string;         // Entity type (project, user, media)
  
  // Event data
  data: T;                       // Event-specific payload
  
  // Metadata
  metadata: {
    correlationId?: string;      // Trace across services
    causationId?: string;        // Event that caused this event
    userId?: string;             // Who triggered the event
    timestamp: Date;             // When event occurred
    version: string;             // Schema version for evolution
  };
}
```

### Domain Event Examples

#### File Processing Domain
```typescript
// File uploaded to project
type FileUploadedEvent = BusinessEvent<{
  projectId: string;
  mediaId: string;
  originalFileName: string;
  fileSizeBytes: number;
  uploadedBy: string;
}>;

// All resolutions processed
type FileProcessedEvent = BusinessEvent<{
  projectId: string;
  mediaId: string;
  resolutions: ('original' | 'high' | 'medium' | 'thumb')[];
  processingTimeMs: number;
  totalSizeBytes: number;
}>;
```

#### Client Access Domain
```typescript
// Magic link generated for project access
type MagicLinkCreatedEvent = BusinessEvent<{
  projectId: string;
  clientEmail: string;
  token: string;
  expiresAt: Date;
  createdBy: string;
}>;

// Client accessed their project
type ProjectAccessedEvent = BusinessEvent<{
  projectId: string;
  clientEmail: string;
  accessMethod: 'magic-link' | 'direct-link';
  userAgent: string;
  ipAddress: string;
}>;
```

## Pub-Sub Patterns

### Producer Patterns

#### Fire-and-Forget
```typescript
// For non-critical events like analytics
await eventPublisher.publish('analytics.page-viewed', pageViewEvent);
// Don't wait for confirmation, continue processing
```

#### Guaranteed Delivery
```typescript
// For critical business events
try {
  await eventPublisher.publish('file.uploaded', fileEvent);
  // Only proceed if event was successfully published
  await updateFileStatus('published');
} catch (error) {
  await rollbackFileUpload();
  throw error;
}
```

### Consumer Patterns

#### Single Service Responsibility
```typescript
// File Service only processes file-related events
fileService.subscribe('file.uploaded', processFileEvent);
fileService.subscribe('file.deletion-requested', deleteFileEvent);
```

#### Cross-Service Coordination
```typescript
// Notification Service reacts to events from multiple services
notificationService.subscribe('file.processed', sendPhotosReadyEmail);
notificationService.subscribe('invite.created', sendMagicLinkEmail);
notificationService.subscribe('auth.access-granted', sendWelcomeMessage);
```

#### Event Aggregation
```typescript
// Analytics Service consumes all events for business intelligence
analyticsService.subscribe('file.*', trackFileMetrics);
analyticsService.subscribe('auth.*', trackUserBehavior);  
analyticsService.subscribe('project.*', trackProjectActivity);
```

## Service Communication Patterns

### Command vs Event Flow
```
Command Flow (Synchronous):
Frontend → API Gateway → Service → Database
↓
Response ← API Gateway ← Service ← Database

Event Flow (Asynchronous):  
Service A → Event Published → Kafka → Service B Reacts
                                  → Service C Reacts
                                  → Service D Reacts
```

### When to Use Each Pattern

#### Use Commands (REST/GraphQL) for:
- User-initiated actions requiring immediate feedback
- Data queries and retrievals
- Operations requiring transaction guarantees
- Client needs to know if operation succeeded/failed

#### Use Events (Kafka) for:
- Background processing (file conversion, email sending)
- Cross-service notifications
- Audit logging and analytics
- Eventual consistency scenarios

## Event Sourcing for Business Value

### Client Project Timeline
```typescript
// Reconstruct complete project history from events
const projectHistory = await eventStore.getEvents('project', projectId);

// Business insights:
// - When was project created?
// - How many photos were uploaded over time?
// - When did client first access their photos?
// - How many downloads occurred?
// - What was the total processing time?
```

### Business Analytics Examples
- **Popular project types**: Which categories get most downloads?
- **Client engagement**: How quickly do clients access their photos?
- **Processing efficiency**: Average time from upload to client notification
- **Storage growth**: File storage usage trends over time
- **Revenue correlation**: Which project types have highest client satisfaction?

## Error Handling & Resilience

### Dead Letter Queues
- Failed events automatically routed to error topics
- Manual review and replay capability
- Prevents blocking of healthy event processing

### Circuit Breaker Pattern
- Temporarily stop publishing to failed consumers
- Gradual recovery when downstream services recover
- Maintains overall system stability

### Event Replay Capability
- Reprocess events from specific timestamp
- Recover from service outages or data corruption
- Test new features against historical data

## Implementation Phases

### Phase 1: Core Event Infrastructure
- Set up Kafka cluster with basic governance
- Establish event schema standards and validation
- Implement shared event publisher/consumer libraries
- Create monitoring and alerting for event flows

### Phase 2: Business Event Integration  
- File Service publishes upload/processing events
- User Service publishes authentication events
- Notification Service consumes cross-service events
- Analytics Service begins collecting business metrics

### Phase 3: Advanced Event Patterns
- Implement event sourcing for audit trails
- Add business intelligence dashboards
- Create event-driven workflow automation
- Build client engagement optimization features

---

## Appendix: Technical Implementation

### Docker Compose Configuration
```yaml
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    volumes:
      - kafka_data:/var/lib/kafka/data
```

### Topic Creation Script
```bash
#!/bin/bash
kafka-topics --create --topic file.uploaded --bootstrap-server localhost:9092
kafka-topics --create --topic auth.project-accessed --bootstrap-server localhost:9092
```

### Shared Event Client
```typescript
// shared/src/events/publisher.ts
export class EventPublisher {
  async publish<T>(topic: string, event: BusinessEvent<T>): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key: event.aggregateId, value: JSON.stringify(event) }]
    });
  }
}
```