import { Kafka, Producer } from 'kafkajs';

export interface EventPublisher {
  publish(topic: string, event: Record<string, unknown>, key?: string): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class KafkaEventPublisher implements EventPublisher {
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

  async publish(topic: string, event: Record<string, unknown>, key?: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key: key ?? null, value: JSON.stringify(event) }]
    });

    // eslint-disable-next-line no-console
    console.log(`Published ${String(event['eventType'])} event to ${topic} topic`);
  }
}
