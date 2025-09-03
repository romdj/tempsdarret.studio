# ADR-019: Event Sourcing for Business Audit Trail

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform handles critical business operations including shoot bookings, client data, file processing, and financial transactions. We need comprehensive audit capabilities for compliance, debugging, and business intelligence while supporting the event-driven architecture established in ADR-009.

### Audit Requirements
- **Complete business event history** for regulatory compliance
- **Time-travel debugging** for complex workflow issues
- **Business analytics** from historical event data
- **GDPR compliance** with data deletion capabilities
- **Immutable audit trail** preventing data tampering

## Decision

We will implement **Event Sourcing** as our primary audit trail mechanism, storing all business events in Kafka topics with long-term retention, enabling complete system state reconstruction and comprehensive business auditing.

## Rationale

### Photography Business Event Sourcing

```typescript
// Core business events that need audit trails
interface ShootBusinessEvents {
  ShootCreated: {
    shootId: string;
    clientEmail: string;
    photographerId: string;
    scheduledDate?: Date;
    contractValue: Money;
  };
  
  ShootStatusChanged: {
    shootId: string;
    fromStatus: ShootStatus;
    toStatus: ShootStatus;
    changedBy: string;
    reason?: string;
  };
  
  PaymentReceived: {
    shootId: string;
    amount: Money;
    paymentMethod: string;
    transactionId: string;
  };
  
  FilesDelivered: {
    shootId: string;
    deliveryMethod: string;
    fileCount: number;
    totalSizeGB: number;
    deliveredTo: string;
  };
}
```

### Complete Audit Trail Implementation

```typescript
// Event store with business context
class BusinessEventStore {
  async appendEvent<T>(
    streamId: string,
    eventType: string,
    eventData: T,
    metadata: EventMetadata
  ): Promise<void> {
    const event: BusinessEvent = {
      eventId: generateEventId(),
      streamId,
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      version: await this.getNextVersion(streamId),
      metadata: {
        ...metadata,
        userId: metadata.userId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        businessContext: metadata.businessContext
      }
    };

    await this.kafkaProducer.send({
      topic: 'business-events',
      key: streamId,
      value: JSON.stringify(event),
      headers: {
        eventType,
        streamId,
        version: event.version.toString()
      }
    });
  }
}
```

## Implementation Guidelines

### Event Store Architecture

```yaml
# Kafka topic configuration for event sourcing
business-events:
  partitions: 12
  replication-factor: 3
  retention-ms: 31536000000  # 1 year retention
  cleanup-policy: compact    # Retain all events
  
financial-events:
  partitions: 6  
  replication-factor: 3
  retention-ms: 157680000000 # 5 year retention (regulatory)
  cleanup-policy: compact
  
client-events:
  partitions: 6
  replication-factor: 3
  retention-ms: 94608000000  # 3 year retention (GDPR)
  cleanup-policy: compact
```

### Read Model Projections

```typescript
// Business intelligence projections
class ShootAnalyticsProjection {
  async handleShootCreated(event: ShootCreatedEvent): Promise<void> {
    await this.analyticsDb.updateShootMetrics({
      month: getMonth(event.scheduledDate),
      photographerId: event.photographerId,
      totalShoots: { $inc: 1 },
      totalRevenue: { $inc: event.contractValue.amount },
      clientTypes: { $addToSet: this.classifyClient(event.clientEmail) }
    });
  }

  async handlePaymentReceived(event: PaymentReceivedEvent): Promise<void> {
    await this.analyticsDb.updateRevenueMetrics({
      shootId: event.shootId,
      paymentDate: event.timestamp,
      amount: event.amount,
      method: event.paymentMethod
    });
  }
}
```

## Trade-offs

### Benefits Gained
- **Complete audit trail** for all business operations
- **Time-travel debugging** capabilities for complex issues
- **Business analytics** from comprehensive event history
- **Regulatory compliance** with immutable event records

### Accepted Trade-offs
- **Storage overhead** from event retention requirements
- **Query complexity** for current state reconstruction
- **Event schema evolution** challenges over time

## Consequences

Event sourcing provides comprehensive business auditing while supporting our event-driven microservices architecture, enabling both compliance and business intelligence capabilities.