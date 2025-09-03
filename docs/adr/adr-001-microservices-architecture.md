# ADR-001: Microservices Architecture with Domain-Driven Design

## Status
Accepted

Date: 2025-08-09

## Context
The Temps D'arrêt Studio photography platform needs to handle complex business workflows including client management, photo shoot coordination, file processing, invitation systems, and portfolio management. The platform serves multiple user types (photographers, clients) with different access patterns and requirements. The team needs architectural flexibility to evolve different business domains independently while maintaining system cohesion.

## Decision
Implement a microservices architecture with six specialized services organized around Domain-Driven Design (DDD) principles:

- **User Service**: Client and photographer account management, authentication
- **Invite Service**: Magic link generation and invitation lifecycle management  
- **Shoot Service**: Photo shoot scheduling, coordination, and lifecycle management
- **File Service**: Photo upload, storage, processing, and metadata management
- **Portfolio Service**: Public portfolio display and client gallery access
- **Notification Service**: Email notifications and communication workflows

Each service owns its data, has clear boundaries, and communicates via events through Kafka.

## Alternatives Considered

- **Monolithic Architecture**: Single application with modules
  - Rejected: Would make team scaling and technology choices difficult, deployment coupling
- **Modular Monolith**: Single deployable with well-defined internal modules
  - Rejected: Still couples deployment and technology stack, harder to scale teams
- **Serverless Functions**: AWS Lambda or similar for each business function
  - Rejected: Cold start issues for photo processing, complexity in local development
- **Domain Services with Shared Database**: Microservices sharing data stores
  - Rejected: Violates data ownership principles, creates coupling through shared schema

## Consequences

### Positive
- Clear business domain separation aligns with photography workflow
- Team can work independently on different services
- Technology flexibility per service (different storage, different processing needs)
- Scalability: can scale file processing separately from user management
- Resilience: failure in invitation service doesn't affect photo viewing
- Business alignment: services match actual business processes

### Negative
- Distributed system complexity (network calls, eventual consistency)
- Operational overhead (multiple deployments, monitoring, logging)
- Data consistency challenges across service boundaries
- Local development complexity with multiple services
- Integration testing complexity
- Network latency between services

### Neutral
- Learning curve for team members new to microservices patterns
- Need for robust DevOps and monitoring infrastructure

## Implementation Notes
- Each service has its own MongoDB database to ensure data ownership
- Services communicate via Kafka events for business workflows
- API Gateway provides unified entry point and handles cross-cutting concerns
- Use Docker containers for deployment consistency
- Implement circuit breakers and retry policies for resilience
- Start with synchronous API calls where needed, migrate to events over time

## Related Decisions
- [ADR-009: Kafka for Event-Driven Communication](./adr-009-kafka-event-driven.md)
- [ADR-013: API Gateway Pattern with BFF](./adr-013-api-gateway-pattern.md)
- [ADR-004: MongoDB Data Persistence](./adr-004-mongodb-data-persistence.md)

## References
- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)
- [Domain-Driven Design Principles](https://martinfowler.com/bliki/BoundedContext.html)
- [Building Microservices by Sam Newman](https://samnewman.io/books/building_microservices/)