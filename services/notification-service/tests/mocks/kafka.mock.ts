/**
 * Kafka Mock for Testing
 * Provides mock implementation of KafkaJS for event-driven testing
 */

import { jest } from '@jest/globals';

class MockKafkaProducer {
  connect = jest.fn(async () => {});
  disconnect = jest.fn(async () => {});
  send = jest.fn(async (record: any) => [{ partition: 0, errorCode: 0, offset: '1' }]);
}

class MockKafkaConsumer {
  connect = jest.fn(async () => {});
  disconnect = jest.fn(async () => {});
  subscribe = jest.fn(async () => {});
  run = jest.fn(async () => {});
  commitOffsets = jest.fn(async () => {});
  seek = jest.fn(async () => {});
  pause = jest.fn(async () => {});
  resume = jest.fn(async () => {});
  
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
  run = jest.fn(async ({ eachMessage }: any) => {
    if (eachMessage) {
      this.messageHandlers.push(eachMessage);
    }
  });
}

class MockKafkaAdmin {
  connect = jest.fn(async () => {});
  disconnect = jest.fn(async () => {});
  createTopics = jest.fn(async () => true);
  deleteTopics = jest.fn(async () => {});
  listTopics = jest.fn(async () => ['test-topic']);
}

class MockKafka {
  producer = jest.fn(() => new MockKafkaProducer());
  consumer = jest.fn(() => new MockKafkaConsumer());
  admin = jest.fn(() => new MockKafkaAdmin());
  
  // Test helpers
  private producers: MockKafkaProducer[] = [];
  private consumers: MockKafkaConsumer[] = [];

  constructor() {
    // Override methods to track instances
    this.producer = jest.fn(() => {
      const producer = new MockKafkaProducer();
      this.producers.push(producer);
      return producer;
    });

    this.consumer = jest.fn(() => {
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
    jest.clearAllMocks();
  }
}

// Export singleton mock instance
export const mockKafka = new MockKafka();

// Mock KafkaJS module
export const mockKafkaJS = {
  Kafka: jest.fn(() => mockKafka),
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