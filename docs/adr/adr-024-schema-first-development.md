# ADR-024: Schema-First Development with Auto-Generation

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires consistent API contracts, type safety across frontend and backend, and automated tooling to maintain synchronization between schemas and implementation code. Manual maintenance of types, validation schemas, and API documentation leads to inconsistencies and bugs.

### Current Challenges
- **Type drift** between frontend and backend implementations
- **Manual API documentation** that becomes outdated quickly
- **Inconsistent validation** across different service boundaries
- **Repetitive code generation** for DTOs, models, and client SDKs
- **Breaking change detection** requires manual review

### Requirements
- Single source of truth for API contracts and data models
- Automated generation of TypeScript types, validation schemas, and documentation
- Integration with our TypeSpec API-first approach (ADR-002)
- Support for AsyncAPI event schemas (ADR-023)
- Code generation for multiple targets (frontend, backend, mobile)

## Decision

We will implement **Schema-First Development** with comprehensive **auto-generation** of implementation artifacts from centralized schema definitions using TypeSpec and AsyncAPI as the source of truth.

## Rationale

### Single Source of Truth

Schema-first development eliminates inconsistencies by defining all contracts in one place:

```typescript
// packages/models/shoot-service.tsp - TypeSpec definition
@service({ title: "Shoot Service API" })
namespace ShootService;

model CreateShootRequest {
  @minLength(1) @maxLength(100)
  title: string;
  
  @format("email")
  clientEmail: string;
  
  photographerId: string;
  
  @optional
  scheduledDate?: utcDateTime;
}

// Auto-generated TypeScript types
export interface CreateShootRequest {
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: Date;
}

// Auto-generated Zod validation
export const CreateShootRequestSchema = z.object({
  title: z.string().min(1).max(100),
  clientEmail: z.string().email(),
  photographerId: z.string(),
  scheduledDate: z.date().optional()
});
```

### Comprehensive Code Generation

Auto-generation eliminates manual synchronization across multiple artifacts:

**From TypeSpec schemas, generate:**
- TypeScript interfaces and types
- Zod validation schemas  
- OpenAPI specifications
- Client SDKs (frontend, mobile)
- API documentation
- Mock data generators

**From AsyncAPI schemas, generate:**
- Event payload TypeScript types
- Kafka producer/consumer clients
- Event validation schemas
- Message documentation

### Breaking Change Detection

Schema-first development provides automatic breaking change detection:

```typescript
// Build-time validation prevents breaking changes
interface VersionedSchema {
  version: string;
  compatibilityCheck: (previous: Schema, current: Schema) => BreakingChange[];
}

// Example breaking change detection
const changes = detectChanges(previousSchema, currentSchema);
if (changes.some(c => c.severity === 'breaking')) {
  throw new Error('Breaking changes detected - increment major version');
}
```

### Development Workflow Integration

Schema changes trigger automated regeneration throughout the development workflow:

```yaml
# .github/workflows/schema-sync.yml
name: Schema Synchronization
on:
  push:
    paths: ['packages/models/**', 'packages/events/**']

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate TypeScript from TypeSpec
        run: npm run generate:types
      
      - name: Generate Zod schemas
        run: npm run generate:validation
      
      - name: Generate client SDKs
        run: npm run generate:clients
      
      - name: Update API documentation
        run: npm run generate:docs
      
      - name: Run compatibility check
        run: npm run validate:breaking-changes
```

## Implementation Architecture

### Schema Organization
```
packages/
├── models/                    # TypeSpec API schemas
│   ├── common.tsp            # Shared models
│   ├── shoot-service.tsp     # Shoot API contracts
│   ├── user-service.tsp      # User API contracts  
│   └── invite-service.tsp    # Invite API contracts
├── events/                    # AsyncAPI event schemas
│   └── asyncapi.yaml         # All event definitions
└── generated/                 # Auto-generated code
    ├── types/                # TypeScript types
    ├── schemas/              # Zod validation schemas
    ├── clients/              # SDK clients
    └── docs/                 # API documentation
```

### Generation Pipeline

```typescript
// build/generate.ts - Main generation orchestrator
import { generateFromTypeSpec } from './generators/typespec';
import { generateFromAsyncAPI } from './generators/asyncapi';
import { generateClients } from './generators/clients';

async function generateAll() {
  console.log('🔄 Generating from TypeSpec...');
  await generateFromTypeSpec('./packages/models/**/*.tsp');
  
  console.log('🔄 Generating from AsyncAPI...');
  await generateFromAsyncAPI('./packages/events/asyncapi.yaml');
  
  console.log('🔄 Generating client SDKs...');
  await generateClients();
  
  console.log('✅ Generation complete');
}
```

### TypeScript Type Generation

```typescript
// Auto-generated from shoot-service.tsp
export namespace ShootService {
  export interface CreateShootRequest {
    title: string;
    clientEmail: string;
    photographerId: string;
    scheduledDate?: Date;
    location?: string;
  }

  export interface Shoot extends CreateShootRequest {
    id: string;
    status: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ShootQuery {
    photographerId?: string;
    clientEmail?: string;
    status?: Shoot['status'];
    fromDate?: Date;
    toDate?: Date;
    page: number;
    limit: number;
  }
}
```

### Validation Schema Generation

```typescript
// Auto-generated Zod schemas from TypeSpec
import { z } from 'zod';

export const CreateShootRequestSchema = z.object({
  title: z.string().min(1).max(100),
  clientEmail: z.string().email(),
  photographerId: z.string(),
  scheduledDate: z.date().optional(),
  location: z.string().max(500).optional()
});

export const ShootSchema = CreateShootRequestSchema.extend({
  id: z.string().regex(/^shoot_[a-f0-9]{32}$/),
  status: z.enum(['planned', 'in_progress', 'completed', 'delivered', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Export inferred types
export type CreateShootRequest = z.infer<typeof CreateShootRequestSchema>;
export type Shoot = z.infer<typeof ShootSchema>;
```

### Client SDK Generation

```typescript
// Auto-generated client SDK
export class ShootServiceClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async createShoot(request: CreateShootRequest): Promise<Shoot> {
    const response = await fetch(`${this.baseUrl}/shoots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new ShootServiceError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listShoots(query: ShootQuery): Promise<PaginatedShoots> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await fetch(`${this.baseUrl}/shoots?${params}`);
    return response.json();
  }
}
```

### Event Schema Generation

```typescript
// Auto-generated from AsyncAPI events
export namespace ShootEvents {
  export interface ShootCreatedPayload {
    eventId: string;
    eventType: 'shoot.created';
    timestamp: string;
    version: string;
    source: string;
    data: {
      shootId: string;
      title: string;
      clientEmail: string;
      photographerId: string;
      status: 'planned';
      createdAt: string;
      scheduledDate?: string;
      location?: string;
    };
  }

  // Auto-generated Kafka producer
  export class ShootEventProducer {
    async publishShootCreated(payload: ShootCreatedPayload): Promise<void> {
      await this.kafka.producer().send({
        topic: 'shoots',
        messages: [{
          key: payload.data.shootId,
          value: JSON.stringify(payload),
          headers: {
            eventType: payload.eventType,
            version: payload.version
          }
        }]
      });
    }
  }
}
```

## Development Workflow

### Schema Change Process

1. **Update Schema**: Modify TypeSpec or AsyncAPI definitions
2. **Generate Code**: Run `npm run generate` to update all artifacts
3. **Review Changes**: Git diff shows exactly what implementation code changed
4. **Update Tests**: Modify tests to match new contracts
5. **Deploy**: Automated deployment with compatibility checks

### Version Management

```typescript
// Semantic versioning for schema changes
interface SchemaVersion {
  major: number;  // Breaking changes
  minor: number;  // Backward-compatible additions
  patch: number;  // Bug fixes, clarifications
}

// Example: Shoot schema v2.1.0
@version("2.1.0")
model Shoot {
  // v2.0.0: Original fields
  id: string;
  title: string;
  
  // v2.1.0: Added field (backward compatible)
  @added("2.1.0")
  priority?: Priority;
}
```

### Breaking Change Management

```typescript
// Controlled breaking changes with migration guides
@deprecated("Use scheduledDateTime instead", "3.0.0")
scheduledDate?: utcDateTime;

@added("3.0.0")
scheduledDateTime?: {
  date: utcDateTime;
  timezone: string;
  duration?: int32;
};
```

## Tooling Integration

### Build Scripts

```json
// package.json
{
  "scripts": {
    "generate": "npm run generate:types && npm run generate:schemas && npm run generate:clients",
    "generate:types": "tsp compile packages/models/",
    "generate:schemas": "node build/generate-zod-schemas.js",
    "generate:clients": "node build/generate-clients.js",
    "generate:docs": "node build/generate-documentation.js",
    "validate:schemas": "node build/validate-compatibility.js",
    "watch:schemas": "chokidar 'packages/{models,events}/**' -c 'npm run generate'"
  }
}
```

### IDE Integration

```typescript
// VSCode settings for schema-first development
{
  "files.watcherExclude": {
    "**/packages/generated/**": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### CI/CD Integration

```yaml
# Pre-commit validation
- name: Validate Schema Changes
  run: |
    npm run generate
    npm run validate:schemas
    git diff --exit-code || (
      echo "❌ Generated code is out of sync with schemas"
      echo "Run 'npm run generate' and commit the changes"
      exit 1
    )
```

## Migration Strategy

### Phase 1: Foundation (Immediate)
- Set up TypeSpec and AsyncAPI schema repositories
- Create basic generation pipeline for TypeScript types
- Implement schema validation in CI/CD

### Phase 2: Integration (Month 1)
- Generate Zod validation schemas from TypeSpec
- Auto-generate client SDKs for frontend
- Implement breaking change detection

### Phase 3: Advanced Features (Month 2-3)
- Generate mock data and test fixtures
- Implement schema versioning and migration tools
- Create comprehensive API documentation pipeline
- Add support for mobile SDK generation

## Trade-offs

### Accepted Trade-offs
- **Additional build complexity** with generation pipeline
- **Learning curve** for TypeSpec and AsyncAPI specifications
- **Tool dependency** on schema generation ecosystem

### Benefits Gained
- **Eliminated type drift** between frontend and backend
- **Automated documentation** always in sync with implementation
- **Faster development** through generated boilerplate
- **Improved reliability** with compile-time contract validation

## Consequences

### Positive
- Single source of truth eliminates inconsistencies across platform
- Automated tooling reduces manual synchronization effort
- Breaking changes are detected automatically before deployment
- Developer productivity increases with generated client SDKs

### Negative
- Additional complexity in build and deployment pipeline
- Dependency on schema generation tools and their ecosystems
- Initial setup effort for comprehensive generation pipeline

### Neutral
- Development workflow changes to be schema-first
- Team needs training on TypeSpec and AsyncAPI specifications
- Documentation becomes centralized around schema definitions

## Compliance

This decision will be enforced through:
- **CI/CD validation** preventing deployment of unsynchronized schemas
- **Pre-commit hooks** requiring generation pipeline execution
- **Code review guidelines** for schema change approval process
- **Documentation requirements** for all schema modifications