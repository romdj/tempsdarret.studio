import { Kafka, Producer } from 'kafkajs';

export class EventPublisher {
  private producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect() {
    await this.producer.connect();
    console.log('Kafka producer connected');
  }

  async disconnect() {
    await this.producer.disconnect();
    console.log('Kafka producer disconnected');
  }

  async publish(topic: string, event: any, key?: string) {
    await this.producer.send({
      topic,
      messages: [
        {
          key: key || event.id,
          value: JSON.stringify(event),
        },
      ],
    });
  }
}
