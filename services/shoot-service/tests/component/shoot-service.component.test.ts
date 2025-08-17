import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ShootServiceApp } from '../../src/main';
import { setupComponentTests, teardownComponentTests, getComponentTestContext } from './component-setup';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { Kafka, Consumer } from 'kafkajs';
import { CreateShootRequest } from '@tempsdarret/shared/schemas/shoot.schema';

describe('Shoot Service Component Tests', () => {
  let app: ShootServiceApp;
  let request: supertest.Agent;
  let eventConsumer: Consumer;
  let receivedEvents: any[] = [];

  beforeAll(async () => {
    // Setup real containers
    await setupComponentTests();
    const context = getComponentTestContext();

    // Create and start the actual service
    app = new ShootServiceApp();

    // Override configuration to use test containers
    process.env.MONGO_URI = context.mongoUri;
    process.env.KAFKA_BROKERS = context.kafkaBrokers.join(',');
    process.env.PORT = '0'; // Let OS assign a random port

    // Start the service
    await app.start();
    
    // Get the actual port the service is running on
    const address = app.getServer().server.address();
    const port = typeof address === 'object' && address ? address.port : 3001;
    
    // Create supertest agent
    request = supertest(`http://localhost:${port}`);

    // Setup event consumer to verify event publishing
    eventConsumer = context.kafka.consumer({ groupId: 'component-test-consumer' });
    await eventConsumer.connect();
    await eventConsumer.subscribe({ topics: ['shoots', 'invitations'] });

    await eventConsumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = {
          topic,
          value: JSON.parse(message.value!.toString()),
          timestamp: message.timestamp,
        };
        receivedEvents.push(event);
      },
    });

    console.log(`✅ Component test setup complete. Service running on port ${port}`);
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    await eventConsumer?.disconnect();
    await app?.stop();
    await teardownComponentTests();
  });

  beforeEach(async () => {
    // Clear database before each test
    await mongoose.connection.db?.dropDatabase();
    // Clear received events
    receivedEvents = [];
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'shoot-service'
      });
    });
  });

  describe('Shoot Creation Flow', () => {
    it('should create shoot, persist to database, and publish event', async () => {
      const shootData: CreateShootRequest = {
        title: 'Component Test Wedding',
        clientEmail: 'component@example.com',
        photographerId: 'photographer_component',
        scheduledDate: new Date('2024-08-15T14:00:00Z'),
        location: 'Component Test Venue'
      };

      // Act: Create shoot via HTTP API
      const response = await request
        .post('/shoots')
        .send(shootData)
        .expect(201);

      const createdShoot = response.body.data;

      // Assert: Verify HTTP response
      expect(createdShoot).toMatchObject({
        id: expect.stringMatching(/^shoot_[a-f0-9]{32}$/),
        title: shootData.title,
        clientEmail: shootData.clientEmail,
        photographerId: shootData.photographerId,
        status: 'planned'
      });

      // Assert: Verify database persistence
      const dbShoot = await mongoose.connection.db
        ?.collection('shoots')
        .findOne({ id: createdShoot.id });

      expect(dbShoot).toBeTruthy();
      expect(dbShoot?.title).toBe(shootData.title);
      expect(dbShoot?.clientEmail).toBe(shootData.clientEmail);

      // Assert: Verify event was published
      // Wait a moment for async event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const shootEvent = receivedEvents.find(
        event => event.topic === 'shoots' && event.value.eventType === 'shoot.created'
      );

      expect(shootEvent).toBeTruthy();
      expect(shootEvent.value).toMatchObject({
        eventId: expect.any(String),
        eventType: 'shoot.created',
        shootId: createdShoot.id,
        clientEmail: shootData.clientEmail,
        photographerId: shootData.photographerId,
        title: shootData.title
      });
    });

    it('should reject invalid shoot data with validation errors', async () => {
      const invalidShootData = {
        title: '', // Empty title should fail
        clientEmail: 'invalid-email-format',
        photographerId: 'photographer_test'
      };

      const response = await request
        .post('/shoots')
        .send(invalidShootData)
        .expect(400);

      expect(response.body).toMatchObject({
        code: 400,
        message: 'Validation error',
        details: expect.stringContaining('title')
      });

      // Verify no database entry was created
      const dbShoot = await mongoose.connection.db
        ?.collection('shoots')
        .findOne({ photographerId: 'photographer_test' });

      expect(dbShoot).toBeNull();

      // Verify no event was published
      await new Promise(resolve => setTimeout(resolve, 500));
      const shootEvents = receivedEvents.filter(event => event.topic === 'shoots');
      expect(shootEvents).toHaveLength(0);
    });
  });

  describe('Shoot Retrieval', () => {
    it('should retrieve shoot by ID', async () => {
      // Arrange: Create a shoot first
      const shootData: CreateShootRequest = {
        title: 'Retrieval Test Shoot',
        clientEmail: 'retrieval@example.com',
        photographerId: 'photographer_retrieval'
      };

      const createResponse = await request
        .post('/shoots')
        .send(shootData)
        .expect(201);

      const shootId = createResponse.body.data.id;

      // Act: Retrieve the shoot
      const getResponse = await request
        .get(`/shoots/${shootId}`)
        .expect(200);

      // Assert
      expect(getResponse.body.data).toMatchObject({
        id: shootId,
        title: shootData.title,
        clientEmail: shootData.clientEmail,
        photographerId: shootData.photographerId
      });
    });

    it('should return 404 for non-existent shoot', async () => {
      const nonExistentId = 'shoot_1234567890abcdef1234567890abcdef';

      const response = await request
        .get(`/shoots/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        code: 404,
        message: 'Shoot not found'
      });
    });
  });

  describe('Shoot Listing and Filtering', () => {
    beforeEach(async () => {
      // Create test data
      const testShoots = [
        {
          title: 'Wedding Alpha',
          clientEmail: 'alpha@example.com',
          photographerId: 'photographer_1',
          status: 'planned'
        },
        {
          title: 'Portrait Beta',
          clientEmail: 'beta@example.com',
          photographerId: 'photographer_2',
          status: 'completed'
        },
        {
          title: 'Wedding Gamma',
          clientEmail: 'gamma@example.com',
          photographerId: 'photographer_1',
          status: 'planned'
        }
      ];

      for (const shoot of testShoots) {
        await request.post('/shoots').send(shoot).expect(201);
      }
    });

    it('should list all shoots with pagination', async () => {
      const response = await request
        .get('/shoots')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1
      });
    });

    it('should filter shoots by photographer', async () => {
      const response = await request
        .get('/shoots?photographerId=photographer_1')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((shoot: any) => 
        shoot.photographerId === 'photographer_1'
      )).toBe(true);
    });

    it('should filter shoots by status', async () => {
      const response = await request
        .get('/shoots?status=completed')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('completed');
    });

    it('should handle pagination', async () => {
      const response = await request
        .get('/shoots?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2
      });
    });
  });

  describe('Shoot Updates', () => {
    it('should update shoot and persist changes', async () => {
      // Arrange: Create a shoot
      const shootData: CreateShootRequest = {
        title: 'Original Title',
        clientEmail: 'update@example.com',
        photographerId: 'photographer_update'
      };

      const createResponse = await request
        .post('/shoots')
        .send(shootData)
        .expect(201);

      const shootId = createResponse.body.data.id;

      // Act: Update the shoot
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress',
        location: 'New Location'
      };

      const updateResponse = await request
        .patch(`/shoots/${shootId}`)
        .send(updateData)
        .expect(200);

      // Assert: Verify response
      expect(updateResponse.body.data).toMatchObject({
        id: shootId,
        title: 'Updated Title',
        status: 'in_progress',
        location: 'New Location',
        clientEmail: 'update@example.com' // Should preserve unchanged fields
      });

      // Assert: Verify database persistence
      const dbShoot = await mongoose.connection.db
        ?.collection('shoots')
        .findOne({ id: shootId });

      expect(dbShoot?.title).toBe('Updated Title');
      expect(dbShoot?.status).toBe('in_progress');
      expect(dbShoot?.location).toBe('New Location');
    });

    it('should return 404 when updating non-existent shoot', async () => {
      const nonExistentId = 'shoot_1234567890abcdef1234567890abcdef';

      const response = await request
        .patch(`/shoots/${nonExistentId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toMatchObject({
        code: 404,
        message: 'Shoot not found'
      });
    });
  });

  describe('Shoot Deletion', () => {
    it('should delete shoot and remove from database', async () => {
      // Arrange: Create a shoot
      const shootData: CreateShootRequest = {
        title: 'To Be Deleted',
        clientEmail: 'delete@example.com',
        photographerId: 'photographer_delete'
      };

      const createResponse = await request
        .post('/shoots')
        .send(shootData)
        .expect(201);

      const shootId = createResponse.body.data.id;

      // Act: Delete the shoot
      const deleteResponse = await request
        .delete(`/shoots/${shootId}`)
        .expect(200);

      // Assert: Verify response
      expect(deleteResponse.body).toMatchObject({
        data: { deleted: true },
        message: 'Shoot deleted successfully'
      });

      // Assert: Verify database removal
      const dbShoot = await mongoose.connection.db
        ?.collection('shoots')
        .findOne({ id: shootId });

      expect(dbShoot).toBeNull();

      // Assert: Verify GET returns 404
      await request
        .get(`/shoots/${shootId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent shoot', async () => {
      const nonExistentId = 'shoot_1234567890abcdef1234567890abcdef';

      const response = await request
        .delete(`/shoots/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        code: 404,
        message: 'Shoot not found'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close the database connection
      await mongoose.disconnect();

      const shootData: CreateShootRequest = {
        title: 'Error Test Shoot',
        clientEmail: 'error@example.com',
        photographerId: 'photographer_error'
      };

      const response = await request
        .post('/shoots')
        .send(shootData)
        .expect(500);

      expect(response.body).toMatchObject({
        code: 500,
        message: 'Failed to create shoot'
      });

      // Reconnect for cleanup
      const context = getComponentTestContext();
      await mongoose.connect(context.mongoUri);
    });
  });
});