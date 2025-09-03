# ADR-023: AsyncAPI for Event Schema Definition

## Status
Accepted

Date: 2025-08-09

## Context
The photography platform uses event-driven architecture with Kafka for business workflows (shoot creation, file processing, client invitations). Events carry complex business data that must be consistently structured across services. The team needs:

- Standardized event schema definitions
- Documentation for event consumers and producers  
- Validation of event payloads
- Version management for schema evolution
- Integration with existing TypeScript/OpenAPI toolchain

The platform has multiple event types (shoot.created, file.uploaded, invitation.created) with different payload structures that need clear contracts.

## Decision
Use AsyncAPI 3.0 for defining all event schemas and generating documentation:

- Single `asyncapi.yaml` file in `packages/events/` defining all business events
- JSON Schema for event payload definitions  
- AsyncAPI CLI for documentation generation and validation
- HTML documentation generation integrated with build process
- Event schema validation in services consuming events

Key implementation:
```yaml
# Event channels for business domains
channels:
  shoots: shoot.created, shoot.completed, shoot.delivered
  files: file.uploaded, file.processed
  invitations: invitation.created, invitation.used
```

## Alternatives Considered

- **TypeSpec for Events**: Extend TypeSpec to generate AsyncAPI schemas
  - Rejected: TypeSpec focus is REST APIs, AsyncAPI integration not mature, would require custom tooling
- **JSON Schema Files**: Separate JSON Schema files for each event type  
  - Rejected: No unified documentation, missing event flow visualization, harder to maintain relationships
- **Protocol Buffers**: Protobuf schemas for events
  - Rejected: Doesn't fit JSON/JavaScript ecosystem, learning curve, tooling complexity
- **Avro Schemas**: Apache Avro for schema evolution
  - Rejected: Java ecosystem focused, doesn't integrate well with TypeScript development
- **OpenAPI for Events**: Misuse OpenAPI for event documentation
  - Rejected: OpenAPI is request-response focused, doesn't model event flows properly

## Consequences

### Positive
- Industry standard for event documentation (AsyncAPI is widely adopted)
- Excellent tooling ecosystem for validation, documentation, code generation
- HTML documentation provides clear event flow visualization for team
- JSON Schema compatibility allows reuse of validation logic
- Schema versioning support for business event evolution
- Integration with existing npm build pipeline
- Clear separation between API contracts (TypeSpec) and Event contracts (AsyncAPI)

### Negative
- Additional tooling complexity in build pipeline
- Team needs to learn AsyncAPI specification format
- Schema changes require coordination across event producers and consumers
- No automatic TypeScript type generation (requires manual sync)
- Event schema validation adds runtime overhead

### Neutral
- Need to maintain AsyncAPI schemas alongside service implementations
- Documentation generation requires build step integration

## Implementation Notes
Event documentation structure:
- `packages/events/asyncapi.yaml` - Central event schema definition
- Generated documentation at `docs/events/index.html` 
- AsyncAPI CLI integrated into npm build scripts
- Schema validation in Kafka consumers using JSON Schema

Event naming conventions:
- Format: `{domain}.{action}` (e.g., `shoot.created`, `file.processed`)
- Payload schemas: `{EventName}Payload` (e.g., `ShootCreatedPayload`)
- Consistent metadata: `eventId`, `timestamp`, `version` in all events

Build integration:
```json
{
  \"scripts\": {
    \"docs:events\": \"asyncapi generate fromTemplate asyncapi.yaml @asyncapi/html-template -o ../../docs/events\",
    \"validate:events\": \"asyncapi validate asyncapi.yaml\"
  }
}
```

## Related Decisions
- [ADR-009: Kafka Event-Driven Communication](./adr-009-kafka-event-driven.md)
- [ADR-002: TypeSpec API-First Development](./adr-002-typespec-api-first.md) 
- [ADR-019: Event Sourcing for Audit Trail](./adr-019-event-sourcing-audit.md)

## References
- [AsyncAPI 3.0 Specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [AsyncAPI Best Practices](https://www.asyncapi.com/docs/guides/message-validation)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-sourcing.html)