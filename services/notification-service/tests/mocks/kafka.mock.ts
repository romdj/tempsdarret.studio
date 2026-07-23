/**
 * Kafka Mock for Testing
 * Provides mock implementation of KafkaJS for event-driven testing
 */

import { vi } from 'vitest';

class MockKafkaProducer {
  connect = vi.fn(async () => {});
  disconnect = vi.fn(async () => {});
  send = vi.fn(async (record: any) => [{ partition: 0, errorCode: 0, offset: '1' }]);
}

class MockKafkaConsumer {
  connect = vi.fn(async () => {});
  disconnect = vi.fn(async () => {});
  subscribe = vi.fn(async () => {});
  run = vi.fn(async () => {});
  commitOffsets = vi.fn(async () => {});
  seek = vi.fn(async () => {});
  pause = vi.fn(async () => {});
  resume = vi.fn(async () => {});
  
  private messageHandlers: Array<(payload: any) => Promise<void>> = [];

  // Test helper to simulate message consumption
  simulateMessage(topic: string, message: any) {
    const kafkaMessage = {
      topic,
      partition: 0,
      message: {
        key: message.key ? Buffer.from(message.key) : null,
        value: Buffer.from(JSON.stringify(message.value)),
        timestamp: Date.now().toString(),
        offset: Math.random().toString(),
        headers: message.headers || {},
      },
    };

    // Call all registered message handlers
    this.messageHandlers.forEach(handler => {
      handler({
        topic,
        partition: 0,
        message: kafkaMessage.message,
      });
    });
  }

  // Override run to capture message handler
  run = vi.fn(async ({ eachMessage }: any) => {
    if (eachMessage) {
      this.messageHandlers.push(eachMessage);
    }
  });
}

class MockKafkaAdmin {
  connect = vi.fn(async () => {});
  disconnect = vi.fn(async () => {});
  createTopics = vi.fn(async () => true);
  deleteTopics = vi.fn(async () => {});
  listTopics = vi.fn(async () => ['test-topic']);
}

class MockKafka {
  producer = vi.fn(() => new MockKafkaProducer());
  consumer = vi.fn(() => new MockKafkaConsumer());
  admin = vi.fn(() => new MockKafkaAdmin());
  
  // Test helpers
  private producers: MockKafkaProducer[] = [];
  private consumers: MockKafkaConsumer[] = [];

  constructor() {
    // Override methods to track instances
    this.producer = vi.fn(() => {
      const producer = new MockKafkaProducer();
      this.producers.push(producer);
      return producer;
    });

    this.consumer = vi.fn(() => {
      const consumer = new MockKafkaConsumer();
      this.consumers.push(consumer);
      return consumer;
    });
  }

  // Test utilities
  getLastProducer(): MockKafkaProducer {
    return this.producers[this.producers.length - 1];
  }

  getLastConsumer(): MockKafkaConsumer {
    return this.consumers[this.consumers.length - 1];
  }

  getAllProducers(): MockKafkaProducer[] {
    return [...this.producers];
  }

  getAllConsumers(): MockKafkaConsumer[] {
    return [...this.consumers];
  }

  reset() {
    this.producers = [];
    this.consumers = [];
    vi.clearAllMocks();
  }
}

// Export singleton mock instance
export const mockKafka = new MockKafka();

// Mock KafkaJS module
export const mockKafkaJS = {
  Kafka: vi.fn(() => mockKafka),
  logLevel: {
    ERROR: 1,
    WARN: 2,
    INFO: 4,
    DEBUG: 5,
  },
};

// Setup helper
export const setupKafkaMock = {
  reset: () => mockKafka.reset(),
  getInstance: () => mockKafka,
  
  // Event simulation helpers
  simulateInvitationEvent: (consumer: MockKafkaConsumer, eventData: any) => {
    consumer.simulateMessage('invitations', {
      key: eventData.invitationId,
      value: {
        eventType: 'invitation.created',
        ...eventData,
      },
    });
  },

  simulateShootEvent: (consumer: MockKafkaConsumer, eventData: any) => {
    consumer.simulateMessage('shoots', {
      key: eventData.shootId,
      value: {
        eventType: 'shoot.completed',
        ...eventData,
      },
    });
  },

  simulateMagicLinkEvent: (consumer: MockKafkaConsumer, eventData: any) => {
    consumer.simulateMessage('magic-links', {
      key: eventData.linkId,
      value: {
        eventType: 'magic.link.expiring',
        ...eventData,
      },
    });
  },
};