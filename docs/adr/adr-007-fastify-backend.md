# ADR-007: Fastify over Express for Backend Services

## Status

Accepted

## Date

2025-08-09

## Context

Our microservices architecture requires a high-performance, TypeScript-friendly web framework for building HTTP APIs. The main candidates are Express.js (the established standard) and Fastify (the modern alternative).

### Requirements
- High performance for photography file operations
- Excellent TypeScript support with type safety
- Schema validation for TypeSpec-generated APIs (ADR-002)
- Plugin ecosystem for common functionality
- Minimal overhead for microservice deployment

### Framework Comparison

**Express.js:**
- De facto standard with largest ecosystem
- Mature with extensive documentation
- TypeScript support through @types packages
- Middleware-heavy architecture
- Performance limitations due to legacy design

**Fastify:**
- Built for performance (2x faster than Express)
- TypeScript-first design with native type safety
- Built-in schema validation (JSON Schema)
- Plugin architecture with encapsulation
- Modern async/await patterns

## Decision

We will use **Fastify** as the web framework for all backend microservices in the photography platform.

## Rationale

### Performance Requirements
Photography applications handle large file operations and concurrent requests. Fastify's performance characteristics are critical:
- **2x faster** than Express in benchmarks
- Lower memory overhead per request
- Better handling of concurrent connections

### TypeScript Integration
- **Native TypeScript support** without additional type packages
- **Type-safe route handlers** with request/response typing
- **Schema-to-TypeScript** generation aligns with TypeSpec approach (ADR-002)

### Schema Validation
Fastify's built-in JSON Schema validation perfectly complements our TypeSpec-first development:
```typescript
// Direct integration with TypeSpec schemas
fastify.post('/shoots', {
  schema: {
    body: CreateShootRequestSchema,
    response: {
      201: ShootResponseSchema
    }
  }
}, handler);
```

### Plugin Architecture
Fastify's encapsulated plugin system supports our microservice boundaries:
- **Isolated contexts** per service functionality
- **Reusable plugins** across services
- **Lifecycle hooks** for database connections, logging

### Modern Development Experience
- **Async/await first** (no callback hell)
- **Structured logging** built-in
- **Validation errors** automatically formatted
- **Request lifecycle hooks** for common patterns

## Implementation Guidelines

### Service Structure
```typescript
// src/main.ts
const fastify = Fastify({ 
  logger: true,
  ajv: {
    customOptions: {
      strict: false // Allow TypeSpec schema flexibility
    }
  }
});

// Register plugins
await fastify.register(databasePlugin);
await fastify.register(authPlugin);
await fastify.register(shootRoutes);
```

### Route Registration
```typescript
// Following functional structure (ADR-024)
export function registerShootRoutes(fastify: FastifyInstance, handlers: ShootHandlers) {
  fastify.post('/shoots', {
    schema: {
      body: CreateShootRequestSchema,
      response: { 201: ShootResponseSchema }
    }
  }, handlers.createShoot.bind(handlers));
}
```

### Error Handling
```typescript
// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.code(400).send({
      error: 'Validation Error',
      details: error.validation
    });
  }
  // Handle other error types...
});
```

### Testing Integration
```typescript
// Easy testing with Fastify's inject method
import { ShootServiceApp } from '../src/main';

describe('Shoot API', () => {
  let app: ShootServiceApp;
  
  beforeAll(async () => {
    app = new ShootServiceApp();
    await app.start();
  });
  
  it('should create shoot', async () => {
    const response = await app.getServer().inject({
      method: 'POST',
      url: '/shoots',
      payload: shootData
    });
    expect(response.statusCode).toBe(201);
  });
});
```

## Migration Strategy

### Phase 1: New Services (Immediate)
- All new microservices use Fastify
- Apply to shoot-service, invite-service, user-service

### Phase 2: Existing Services (Future)
- If any services were built with Express, migrate gradually
- No breaking API changes required

### Phase 3: Advanced Features
- Implement Fastify plugins for:
  - Authentication middleware
  - Request logging
  - Database connection management
  - File upload handling

## Trade-offs

### Accepted Trade-offs
- **Smaller ecosystem** compared to Express (mitigated by rapid growth)
- **Learning curve** for team members familiar with Express
- **Less Stack Overflow answers** (mitigated by excellent documentation)

### Benefits Gained
- **Higher performance** for file-heavy photography operations
- **Better TypeScript experience** with native type safety
- **Schema validation** aligned with TypeSpec approach
- **Modern development patterns** with async/await first

## Consequences

### Positive
- Faster API responses for photography file operations
- Type-safe development reduces runtime errors
- Schema validation prevents malformed requests
- Plugin architecture supports microservice boundaries

### Negative
- Team needs to learn Fastify-specific patterns
- Smaller community compared to Express
- Some Express-specific libraries need Fastify alternatives

### Neutral
- API interfaces remain the same (RESTful HTTP)
- Testing patterns are similar to Express
- Deployment strategies unchanged

## Compliance

This decision will be enforced through:
- Service templates using Fastify
- Code review guidelines
- Development documentation and examples
- Team training on Fastify patterns