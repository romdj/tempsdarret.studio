# ADR-004: MongoDB with Mongoose for Data Persistence

## Status
Accepted

Date: 2025-08-09

## Context
The photography platform needs to store diverse data types including user profiles, photo metadata, shoot information, client access permissions, and business workflows. The data has varying structures - photo metadata can be highly flexible (different cameras, lenses, settings), shoot information has complex relationships, and client permissions need to be document-centric. The platform needs to scale horizontally as the photography business grows, and the team prefers working with JSON-native data structures that match JavaScript/TypeScript naturally.

## Decision
Use MongoDB v8.16.4 with Mongoose ODM for all data persistence across microservices:

- Each microservice owns its MongoDB database to ensure data isolation
- Mongoose provides schema validation and TypeScript integration
- Document-based storage for flexible photography metadata
- Built-in indexing for photo search and client access patterns
- Horizontal scaling capability as business grows

Key implementation:
- User Service: User profiles, authentication data, role information
- Shoot Service: Shoot details, scheduling, client associations
- File Service: Photo metadata, processing status, storage locations
- Invite Service: Magic link tokens, invitation lifecycle data
- Portfolio Service: Gallery configurations, client access permissions

## Alternatives Considered

- **PostgreSQL with Prisma/TypeORM**: Relational database with ORM
  - Rejected: Rigid schema doesn't fit flexible photo metadata needs, JSON support is adequate but not native
- **MySQL with Sequelize**: Traditional relational database
  - Rejected: Similar schema rigidity issues, less suitable for document-heavy photography data
- **DynamoDB**: AWS managed NoSQL database
  - Rejected: Vendor lock-in, complex query patterns, cost concerns for small business
- **Supabase**: PostgreSQL with real-time features
  - Rejected: Vendor dependency, real-time features not needed for photography workflow
- **Redis as Primary Store**: In-memory data store
  - Rejected: Not suitable for persistent photography data, memory constraints for large photo collections

## Consequences

### Positive
- Flexible schema perfect for photography metadata (camera settings, EXIF data, custom fields)
- JSON-native storage matches TypeScript/JavaScript development naturally
- Horizontal scaling capability as photography business grows
- Rich querying for photo search, client filtering, date ranges
- Document-based permissions model fits photography access patterns well
- Each service can have its own database for true microservice independence
- Strong community and ecosystem with photography-related libraries

### Negative
- No ACID transactions across documents (eventual consistency challenges)
- Learning curve for team members familiar with SQL databases
- Potential for inconsistent data without careful schema design
- Memory usage can be high with large photo metadata documents
- Query optimization requires MongoDB-specific knowledge
- Backup and recovery procedures different from traditional databases

### Neutral
- Need for robust MongoDB administration skills
- Mongoose adds abstraction layer that may hide MongoDB-specific optimizations
- Schema versioning and migration strategies required

## Implementation Notes
- Each microservice connects to its own MongoDB database instance
- Mongoose schemas defined with TypeScript interfaces for type safety
- Indexes created for common photography access patterns (by date, client, photographer)
- Connection pooling configured per service based on expected load
- Consistent error handling for MongoDB connection and query failures

Database naming convention: `tempsdarret_[service]` (e.g., `tempsdarret_users`, `tempsdarret_shoots`)

Critical indexes:
- Users: email, role, isActive
- Shoots: photographerId, clientId, scheduledDate, status
- Files: shootId, filename, isProcessed, createdAt
- Invitations: email, token, expiresAt

## Related Decisions
- [ADR-001: Microservices Architecture](./adr-001-microservices-architecture.md)
- [ADR-012: TypeScript as Primary Language](./adr-012-typescript-language.md)

## References
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [Mongoose TypeScript Guide](https://mongoosejs.com/docs/typescript.html)
- [Data Modeling in MongoDB](https://docs.mongodb.com/manual/core/data-modeling-introduction/)