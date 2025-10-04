export interface EventPublisher {
  publish(topic: string, event: Record<string, unknown>, _key?: string): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// Kafka implementation would go here in the real implementation
export class KafkaEventPublisher implements EventPublisher {
  async publish(topic: string, event: Record<string, unknown>, _key?: string): Promise<void> {
    // TODO: Implement Kafka publishing
    // eslint-disable-next-line no-console
    console.log(`Publishing event to ${topic}:`, event);
  }

  async connect(): Promise<void> {
    // TODO: Implement Kafka connection
  }

  async disconnect(): Promise<void> {
    // TODO: Implement Kafka disconnection
  }
}