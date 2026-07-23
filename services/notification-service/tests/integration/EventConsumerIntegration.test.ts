/**
 * Event Consumer Integration Tests
 *
 * QUARANTINED (vitest migration, 2026-07): this suite targeted a
 * service-local `EventConsumer` class (`src/events/EventConsumer.ts`) that no
 * longer exists. The Kafka consumption architecture was refactored to the
 * shared `KafkaConsumer` (`@tempsdarret/shared/messaging`), wired in
 * `src/main.ts` via a `Record<eventType, EventHandler>` map dispatching into
 * `NotificationEventHandler`. That refactor is already covered by two other
 * suites:
 *  - `packages/shared/test/messaging/kafka-consumer.test.ts` — the Kafka
 *    message parsing/dispatch mechanics (`dispatchMessage`), including the
 *    enveloped-vs-flat event shapes.
 *  - `tests/unit/events/NotificationEventHandler.test.ts` — the business
 *    logic invoked per event type (invitation.created today; see BACKLOG for
 *    shoot.completed/shoot.updated/magic.link.expiring coverage).
 *
 * What's missing and NOT covered elsewhere: a test of `main.ts`'s own wiring
 * (the handlers map + `consumer.start(['invitations', 'shoots', 'magic-links'])`
 * call), because `main.ts` entangles Kafka/Mongo connection with that wiring
 * (same shape as the `buildServer()` testability gap in shoot-service/
 * user-service). See BACKLOG.md: "notification-service: extract a testable
 * wiring factory from main.ts (handlers map + consumer topics) so it can be
 * integration-tested with a mocked kafkajs, without a live broker."
 *
 * Re-enable this file (replace it, rather than un-skip it — the scenarios
 * below are stale) once that factory exists.
 */
import { describe, it } from 'vitest';

describe.skip('EventConsumer Integration Tests (quarantined — see file header)', () => {
  it('needs main.ts wiring extracted into a testable factory before this can be rewritten', () => {
    // Intentionally empty: placeholder so the suite is visibly quarantined
    // rather than silently absent.
  });
});
