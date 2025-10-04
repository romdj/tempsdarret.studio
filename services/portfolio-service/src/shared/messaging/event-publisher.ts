import { Kafka, Producer } from 'kafkajs';

export class EventPublisher {
  private readonly producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    // eslint-disable-next-line no-console
    console.log('Kafka producer connected');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    // eslint-disable-next-line no-console
    console.log('Kafka producer disconnected');
  }

  async publish(topic: string, event: Record<string, unknown>, key?: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: key ?? (event.id as string | undefined),
          value: JSON.stringify(event),
        },
      ],
    });
  }
}
