# Testing Framework and Approach Decisions

This document outlines the testing approach for the shoot creation → invitation flow implementation.

## 1. Kafka Test Setup Options

| Option | Pros | Cons |
|--------|------|------|
| **Testcontainers** | • Real Kafka instance (high fidelity)<br>• Tests exactly match production<br>• Can test complex Kafka features<br>• Industry standard for integration testing | • Requires Docker running locally<br>• Slower test startup (~5-10s)<br>• More memory usage<br>• CI/CD needs Docker support |
| **Embedded Kafka** | • Fast test startup (~1-2s)<br>• No Docker dependency<br>• Lightweight for TDD cycles<br>• Works in any environment | • May not catch Kafka-specific issues<br>• Limited feature support<br>• Potential behavior differences from real Kafka |

## 2. TDD Implementation Approach

| Approach | Pros | Cons |
|----------|------|------|
| **Test First, Then Service** | • True TDD: write failing test first<br>• Ensures testable design<br>• Drives API design from consumer perspective<br>• Prevents over-engineering | • More initial setup complexity<br>• May need to mock/stub initially<br>• Requires clear test structure upfront |
| **Minimal Service, Then Test** | • Faster initial progress<br>• Can validate basic setup quickly<br>• Less complex test scaffolding initially | • Breaks TDD principles<br>• May lead to hard-to-test code<br>• API design driven by implementation |

## 3. Test Framework Choice

| Framework | Pros | Cons |
|-----------|------|------|
| **Jest** | • Mature ecosystem (lots of examples)<br>• Great mocking capabilities<br>• Excellent async testing support<br>• Strong TypeScript integration | • Slower than Vitest<br>• More configuration needed<br>• Larger memory footprint |
| **Vitest** | • Extremely fast test execution<br>• Built-in TypeScript support<br>• Modern ESM support<br>• Smaller, lighter than Jest | • Newer ecosystem (fewer examples)<br>• Some Jest plugins may not work<br>• Learning curve if team knows Jest |

## TDD-Focused Recommendation

For **strict TDD approach**:

1. **Embedded Kafka** - Faster feedback loops for TDD red/green cycles
2. **Test First** - Write the e2e test first, let it drive the service design
3. **Vitest** - Fastest execution for rapid TDD iterations

### Recommended TDD Flow

```
RED: Write failing e2e test for shoot → invitation event
GREEN: Implement minimal service to make test pass  
REFACTOR: Clean up code while keeping test green
```

### Test Structure

```typescript
// services/test/integration/shoot-invitation-flow.test.ts
describe('Shoot Creation → Invitation Flow', () => {
  it('should publish invitation event when shoot is created with client email', async () => {
    // 1. Setup Kafka consumer to listen for invite.created events
    // 2. POST /shoots with clientEmail to Shoot Service  
    // 3. Verify shoot.created event published to Kafka
    // 4. Wait for invite.created event (consumed by test listener)
    // 5. Verify event payload matches AsyncAPI schema
  })
})
```

This approach ensures:
- Fast feedback loops for development
- Test-driven API design
- Validation of the complete event-driven flow
- AsyncAPI schema compliance verification