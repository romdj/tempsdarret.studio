# Testing Guide for Notification Service

This guide covers how to run, write, and maintain tests for the event-driven notification service.

## Test Architecture

The notification service uses a comprehensive testing strategy with multiple test types:

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - Test individual components in isolation
   - Fast execution (< 5 seconds per test)
   - Focus on business logic and edge cases

2. **Component Tests** (`tests/component/`)
   - Test integrated components working together
   - Medium execution time (< 10 seconds per test)
   - Focus on feature behavior

3. **Integration Tests** (`tests/integration/`)
   - Test complete workflows with external dependencies
   - Slower execution (< 15 seconds per test)
   - Use real databases and mock external services

4. **Performance Tests** (`tests/performance/`)
   - Test system performance under load
   - Specialized execution (< 30 seconds per test)
   - Run serially to avoid resource conflicts

5. **Contract Tests** (`tests/contract/`)
   - Verify API contracts and event schemas
   - Fast execution (< 8 seconds per test)
   - Run on pull requests

## Running Tests

### Quick Commands

```bash
# Run unit and component tests (development)
npm test

# Run specific test types
npm run test:unit
npm run test:component
npm run test:integration
npm run test:performance
npm run test:contract

# Run all tests
npm run test:all

# Generate coverage report
npm run test:coverage

# CI/CD optimized test run
npm run test:ci
```

### Watch Mode for Development

```bash
# Watch unit and component tests
npm run test:watch

# Debug tests
npm run test:debug
```

### Advanced Test Execution

```bash
# Run tests with specific patterns
npx jest --testNamePattern="EmailRepository"
npx jest tests/unit/services/

# Run tests with coverage for specific files
npx jest --coverage --collectCoverageFrom="src/services/TemplateService.ts"

# Run tests in specific projects
npx jest --selectProjects unit component
```

## Test Configuration

### Environment Setup

Tests require these environment variables:

```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test
REDIS_URL=redis://localhost:6379/15
RESEND_API_KEY=test-key
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notification-service-test
DEFAULT_FROM_EMAIL=test@tempsdarret.com
DEFAULT_FROM_NAME="Temps D'arrêt Photography (Test)"
```

### Dependencies

- **MongoDB Memory Server**: In-memory database for integration tests
- **Jest**: Test framework with TypeScript support
- **Custom Mocks**: Resend, Kafka, and external service mocks

## Writing Tests

### Test Structure

```typescript
describe('Component Name', () => {
  describe('method or feature', () => {
    beforeEach(() => {
      // Setup for each test
    });

    afterEach(() => {
      // Cleanup after each test
    });

    it('should handle success case', async () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle error case', async () => {
      // Arrange & Act & Assert
      await expect(component.method(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

### Using Test Utilities

```typescript
import {
  createTestNotificationMessage,
  createTestTemplate,
  wait,
  waitForCondition,
  retry,
  PerformanceTracker,
  TestEnvironment,
} from '../utils/testHelpers.js';

// Create test data
const message = createTestNotificationMessage({
  channel: 'email',
  recipient: { email: 'test@example.com' }
});

// Performance testing
const tracker = new PerformanceTracker();
await tracker.measure('email-send', async () => {
  return emailRepository.send(message);
});
tracker.expectPerformance('email-send', 100); // Max 100ms
```

### Custom Matchers

The service provides custom Jest matchers:

```typescript
// Email validation
expect('test@example.com').toBeValidEmail();

// Event type validation  
expect('invitation.created').toBeValidEventType();

// Notification channel validation
expect('email').toBeValidNotificationChannel();

// Template rendering validation
expect(renderedTemplate).toHaveRenderedTemplate();
```

### Mocking External Services

```typescript
import { mockResend, setupResendMock } from '../mocks/resend.js';

describe('EmailRepository', () => {
  beforeEach(() => {
    setupResendMock.reset();
  });

  it('should handle API success', async () => {
    setupResendMock.success();
    const result = await emailRepository.send(message);
    expect(result.success).toBe(true);
  });

  it('should handle API failure', async () => {
    setupResendMock.failure('API Error');
    const result = await emailRepository.send(message);
    expect(result.success).toBe(false);
  });
});
```

## Coverage Requirements

### Global Thresholds
- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 80%
- **Statements**: 85%

### Component-Specific Thresholds
- **Repository Services**: 90% lines, 95% functions
- **Template Service**: 85% lines, 90% functions

### Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage
open coverage/index.html

# Generate coverage for CI
npm run test:ci
```

## Performance Testing

Performance tests validate the service can handle:

- **Template Rendering**: 100 templates in < 1 second
- **Email Sending**: > 5 emails per second
- **Event Processing**: > 50 events per second
- **Memory Usage**: < 10MB increase for 50 cached templates

```typescript
it('should render templates efficiently', async () => {
  const tracker = new PerformanceTracker();
  
  await tracker.measure('template-render', async () => {
    return templateService.renderTemplate(template, variables);
  });
  
  tracker.expectPerformance('template-render', 50); // Max 50ms
});
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` branch
- Pull requests
- Changes to notification service files

### Test Matrix

- **Node.js versions**: 20.x, 22.x
- **Test types**: Unit, Component, Integration
- **Performance tests**: Run only on main branch
- **Contract tests**: Run only on pull requests

### Quality Gates

All tests must pass for deployment:
1. TypeScript compilation
2. Linting
3. Unit tests
4. Component tests  
5. Integration tests
6. Coverage thresholds
7. Performance benchmarks

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   ```bash
   # Ensure MongoDB is running
   brew services start mongodb-community
   ```

2. **Redis Connection Errors**
   ```bash
   # Ensure Redis is running
   brew services start redis
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout for specific tests
   jest.setTimeout(30000);
   ```

4. **Memory Leaks**
   ```bash
   # Run with leak detection
   npx jest --detectLeaks --logHeapUsage
   ```

### Debug Commands

```bash
# Debug specific test
npm run test:debug -- --testNamePattern="specific test"

# Verbose output
JEST_VERBOSE=true npm test

# Restore console output for debugging
restoreConsole(); // In test code
```

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Clean up resources in afterEach/afterAll

### Performance
- Use `beforeAll` for expensive setup
- Parallelize independent tests
- Mock external dependencies
- Use in-memory databases for speed

### Reliability
- Make tests deterministic
- Avoid timing dependencies
- Use proper async/await patterns
- Handle cleanup properly

### Maintenance
- Update tests when APIs change
- Review test coverage regularly
- Remove obsolete tests
- Document complex test scenarios