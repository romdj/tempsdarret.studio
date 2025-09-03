# ADR-024: Microservice Functional Directory Structure

## Status

Accepted

## Date

2025-09-03

## Context

Our microservices currently use a mixed directory structure approach with some services using feature-based directories (`src/features/shoots/`) and others using ad-hoc organization. As we scale our microservice architecture, we need a consistent, simple directory structure that:

1. Matches the complexity of our focused microservices
2. Optimizes for business feature development speed
3. Provides clear separation without over-engineering
4. Maintains the feature-based contract organization established in ADR-023
5. Supports our "start small, refactor later" development philosophy

We evaluated several approaches including layered architecture, hexagonal architecture, input/output boundaries, and functional structures.

## Decision

We will adopt a **Functional Directory Structure** for all microservices, organized by the function each component serves in the request-response flow.

### Standard Microservice Structure

```
src/
├── handlers/           # Request handlers (HTTP controllers)
├── services/           # Business logic and use cases  
├── persistence/        # Data access layer (repositories, models)
├── events/            # Event handling
│   ├── publishers/    # Event publishers (Kafka producers)
│   └── consumers/     # Event consumers (Kafka consumers)
├── shared/            # Cross-cutting concerns
│   ├── contracts/     # Feature-based API contracts (per ADR-023)
│   ├── messaging/     # Messaging infrastructure
│   ├── middleware/    # Shared middleware
│   └── utils/         # Utility functions
├── config/            # Configuration management
└── main.ts           # Application entry point
```

### Request Flow Pattern

The structure enforces a predictable request flow:
```
HTTP Request → handlers/ → services/ → persistence/ → events/publishers/
```

### Contract Organization

Maintains the feature-based contract organization from ADR-023:
```
src/shared/contracts/
├── shoots.api.ts      # All shoot API types with TypeSpec imports
├── shoots.events.ts   # All shoot events mapping to AsyncAPI  
├── shoots.mongoose.ts # All shoot database schemas
└── shoots.dto.ts      # All shoot DTOs
```

## Rationale

### Why Functional Structure

1. **Business Flow Clarity**: Easy to trace a feature end-to-end through predictable directories
2. **Minimal Abstraction**: No unnecessary layers for simple CRUD operations
3. **Feature Development Speed**: Related functionality is co-located and easy to find
4. **Simple Mental Model**: Each directory has a clear, single purpose
5. **Easy Debugging**: Predictable request flow makes troubleshooting straightforward

### Why Not Alternatives

- **Layered Architecture**: Too complex for focused microservices with simple business logic
- **Hexagonal Architecture**: Over-engineering for our current CRUD-heavy services
- **Input/Output Structure**: Scatters business logic across multiple directories
- **Feature-Based Directories**: Not beneficial within already-focused microservices

### Alignment with Principles

- **Start Small**: Minimal directories, no over-engineering
- **Refactor Later**: Easy to evolve to more complex structures as services grow
- **Team Efficiency**: Optimizes for feature development over technology specialization
- **Consistency**: Same structure across all microservices

## Implementation Guidelines

### File Naming Conventions

```typescript
// Handlers - noun.handlers.ts
src/handlers/shoot.handlers.ts

// Services - noun.service.ts  
src/services/shoot.service.ts

// Persistence - noun.repository.ts
src/persistence/shoot.repository.ts

// Events - descriptive names
src/events/publishers/shoot-created.publisher.ts
src/events/consumers/user-verified.consumer.ts
```

### Dependency Rules

1. **handlers/** can import from services/ and shared/
2. **services/** can import from persistence/, events/, and shared/
3. **persistence/** can only import from shared/
4. **events/** can import from services/ and shared/
5. **shared/** has no internal dependencies

### Testing Structure

Mirror the source structure:
```
tests/
├── handlers/          # Controller tests
├── services/          # Business logic tests  
├── persistence/       # Repository tests
├── events/            # Event handling tests
└── shared/            # Utility tests
```

## Migration Strategy

### Phase 1: Immediate (Shoot Service)
- Restructure shoot-service to functional layout
- Maintain existing contracts in shared/contracts/
- Update imports and tests

### Phase 2: Gradual (Other Services)  
- Apply structure to invite-service, user-service as they're developed
- Use as template for new microservices

### Phase 3: Optimization
- Refactor to more complex structures only if services grow significantly
- Consider input/output structure if technology boundaries become important

## Examples

### Simple CRUD Flow
```typescript
// src/handlers/shoot.handlers.ts
export const createShoot = (req, reply) => {
  const result = await shootService.create(req.body);
  reply.send(result);
};

// src/services/shoot.service.ts  
export const create = (data) => {
  const shoot = await shootRepository.save(data);
  await shootEventPublisher.publishCreated(shoot);
  return shoot;
};

// src/persistence/shoot.repository.ts
export const save = (data) => {
  return ShootModel.create(data);
};

// src/events/publishers/shoot-created.publisher.ts
export const publishCreated = (shoot) => {
  await kafkaProducer.send('shoots', { ...shoot });
};
```

## Trade-offs

### Accepted Trade-offs

- **Technology scattered**: Database code exists in both persistence/ and shared/
- **Infrastructure changes widespread**: Changing databases touches multiple files  
- **Less strict boundaries**: Services can directly import persistence (mitigated by dependency rules)

### Benefits Gained

- **Feature development speed**: Linear flow, co-located functionality
- **Simplicity**: Minimal cognitive overhead for small services
- **Debugging ease**: Predictable request paths
- **Team velocity**: Less directory navigation, clearer purpose

## Consequences

### Positive
- Consistent structure across all microservices
- Faster onboarding for new developers
- Optimized for business feature development
- Maintains contract organization benefits from ADR-023

### Negative  
- Technology experts need to work across multiple directories
- Infrastructure changes require touching multiple files
- Less enforcement of architectural boundaries

### Neutral
- Structure can evolve to input/output or layered as services mature
- Migration path exists for more complex patterns when needed

## Compliance

This ADR will be enforced through:
- Code review guidelines
- Microservice templates  
- Documentation updates
- Developer onboarding materials