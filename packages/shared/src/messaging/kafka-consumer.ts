import { Kafka, Consumer } from 'kafkajs';

export type EventHandler = (event: Record<string, unknown>) => Promise<void>;

/**
 * Parse a raw Kafka message and route it to the handler registered for its
 * eventType. Normalizes both event shapes in the system: enveloped events
 * ({ eventType, data: {...} }, e.g. shoot-service) are flattened to
 * { eventType, ...data }; already-flat events pass through unchanged.
 */
export async function dispatchMessage(
  value: Buffer | string | null,
  handlers: Record<string, EventHandler>
): Promise<void> {
  if (value === null) {
    return;
  }

  const parsed = JSON.parse(typeof value === 'string' ? value : value.toString()) as {
    eventType?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };

  const eventType = parsed.eventType;
  const handler = eventType ? handlers[eventType] : undefined;
  if (!eventType || !handler) {
    return;
  }

  const payload = parsed.data ?? parsed;
  await handler({ ...payload, eventType });
}

/**
 * Thin Kafka consumer runtime: subscribes to topics and dispatches each
 * message to the matching event handler. Mirrors the service-local messaging
 * pattern of the reference shoot-service EventPublisher.
 */
export class KafkaConsumer {
  private readonly consumer: Consumer;

  constructor(
    kafka: Kafka,
    groupId: string,
    private readonly handlers: Record<string, EventHandler>
  ) {
    this.consumer = kafka.consumer({ groupId });
  }

  async start(topics: string[]): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await dispatchMessage(message.value, this.handlers);
      }
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
