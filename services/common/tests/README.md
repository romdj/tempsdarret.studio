# E2E Tests - Temps D'arrêt Studio

End-to-end tests that mirror sequence diagrams and verify the complete event-driven microservices architecture.

## Overview

These E2E tests verify the complete workflows across all microservices:
- **01-shoot-creation-and-invitation**: Tests the full shoot creation → user verification → invitation → email flow
- **02-portfolio-curation-workflow**: Tests file upload → portfolio marking → publication workflow
- **03-client-gallery-access-flow**: Tests magic link → gallery access → photo downloads

## Prerequisites

### Required Infrastructure
All services must be running via Docker Compose:

```bash
# From project root
docker-compose up -d
```

This starts:
- MongoDB (port 27017)
- Kafka + Zookeeper (ports 9092/9093)
- Redis (port 6379)
- Kong API Gateway (port 8000)
- All microservices (user, shoot, invite, notification, portfolio, file)

### Environment Variables

The tests use these default connection strings (can be overridden):

```bash
API_GATEWAY_URL=http://localhost:8000
MONGODB_URI=mongodb://admin:admin_password@localhost:27017
KAFKA_BROKERS=localhost:9093  # Use 9093 for external access
```

## Running Tests

### Run all E2E tests
```bash
cd services/common/tests
npm run test:e2e
```

### Run with verbose output (sequence verification)
```bash
npm run test:sequence
```

### Run in watch mode (development)
```bash
npm run test:watch
```

### Run specific test file
```bash
npx vitest run e2e/01-shoot-creation-and-invitation.e2e.test.ts
```

## Test Architecture

### Test Environment Setup
- `setup/e2e-setup.ts`: Global setup connecting to MongoDB, Kafka, and HTTP services
- `setup/test-helpers.ts`: Actor classes (TestPhotographer, TestClient) and service helpers

### Event-Driven Testing
Tests verify the complete event flow:
1. HTTP request to API Gateway
2. Service processes request and publishes event to Kafka
3. Other services consume events and react
4. Final state verification via events and HTTP responses

### Key Assertions
- Event ordering and chronology
- ADR-003 compliance (magic link tokens: 64-char hex, 48h expiry)
- No direct service-to-service calls (100% event-driven)
- Resilience (service failures, event replay)

## Test Data Cleanup

Tests clean up event data between test cases using `clearEvents()` in `beforeEach` hooks.

For full database cleanup (optional):
```typescript
import { cleanDatabase } from '../setup/e2e-setup.js';

beforeEach(async () => {
  await cleanDatabase(); // Wipes all test collections
});
```

## Troubleshooting

### Services not healthy
```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs shoot-service
docker-compose logs kafka
```

### Kafka connection issues
```bash
# Verify Kafka is accessible
docker exec -it tempsdarret-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Restart Kafka if needed
docker-compose restart kafka zookeeper
```

### MongoDB connection issues
```bash
# Verify MongoDB is accessible
docker exec -it tempsdarret-mongodb mongosh -u admin -p admin_password --eval "db.adminCommand('ping')"
```

### Port conflicts
If ports 8000, 9092, 9093, or 27017 are already in use:
```bash
# Stop conflicting services or modify docker-compose.yml ports
docker-compose down
```

## Test Isolation

Each test file runs with a fresh event collector but shared database. Tests should:
- Use unique email addresses per test
- Clear events with `clearEvents()` in `beforeEach`
- Avoid depending on execution order

## CI/CD Integration

E2E tests run in GitHub Actions with:
- MongoDB 7.0 service container
- Kafka test cluster
- All microservices built and started
- 60-second timeout per test
- Verbose reporting for debugging

See `.github/workflows/ci.yml` for the complete CI configuration.

## Performance

Typical test execution times:
- Single E2E flow test: 5-15 seconds
- Full test suite: 1-3 minutes
- Setup/teardown: ~5 seconds

## Sequence Diagram Verification

Tests are designed to mirror sequence diagrams in `/docs/diagrams/Sequence diagrams/`:
- **01-shoot-creation-and-invitation.mmd** → `01-shoot-creation-and-invitation.e2e.test.ts`
- Each step in the diagram maps to assertions in the test

This ensures documentation and implementation stay in sync.
