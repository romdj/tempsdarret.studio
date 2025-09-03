# ADR-012: TypeScript as Primary Language

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires a robust programming language that can handle complex business logic, type safety for financial operations, and seamless integration across frontend and backend services. The choice of programming language affects developer productivity, code quality, and maintainability.

### Requirements
- **Type safety** for photography metadata, pricing, and client data
- **Cross-platform compatibility** (frontend/backend/shared schemas)
- **Rich ecosystem** for web development and image processing
- **Team productivity** with excellent tooling and IDE support
- **Performance** adequate for file processing operations

### Alternatives Considered

**JavaScript:**
- Ubiquitous, no compilation step
- Dynamic typing leads to runtime errors
- Weak support for large codebases

**TypeScript:**
- JavaScript superset with static typing
- Excellent tooling and IDE support  
- Gradual adoption path
- Strong ecosystem

**Go:**
- Excellent performance
- Strong typing
- Different paradigm from web development
- Limited frontend options

**Rust:**
- Superior performance and safety
- Steep learning curve
- Limited web framework ecosystem
- Overkill for CRUD operations

## Decision

We will use **TypeScript** as the primary programming language for all components of the photography platform: frontend, backend services, shared libraries, and infrastructure code.

## Rationale

### Type Safety for Photography Business Logic

Photography platforms handle complex data structures that benefit from compile-time checking:

```typescript
// Photography metadata with type safety
interface ShootMetadata {
  shootId: ShootId;
  captureSettings: {
    iso: number;
    aperture: `f/${number}`;
    shutterSpeed: `1/${number}`;
    focalLength: `${number}mm`;
  };
  location?: GeoLocation;
  equipmentUsed: Equipment[];
}

// Price calculations with type safety
interface PricingTier {
  name: string;
  basePrice: Money;
  additionalHours: Money;
  includesRaw: boolean;
}

// Prevents runtime errors in financial calculations
function calculateTotalPrice(tier: PricingTier, hours: number): Money {
  return {
    amount: tier.basePrice.amount + (tier.additionalHours.amount * Math.max(0, hours - 4)),
    currency: tier.basePrice.currency
  };
}
```

### Full-Stack Type Consistency

TypeScript enables sharing types across the entire stack:

```typescript
// Shared schema types (generated from TypeSpec - ADR-002)
import { CreateShootRequest, Shoot } from '@tempsdarret/shared/schemas/shoot.schema';

// Frontend (SvelteKit)
async function createShoot(request: CreateShootRequest): Promise<Shoot> {
  const response = await fetch('/api/shoots', {
    method: 'POST',
    body: JSON.stringify(request)
  });
  return response.json();
}

// Backend (Fastify - ADR-007)
async function createShootHandler(
  request: FastifyRequest<{ Body: CreateShootRequest }>,
  reply: FastifyReply
) {
  const shoot = await shootService.create(request.body);
  reply.send({ data: shoot });
}
```

### Enhanced Developer Experience

TypeScript provides superior tooling that increases team productivity:

- **IntelliSense** with autocomplete for complex photography APIs
- **Refactoring tools** that work across the entire codebase
- **Import organization** and unused code detection
- **Real-time error detection** preventing many production issues

### Integration with Photography Ecosystem

TypeScript has excellent libraries for photography-specific needs:

```typescript
// Image processing with type safety
import sharp from 'sharp';
import { ExifData } from 'piexifjs';

interface ImageProcessingOptions {
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  resize?: { width: number; height: number };
  watermark?: WatermarkOptions;
}

async function processImage(
  buffer: Buffer, 
  options: ImageProcessingOptions
): Promise<ProcessedImage> {
  const pipeline = sharp(buffer);
  
  if (options.resize) {
    pipeline.resize(options.resize.width, options.resize.height);
  }
  
  return {
    buffer: await pipeline[options.format]({ quality: options.quality }).toBuffer(),
    metadata: await pipeline.metadata(),
    exif: extractExifData(buffer)
  };
}
```

### Gradual Adoption & Migration Path

TypeScript allows incremental adoption:
- Start with `.js` files and add types gradually
- Use `any` type during migration phases
- Strict mode can be enabled per-file or per-module

## Implementation Guidelines

### Strict Configuration
```json
// tsconfig.json - Strict configuration for new code
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Photography-Specific Types
```typescript
// Shared photography domain types
type ShootId = `shoot_${string}`;
type ClientId = `client_${string}`;
type FileId = `file_${string}`;

type ImageFormat = 'RAW' | 'JPEG' | 'PNG' | 'TIFF';
type ShootType = 'wedding' | 'portrait' | 'corporate' | 'landscape' | 'event';

interface Money {
  amount: number;
  currency: 'USD' | 'EUR' | 'CAD';
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}
```

### Error Handling Patterns
```typescript
// Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function uploadPhoto(file: File): Promise<Result<UploadedPhoto, UploadError>> {
  try {
    const photo = await fileService.upload(file);
    return { success: true, data: photo };
  } catch (error) {
    return { 
      success: false, 
      error: new UploadError('Failed to upload photo', error) 
    };
  }
}
```

### Testing with Type Safety
```typescript
// Type-safe test fixtures
interface ShootTestFixture {
  valid: CreateShootRequest;
  invalid: Partial<CreateShootRequest>;
}

const shootFixtures: ShootTestFixture = {
  valid: {
    title: 'Wedding Photography',
    clientEmail: 'bride@example.com',
    photographerId: 'photographer_123',
    scheduledDate: new Date('2024-06-15'),
    location: 'Central Park'
  },
  invalid: {
    title: '', // Invalid: empty title
    clientEmail: 'invalid-email' // Invalid: malformed email
  }
};

describe('Shoot Service', () => {
  it('should create shoot with valid data', async () => {
    const result = await shootService.create(shootFixtures.valid);
    expect(result).toMatchObject<Shoot>({
      id: expect.stringMatching(/^shoot_[a-f0-9]{32}$/),
      title: shootFixtures.valid.title,
      status: 'planned'
    });
  });
});
```

## Tooling & Development Experience

### IDE Configuration
- **VSCode** with TypeScript extensions
- **ESLint** with TypeScript rules (ADR-015)
- **Prettier** for consistent code formatting
- **Type-only imports** to avoid runtime overhead

### Build Process
```typescript
// Modern build setup with optimal TypeScript configuration
// Separate TypeScript config for different targets

// Backend services (Node.js)
{
  "target": "ES2022",
  "module": "CommonJS",
  "moduleResolution": "node"
}

// Frontend (SvelteKit)
{
  "target": "ES2022", 
  "module": "ESNext",
  "moduleResolution": "bundler"
}

// Shared libraries
{
  "target": "ES2020",
  "module": "CommonJS",
  "declaration": true,
  "outDir": "./dist"
}
```

### Performance Considerations
- **Type-only imports** to eliminate runtime overhead
- **Bundle analysis** to avoid accidentally importing large types
- **Strict null checks** to prevent null reference errors
- **Tree shaking** for optimal bundle sizes

## Migration Strategy

### Phase 1: New Development (Immediate)
- All new files are written in TypeScript
- Shared schemas use TypeScript/TypeSpec (ADR-002)
- New microservices are TypeScript-first

### Phase 2: Incremental Migration (Month 1-2)
- Add type annotations to existing JavaScript files
- Enable strict mode on a per-file basis
- Create comprehensive type definitions for photography domain

### Phase 3: Full Type Safety (Month 3)
- Enable strict mode across entire codebase
- Remove any remaining `any` types
- Comprehensive type coverage metrics

## Trade-offs

### Accepted Trade-offs
- **Compilation step** adds build complexity
- **Learning curve** for developers new to TypeScript
- **Initial velocity reduction** as team learns type-driven development

### Benefits Gained
- **Fewer runtime errors** through compile-time checking
- **Better refactoring capabilities** across large codebase
- **Enhanced IDE experience** with autocomplete and error detection
- **Self-documenting code** through type annotations

## Consequences

### Positive
- Reduced production bugs through compile-time type checking
- Improved developer productivity through better tooling
- Enhanced code maintainability and readability
- Seamless sharing of types across frontend and backend

### Negative
- Additional build step and tooling complexity
- Potential for over-engineering with complex type systems
- Learning curve for JavaScript developers

### Neutral
- Code is more verbose but more explicit
- Need to maintain type definitions alongside business logic
- TypeScript ecosystem is generally compatible with JavaScript

## Compliance

This decision will be enforced through:
- **ESLint rules** requiring TypeScript for new files
- **Build process** that fails on TypeScript errors
- **Code review guidelines** requiring proper type annotations
- **IDE configuration** with TypeScript strict mode enabled