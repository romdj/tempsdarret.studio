import { Kafka, Producer } from 'kafkajs';

export interface DomainEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
}

/**
 * The publishing capability the domain depends on. Keeping it an abstraction
 * lets the transport (Kafka) be swapped for a no-op in tests without touching
 * callers (Dependency Inversion).
 */
export interface EventPublisherPort {
  publish(topic: string, event: DomainEvent, key?: string): Promise<void>;
}

export class EventPublisher implements EventPublisherPort {
  private readonly producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(topic: string, event: DomainEvent, key?: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{
        key: key ?? event.eventId,
        value: JSON.stringify(event),
        timestamp: Date.now().toString()
      }]
    });

    // eslint-disable-next-line no-console
    console.log(`Published ${event.eventType} event to ${topic} topic`);
  }
}