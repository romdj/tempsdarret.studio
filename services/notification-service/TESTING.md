# Notification Service Testing Strategy

This document outlines the comprehensive testing approach for the event-driven notification service with multi-channel support and repository pattern.

## Test Architecture Overview

### Test Types and Scope

#### 1. Unit Tests (`tests/services/`)
- **Repository Implementations**: Test each notification channel repository (Email, Slack, SMS)
- **Template Service**: Test template compilation, rendering, and caching
- **Utility Functions**: Test ID generation, validation, and formatting helpers
- **Event Handlers**: Test individual event processing logic

#### 2. Component Tests (`tests/component/`)
- **Multi-Channel Orchestration**: Test notification routing to multiple channels
- **Template Integration**: Test complete template loading and rendering workflow
- **Event Processing Pipeline**: Test end-to-end event consumption and notification sending
- **Error Handling**: Test retry logic, failure scenarios, and circuit breaker patterns

#### 3. Integration Tests (`tests/integration/`)
- **Kafka Event Flow**: Test complete event consumption from Kafka topics
- **External Service Integration**: Test Resend.dev API integration with real/sandbox endpoints
- **Queue Processing**: Test BullMQ job processing and retry mechanisms
- **Database Operations**: Test MongoDB operations for template and message storage

#### 4. Contract Tests (`tests/contract/`)
- **Event Schema Validation**: Test consumed and published event contracts
- **Template Variable Validation**: Test required variables and type checking
- **API Contract Testing**: Test external service API expectations

## Testing Principles

### Event-Driven Testing Approach
Since the service is purely event-driven:

1. **Event Simulation**: Create realistic event payloads matching production schemas
2. **Asynchronous Testing**: Use proper async/await patterns and timeout handling
3. **State Verification**: Verify side effects (emails sent, events published) rather than return values
4. **Isolation**: Mock external dependencies (Kafka, Resend, Payload CMS) for unit tests

### Multi-Channel Testing Strategy
Test notification channels independently and in combination:

1. **Channel Isolation**: Each repository tested independently with channel-specific mocks
2. **Cross-Channel Scenarios**: Test multi-channel delivery with different success/failure combinations  
3. **Channel Fallback**: Test fallback mechanisms when primary channels fail
4. **Preference Handling**: Test client preference routing to correct channels

### Template Testing Methodology
Comprehensive template validation:

1. **Compilation Testing**: Test Handlebars template compilation with various variable sets
2. **Rendering Validation**: Test HTML/text output with different data inputs
3. **Variable Validation**: Test required vs optional variables, default values
4. **Localization**: Test multi-language template support
5. **Performance**: Test template caching and compilation performance

## Test Data Management

### Fixtures and Mock Data
- **Event Fixtures**: Realistic event payloads for all consumed event types
- **Template Fixtures**: Complete template definitions with variables and content
- **Client Fixtures**: User preferences and notification settings
- **Provider Responses**: Mock responses from external services (Resend, Slack APIs)

### Test Database Strategy
- **In-Memory MongoDB**: Use MongoDB Memory Server for isolated database testing
- **Fixture Seeding**: Automated test data seeding for consistent test environments
- **Cleanup**: Automatic database cleanup between test suites

### External Service Mocking
- **Resend API**: Mock all Resend endpoints with realistic responses
- **Kafka**: Use in-memory Kafka broker or mock consumer/producer
- **Payload CMS**: Mock template retrieval and management operations

## Test Scenarios

### Critical Path Testing
1. **Magic Link Flow**: invitation.created → template render → email send → delivery tracking
2. **Photos Ready Flow**: shoot.completed → multi-channel notification → engagement tracking
3. **Error Recovery**: Failed delivery → retry logic → dead letter queue → alerting

### Edge Cases and Error Scenarios
1. **Invalid Templates**: Missing variables, compilation errors, malformed HTML
2. **Network Failures**: API timeouts, connection drops, rate limiting
3. **Data Validation**: Invalid email addresses, missing required fields, malformed events
4. **Resource Exhaustion**: Memory leaks, template cache overflow, connection pool exhaustion

### Performance and Load Testing
1. **High Volume Events**: Process 1000+ events per minute
2. **Template Performance**: Render complex templates under load
3. **Memory Usage**: Monitor memory consumption during extended operation
4. **Concurrency**: Test parallel event processing and resource contention

## Mock Strategy

### External Service Mocks
```typescript
// Resend API Mock
class MockResendApi {
  async send(email: EmailData): Promise<{ data: { id: string }, error?: any }> {
    // Return success/failure based on test scenario
  }
}

// Kafka Mock  
class MockKafkaConsumer {
  async consume(handler: (event: any) => Promise<void>): Promise<void> {
    // Simulate event consumption with test fixtures
  }
}
```

### Repository Mocks
- Abstract away external dependencies while maintaining interface contracts
- Simulate various success/failure scenarios
- Track method calls for verification

## Test Environment Configuration

### Test Database Setup
- MongoDB Memory Server for each test suite
- Isolated collections per test
- Automatic cleanup and seeding

### Configuration Management
- Environment-specific test configs
- Mock service endpoints
- Test-only feature flags

### CI/CD Integration
- Parallel test execution
- Test result reporting
- Coverage thresholds (>90% for critical paths)
- Performance regression detection

## Metrics and Coverage

### Coverage Targets
- **Unit Tests**: >95% line coverage for core business logic
- **Component Tests**: >90% integration path coverage  
- **Integration Tests**: 100% critical user journey coverage

### Quality Gates
- All tests must pass before deployment
- No reduction in coverage percentage
- Performance tests within acceptable thresholds
- Contract tests validate API compatibility

### Test Performance Monitoring
- Test execution time tracking
- Resource usage during tests
- Flaky test identification and resolution

## Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── repositories/
│   │   │   ├── EmailRepository.test.ts
│   │   │   ├── SlackRepository.test.ts
│   │   │   └── NotificationRepository.test.ts
│   │   ├── TemplateService.test.ts
│   │   └── EventConsumer.test.ts
│   └── utils/
│       └── id.test.ts
├── component/
│   ├── MultiChannelNotification.test.ts
│   ├── EventProcessingPipeline.test.ts
│   └── TemplateRendering.test.ts
├── integration/
│   ├── KafkaEventFlow.test.ts
│   ├── ResendApiIntegration.test.ts
│   └── EndToEndWorkflow.test.ts
├── contract/
│   ├── EventSchemas.test.ts
│   └── TemplateContracts.test.ts
├── fixtures/
│   ├── events.ts
│   ├── templates.ts
│   └── users.ts
├── mocks/
│   ├── resend.ts
│   ├── kafka.ts
│   └── payload.ts
└── utils/
    ├── testDb.ts
    ├── eventHelpers.ts
    └── assertions.ts
```

This comprehensive testing strategy ensures the notification service is reliable, performant, and maintainable while supporting the multi-channel, event-driven architecture.