# ADR-014: Vitest for Frontend Testing, Jest for Backend Services

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires a comprehensive testing strategy that covers frontend components, backend services, API contracts, and complex business workflows. We need fast, reliable test runners that integrate well with TypeScript (ADR-012) and our development tools.

### Testing Requirements
- **Unit tests** for business logic and utility functions
- **Integration tests** for database operations and API endpoints  
- **Component tests** for microservice workflows
- **Contract tests** for API compatibility
- **E2E tests** for critical user journeys

### Considerations
- TypeScript support and performance
- IDE integration and debugging experience
- Ecosystem compatibility with our stack
- Parallel execution for CI/CD pipelines
- Mocking capabilities for external dependencies

### Framework Comparison

**Vitest (Frontend):**
- Built for Vite/modern frontend tooling
- Excellent TypeScript support
- Very fast with native ES modules
- Jest-compatible API
- Hot module reloading for tests

**Jest (Backend):**
- Mature, battle-tested framework
- Excellent Node.js integration
- Comprehensive mocking capabilities
- Large ecosystem and community
- Good TypeScript support with ts-jest

**Testing Library:**
- Framework-agnostic testing utilities
- Focuses on user behavior over implementation
- Excellent accessibility support

## Decision

We will use a **dual testing strategy**:
- **Vitest** for frontend testing (SvelteKit, components, client-side logic)
- **Jest** for backend testing (microservices, APIs, business logic)
- **Testing Library** for component interaction testing

## Rationale

### Frontend Testing with Vitest

Vitest is purpose-built for modern frontend development and integrates seamlessly with our SvelteKit stack:

```typescript
// Frontend component test
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShootCreationForm from '../ShootCreationForm.svelte';

describe('ShootCreationForm', () => {
  it('should validate client email format', async () => {
    const { getByLabelText, getByText } = render(ShootCreationForm);
    
    const emailInput = getByLabelText('Client Email');
    await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
    
    expect(getByText('Please enter a valid email')).toBeInTheDocument();
  });

  it('should submit valid shoot data', async () => {
    const { getByLabelText, getByText } = render(ShootCreationForm);
    
    await fireEvent.input(getByLabelText('Title'), { 
      target: { value: 'Wedding Photography' } 
    });
    await fireEvent.input(getByLabelText('Client Email'), { 
      target: { value: 'bride@example.com' } 
    });
    
    await fireEvent.click(getByText('Create Shoot'));
    
    expect(mockCreateShoot).toHaveBeenCalledWith({
      title: 'Wedding Photography',
      clientEmail: 'bride@example.com'
    });
  });
});
```

### Backend Testing with Jest

Jest provides robust testing capabilities for our microservices and complex business logic:

```typescript
// Backend service test
import { ShootService } from '../services/shoot.service';
import { ShootRepository } from '../persistence/shoot.repository';
import { ShootCreatedPublisher } from '../events/publishers/shoot-created.publisher';

describe('ShootService', () => {
  let shootService: ShootService;
  let mockRepository: jest.Mocked<ShootRepository>;
  let mockPublisher: jest.Mocked<ShootCreatedPublisher>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      findMany: jest.fn(),
      deleteById: jest.fn()
    } as any;

    mockPublisher = {
      publish: jest.fn()
    } as any;

    shootService = new ShootService(mockRepository, mockPublisher);
  });

  describe('createShoot', () => {
    it('should create shoot and publish event', async () => {
      const shootData = {
        title: 'Wedding Photography',
        clientEmail: 'bride@example.com',
        photographerId: 'photographer_123'
      };

      const mockSavedShoot = {
        id: 'shoot_123',
        ...shootData,
        status: 'planned',
        createdAt: new Date(),
        toJSON: () => ({ id: 'shoot_123', ...shootData })
      };

      mockRepository.create.mockResolvedValue(mockSavedShoot);

      const result = await shootService.createShoot(shootData);

      expect(mockRepository.create).toHaveBeenCalledWith(shootData);
      expect(mockPublisher.publish).toHaveBeenCalledWith(mockSavedShoot);
      expect(result).toMatchObject({ id: 'shoot_123', title: 'Wedding Photography' });
    });
  });
});
```

## Implementation Guidelines

### Frontend Testing Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '*.config.*']
    }
  }
});
```

```typescript
// tests/setup.ts - Frontend test setup
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch for API calls
global.fetch = vi.fn();
```

### Backend Testing Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.(test|spec).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000
};
```

```typescript
// tests/setup.ts - Backend test setup
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

## Testing Patterns by Type

### Unit Tests
Focus on pure business logic with minimal dependencies:

```typescript
// utils/pricing.test.ts
import { calculateShootPrice, PricingTier } from '../utils/pricing';

describe('calculateShootPrice', () => {
  const weddingTier: PricingTier = {
    name: 'Wedding Package',
    basePrice: { amount: 2000, currency: 'USD' },
    includedHours: 6,
    additionalHourRate: { amount: 200, currency: 'USD' }
  };

  it('should calculate base price for standard duration', () => {
    const price = calculateShootPrice(weddingTier, 6);
    expect(price).toEqual({ amount: 2000, currency: 'USD' });
  });

  it('should add charges for additional hours', () => {
    const price = calculateShootPrice(weddingTier, 8);
    expect(price).toEqual({ amount: 2400, currency: 'USD' });
  });
});
```

### Integration Tests
Test complete workflows with real database connections:

```typescript
// integration/shoot-workflow.integration.test.ts
import { ShootServiceApp } from '../src/main';

describe('Shoot Creation Workflow', () => {
  let app: ShootServiceApp;

  beforeAll(async () => {
    app = new ShootServiceApp();
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should create shoot, store in database, and publish event', async () => {
    const response = await app.getServer().inject({
      method: 'POST',
      url: '/shoots',
      payload: {
        title: 'Wedding Photography',
        clientEmail: 'bride@example.com',
        photographerId: 'photographer_123'
      }
    });

    expect(response.statusCode).toBe(201);
    
    const shoot = JSON.parse(response.payload);
    expect(shoot.data.title).toBe('Wedding Photography');
    
    // Verify event was published (mock Kafka consumer)
    expect(mockKafkaConsumer.messages).toHaveLength(1);
    expect(mockKafkaConsumer.messages[0].eventType).toBe('shoot.created');
  });
});
```

### Component Tests
Test microservice behavior with external dependencies mocked:

```typescript
// component/shoot-service.component.test.ts
import { testContainers } from 'testcontainers';

describe('Shoot Service Component Tests', () => {
  let mongoContainer: StartedTestContainer;
  let kafkaContainer: StartedTestContainer;
  let shootService: ShootService;

  beforeAll(async () => {
    // Start test containers
    mongoContainer = await testContainers
      .GenericContainer('mongo:7')
      .withExposedPorts(27017)
      .start();

    kafkaContainer = await testContainers
      .GenericContainer('confluentinc/cp-kafka:7.4.0')
      .withExposedPorts(9092)
      .start();

    // Initialize service with real dependencies
    shootService = new ShootService(/* real dependencies */);
  });

  it('should handle complete shoot creation flow', async () => {
    const result = await shootService.createShoot({
      title: 'Wedding Photography',
      clientEmail: 'bride@example.com',
      photographerId: 'photographer_123'
    });

    expect(result.id).toMatch(/^shoot_[a-f0-9]{32}$/);
    expect(result.status).toBe('planned');
    
    // Verify database persistence
    const stored = await ShootModel.findOne({ id: result.id });
    expect(stored).toBeTruthy();
    
    // Verify event publishing
    // Implementation depends on Kafka test setup
  });
});
```

### Contract Tests
Ensure API compatibility between services:

```typescript
// contract/shoot-api.contract.test.ts
import { pact } from '@pact-foundation/pact';

describe('Shoot API Contract', () => {
  const provider = pact({
    consumer: 'frontend-app',
    provider: 'shoot-service'
  });

  it('should create shoot with valid data', async () => {
    await provider
      .given('photographer exists')
      .uponReceiving('a request to create a shoot')
      .withRequest({
        method: 'POST',
        path: '/shoots',
        headers: { 'Content-Type': 'application/json' },
        body: {
          title: 'Wedding Photography',
          clientEmail: 'bride@example.com',
          photographerId: 'photographer_123'
        }
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: {
            id: pact.like('shoot_1234567890abcdef'),
            title: 'Wedding Photography',
            status: 'planned'
          }
        }
      });

    // Execute test against real API
  });
});
```

## CI/CD Integration

### Parallel Test Execution
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:frontend
      - run: npm run test:e2e

  backend-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci  
      - run: npm run test:backend
      - run: npm run test:integration
```

### Coverage Requirements
- **Unit tests**: 90% coverage minimum
- **Integration tests**: Critical business flows covered
- **Component tests**: All microservice APIs tested
- **E2E tests**: Core user journeys validated

## Trade-offs

### Accepted Trade-offs
- **Dual tooling complexity** with Vitest and Jest
- **Learning curve** for different testing patterns
- **Maintenance overhead** for test containers and mocking

### Benefits Gained
- **Optimal performance** for each testing context
- **Fast feedback loops** during development
- **Comprehensive coverage** of all system layers
- **Reliable CI/CD pipelines** with parallel execution

## Consequences

### Positive
- Fast, reliable test execution across frontend and backend
- Excellent TypeScript integration and IDE support
- Comprehensive testing strategy covering all system layers
- CI/CD pipeline optimization with parallel test execution

### Negative
- Additional tooling complexity with dual test frameworks
- Need to maintain expertise in both Vitest and Jest ecosystems
- Potential inconsistencies between frontend and backend testing patterns

### Neutral
- Test patterns need documentation and team training
- Coverage requirements need ongoing monitoring
- Test container setup requires DevOps coordination

## Compliance

This decision will be enforced through:
- **CI/CD pipeline** requiring test passage before merging
- **Coverage gates** preventing deployment below thresholds
- **Code review guidelines** requiring tests for new features
- **Team training** on testing patterns and best practices