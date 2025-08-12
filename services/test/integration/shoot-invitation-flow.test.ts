import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KafkaContainer } from '@testcontainers/kafka';
import { Kafka, Consumer, Producer } from 'kafkajs';
import supertest from 'supertest';
import type { StartedTestContainer } from 'testcontainers';

describe('Shoot Creation → Invitation Flow (E2E)', () => {
  let kafkaContainer: StartedTestContainer;
  let kafka: Kafka;
  let consumer: Consumer;
  let producer: Producer;
  let shootServiceUrl: string;
  let inviteServiceUrl: string;

  beforeAll(async () => {
    // Start Kafka container with proper configuration
    kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
      .withStartupTimeout(60000)
      .start();

    const brokers = [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`];
    
    // Setup Kafka client
    kafka = new Kafka({
      clientId: 'shoot-invitation-test',
      brokers,
    });

    // Setup consumer to listen for events
    consumer = kafka.consumer({ groupId: 'test-consumer' });
    await consumer.connect();
    await consumer.subscribe({ topics: ['shoots', 'invitations'] });

    // Setup producer (for any test data if needed)
    producer = kafka.producer();
    await producer.connect();

    // These will be the service endpoints once we implement them
    shootServiceUrl = 'http://localhost:3001'; // Shoot Service
    inviteServiceUrl = 'http://localhost:3002'; // Invite Service
  }, 90000);

  afterAll(async () => {
    await consumer?.disconnect();
    await producer?.disconnect();
    await kafkaContainer?.stop();
  });

  beforeEach(async () => {
    // Create topics if they don't exist
    const admin = kafka.admin();
    await admin.connect();
    
    try {
      await admin.createTopics({
        topics: [
          { topic: 'shoots', numPartitions: 1 },
          { topic: 'invitations', numPartitions: 1 }
        ]
      });
    } catch (error) {
      // Topics may already exist, ignore
    }
    
    await admin.disconnect();
  });

  it('should create shoot and trigger invitation event flow', async () => {
    // Arrange: Listen for events
    const receivedEvents: any[] = [];
    
    consumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = {
          topic,
          value: JSON.parse(message.value!.toString()),
          timestamp: message.timestamp,
        };
        receivedEvents.push(event);
      },
    });

    // Act: Create a shoot with client email (this should trigger the flow)
    const shootData = {
      title: 'Wedding Photography Session',
      clientEmail: 'client@example.com',
      photographerId: 'photographer_123',
      scheduledDate: '2025-02-15T14:00:00Z',
      location: 'Central Park, NYC'
    };

    // This POST should trigger the entire event-driven flow
    const response = await supertest(shootServiceUrl)
      .post('/shoots')
      .send(shootData)
      .expect(201);

    const createdShoot = response.body;

    // Assert: Wait for events to be published and consumed
    // Give time for event processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify shoot was created
    expect(createdShoot).toMatchObject({
      id: expect.stringMatching(/^shoot_/),
      title: shootData.title,
      clientEmail: shootData.clientEmail,
      photographerId: shootData.photographerId,
      status: 'planned'
    });

    // Verify shoot.created event was published
    const shootCreatedEvent = receivedEvents.find(
      event => event.topic === 'shoots' && event.value.eventType === 'shoot.created'
    );
    
    expect(shootCreatedEvent).toBeDefined();
    expect(shootCreatedEvent.value).toMatchObject({
      eventId: expect.any(String),
      timestamp: expect.any(String),
      shootId: createdShoot.id,
      clientEmail: shootData.clientEmail,
      photographerId: shootData.photographerId,
      title: shootData.title
    });

    // Verify invitation.created event was published (async flow)
    const invitationCreatedEvent = receivedEvents.find(
      event => event.topic === 'invitations' && event.value.eventType === 'invitation.created'
    );

    expect(invitationCreatedEvent).toBeDefined();
    expect(invitationCreatedEvent.value).toMatchObject({
      eventId: expect.any(String),
      timestamp: expect.any(String),
      invitationId: expect.stringMatching(/^invite_/),
      email: shootData.clientEmail,
      shootId: createdShoot.id,
      expiresAt: expect.any(String) // Magic link expiry
    });

    // Verify the event flow timing
    const shootEventTime = new Date(shootCreatedEvent.value.timestamp);
    const inviteEventTime = new Date(invitationCreatedEvent.value.timestamp);
    
    expect(inviteEventTime.getTime()).toBeGreaterThan(shootEventTime.getTime());
  }, 10000);

  it('should validate event payloads against AsyncAPI schema', async () => {
    // This test ensures our events match the AsyncAPI schema we defined
    const shootData = {
      title: 'Portrait Session',
      clientEmail: 'portrait-client@example.com',
      photographerId: 'photographer_456',
      scheduledDate: '2025-03-01T10:00:00Z'
    };

    const receivedEvents: any[] = [];
    consumer.run({
      eachMessage: async ({ topic, message }) => {
        receivedEvents.push({
          topic,
          value: JSON.parse(message.value!.toString()),
        });
      },
    });

    await supertest(shootServiceUrl)
      .post('/shoots')
      .send(shootData)
      .expect(201);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const shootEvent = receivedEvents.find(e => e.topic === 'shoots');
    const inviteEvent = receivedEvents.find(e => e.topic === 'invitations');

    // Validate required fields from AsyncAPI schema
    expect(shootEvent.value).toEqual({
      eventId: expect.any(String),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
      eventType: 'shoot.created',
      shootId: expect.stringMatching(/^shoot_/),
      clientEmail: shootData.clientEmail,
      photographerId: shootData.photographerId,
      title: shootData.title,
      scheduledDate: shootData.scheduledDate
    });

    expect(inviteEvent.value).toEqual({
      eventId: expect.any(String),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
      eventType: 'invitation.created',
      invitationId: expect.stringMatching(/^invite_/),
      email: shootData.clientEmail,
      shootId: expect.stringMatching(/^shoot_/),
      expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    });
  }, 10000);
});