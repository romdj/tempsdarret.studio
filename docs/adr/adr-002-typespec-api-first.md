# ADR-002: TypeSpec for API-First Development

## Status
Accepted

Date: 2025-08-09

## Context
The photography platform requires strong API contracts between frontend and backend services, as well as between microservices. With multiple team members working on different services, we need a way to ensure type safety, generate documentation, and maintain consistency across APIs. The platform handles complex data structures for photography metadata, client permissions, and business workflows that require precise type definitions.

## Decision
Use TypeSpec v1.3.0 as the primary tool for API contract definition, generating OpenAPI 3.0 specifications, TypeScript types, and documentation. All REST APIs will be defined in TypeSpec first, then implementation will follow the generated contracts.

Key implementation details:
- TypeSpec models define all API request/response schemas
- Automatic generation of OpenAPI 3.0 specifications
- TypeScript type generation for both frontend and backend
- Documentation generation for API consumers
- Validation schema generation from TypeSpec models

## Alternatives Considered

- **OpenAPI YAML/JSON**: Hand-written OpenAPI specifications
  - Rejected: More verbose, error-prone, no compile-time checking, harder to maintain
- **GraphQL Schema**: GraphQL with schema-first development
  - Rejected: Overkill for REST APIs, additional complexity, learning curve for team
- **Code-First with Decorators**: Generate API docs from TypeScript code
  - Rejected: Documentation tends to lag behind implementation, less precise contracts
- **Protobuf**: Protocol Buffers for API definitions
  - Rejected: More suitable for gRPC, doesn't fit REST API patterns well
- **JSON Schema**: Pure JSON Schema for API definitions
  - Rejected: Less ergonomic than TypeSpec, no TypeScript generation built-in

## Consequences

### Positive
- Single source of truth for API contracts across all services
- Type safety from API definition to implementation
- Automatic documentation generation keeps docs in sync with implementation
- Excellent TypeScript integration for frontend development
- Contract-first development prevents API drift
- Validation schemas generated automatically from models
- Better collaboration between frontend and backend teams through clear contracts

### Negative
- Additional build step and tooling complexity
- Learning curve for TypeSpec syntax and concepts
- TypeSpec tooling is relatively new (potential breaking changes)
- Build pipeline dependency on TypeSpec compilation
- May be over-engineering for very simple CRUD operations

### Neutral
- Need to maintain TypeSpec models alongside implementation
- Requires discipline to update TypeSpec first, then implementation

## Implementation Notes
- TypeSpec models are defined in `packages/models/main.tsp`
- Build process generates OpenAPI specs to `packages/models/dist/openapi.json`
- Generated types are consumed by both frontend and backend services
- API Gateway uses generated OpenAPI specs for request validation
- Documentation is auto-generated and served at `/docs/api/`

Migration approach:
1. Define existing APIs in TypeSpec
2. Generate types and update services to use them
3. Implement new APIs with TypeSpec-first approach

## Related Decisions
- [ADR-012: TypeScript as Primary Language](./adr-012-typescript-language.md)
- [ADR-024: Schema-First Development](./adr-024-schema-first-development.md)
- [ADR-013: API Gateway Pattern](./adr-013-api-gateway-pattern.md)

## References
- [TypeSpec Documentation](https://typespec.io/)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [API Design Guidelines by Microsoft](https://github.com/Microsoft/api-guidelines)