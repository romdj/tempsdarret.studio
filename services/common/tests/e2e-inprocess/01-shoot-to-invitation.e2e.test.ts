import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Kafka, type Producer, type Consumer } from 'kafkajs';
import mongoose from 'mongoose';

/**
 * In-process E2E — Flow 01: shoot.created → invitation.sent
 *
 * Boots user-service, invitation-service and notification-service inside this
 * test process (via each service's exported `startService`) against a real
 * Kafka broker and MongoDB, then emits a single `shoot.created` event and
 * asserts the full event chain terminates in an `invitation.sent`:
 *
 *   shoot.created ─▶ [user-svc] user.created
 *                 ─▶ [invitation-svc] invitation.created (+ magic link)
 *                 ─▶ [notification-svc] invitation.sent   (email is dry-run)
 *
 * Infra: the local dev stack (docker-compose) or the CI service containers.
 * Overridable via E2E_MONGO_URI / E2E_KAFKA_BROKERS.
 */

const MONGO_URI =
  process.env.E2E_MONGO_URI ??
  'mongodb://admin:admin_password@localhost:27017/tempsdarret-e2e?authSource=admin';
const KAFKA_BROKERS = process.env.E2E_KAFKA_BROKERS ?? 'localhost:9093';
const TOPICS = ['shoots', 'users', 'invitations', 'notifications', 'magic-links'];

// The services read these at import time — must be set before importing them.
process.env.MONGO_URI = MONGO_URI;
process.env.KAFKA_BROKERS = KAFKA_BROKERS;
process.env.RESEND_API_KEY = ''; // force notification-service email dry-run
process.env.NODE_ENV = 'test';
process.env.APP_BASE_URL = 'http://localhost:5173';
process.env.PORT = '0'; // ephemeral HTTP ports — the flow is event-driven, not HTTP

const waitFor = async <T>(
  fn: () => T | undefined,
  timeoutMs: number,
  intervalMs = 300
): Promise<T | undefined> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = fn();
    if (result !== undefined) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return undefined;
};

describe('E2E: shoot.created → invitation.sent (in-process)', () => {
  const stops: Array<() => Promise<void>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  let kafka: Kafka;
  let producer: Producer;
  let collector: Consumer;

  beforeAll(async () => {
    kafka = new Kafka({ clientId: 'e2e-harness', brokers: KAFKA_BROKERS.split(',') });

    // Pre-create topics so producing/subscribing never triggers auto-create
    // rebalance storms.
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: TOPICS.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 }))
    });
    await admin.disconnect();

    // Collector for the terminal event.
    collector = kafka.consumer({ groupId: `e2e-collector-${Date.now()}` });
    await collector.connect();
    await collector.subscribe({ topic: 'notifications', fromBeginning: false });
    await collector.run({
      eachMessage: async ({ message }) => {
        if (message.value) notifications.push(JSON.parse(message.value.toString()));
      }
    });

    // Boot the services (consumers must be live before the first publish).
    const { startService: startNotification } = await import(
      '../../../notification-service/src/main.js'
    );
    const { startService: startInvitation } = await import(
      '../../../invitation-service/src/main.js'
    );
    const { startService: startUser } = await import('../../../user-service/src/main.js');
    stops.push((await startNotification()).stop);
    stops.push((await startInvitation()).stop);
    stops.push((await startUser()).stop);

    producer = kafka.producer();
    await producer.connect();

    // Let the consumer groups finish joining before the first publish
    // (subscriptions are fromBeginning:false).
    await new Promise((r) => setTimeout(r, 6000));
  }, 120000);

  afterAll(async () => {
    for (const stop of stops.reverse()) {
      try {
        await stop();
      } catch {
        // best-effort teardown
      }
    }
    try {
      await producer?.disconnect();
      await collector?.disconnect();
    } catch {
      // ignore
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }, 60000);

  it('emits invitation.sent after a shoot.created flows through all three services', async () => {
    const clientEmail = `client-${Date.now()}@example.com`;
    const shootId = `shoot-${Date.now()}`;

    await producer.send({
      topic: 'shoots',
      messages: [
        {
          value: JSON.stringify({
            eventType: 'shoot.created',
            shootId,
            clientEmail,
            photographerId: 'photographer-e2e',
            title: 'E2E Wedding',
            scheduledDate: '2026-08-01',
            location: 'Test Studio'
          })
        }
      ]
    });

    const sent = await waitFor(
      () =>
        notifications.find(
          (e) => e.eventType === 'invitation.sent' && e.email === clientEmail
        ),
      30000
    );

    expect(sent).toBeDefined();
    expect(sent).toMatchObject({ eventType: 'invitation.sent', email: clientEmail, shootId });
  }, 60000);
});
