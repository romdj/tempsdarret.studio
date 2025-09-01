import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../src/server';
import { 
  CreateShootRequestSchema, 
  UpdateShootRequestSchema, 
  ShootQuerySchema, 
  ShootSchema 
} from '@tempsdarret/shared/schemas/shoot.schema';

describe('Shoot API Contract Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create server instance for contract testing
    app = await createServer({ 
      logger: false,
      // Use in-memory database for contract tests
      mongoUrl: 'memory',
      kafkaConfig: {
        clientId: 'contract-test',
        brokers: ['localhost:9092']
      }
    });
    
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Health Check Contract', () => {
    it('GET /health should return valid health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
        service: expect.any(String)
      });
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });
  });

  describe('POST /shoots Contract', () => {
    it('should accept valid CreateShootRequest and return valid Shoot', async () => {
      const validPayload = {
        title: 'Contract Test Wedding',
        clientEmail: 'contract@example.com',
        photographerId: 'photographer_123',
        scheduledDate: '2024-12-01T14:00:00Z',
        location: 'Test Venue'
      };

      // Validate request payload against schema
      const requestValidation = CreateShootRequestSchema.safeParse({
        ...validPayload,
        scheduledDate: new Date(validPayload.scheduledDate)
      });
      expect(requestValidation.success).toBe(true);

      const response = await app.inject({
        method: 'POST',
        url: '/shoots',
        payload: validPayload
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate response matches Shoot schema
      const responseValidation = ShootSchema.safeParse({
        ...responseBody,
        scheduledDate: responseBody.scheduledDate ? new Date(responseBody.scheduledDate) : undefined,
        createdAt: new Date(responseBody.createdAt),
        updatedAt: new Date(responseBody.updatedAt)
      });
      
      expect(responseValidation.success).toBe(true);
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        title: 'Contract Test Wedding',
        clientEmail: 'contract@example.com',
        photographerId: 'photographer_123',
        status: 'planned',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should reject invalid CreateShootRequest with 400', async () => {
      const invalidPayloads = [
        // Missing required fields
        { title: 'Test' },
        // Invalid email format
        { title: 'Test', clientEmail: 'invalid-email', photographerId: 'photographer_123' },
        // Title too long
        { title: 'A'.repeat(101), clientEmail: 'test@example.com', photographerId: 'photographer_123' },
        // Location too long
        { title: 'Test', clientEmail: 'test@example.com', photographerId: 'photographer_123', location: 'A'.repeat(501) }
      ];

      for (const invalidPayload of invalidPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: '/shoots',
          payload: invalidPayload
        });

        expect(response.statusCode).toBe(400);
        expect(response.headers['content-type']).toContain('application/json');
        
        const errorBody = JSON.parse(response.body);
        expect(errorBody).toMatchObject({
          error: expect.any(String),
          message: expect.any(String),
          statusCode: 400
        });
      }
    });
  });

  describe('GET /shoots Contract', () => {
    let createdShootId: string;

    beforeEach(async () => {
      // Create a test shoot for GET operations
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shoots',
        payload: {
          title: 'Query Test Shoot',
          clientEmail: 'query@example.com',
          photographerId: 'photographer_query'
        }
      });
      
      createdShootId = JSON.parse(createResponse.body).id;
    });

    it('should return paginated list with valid query parameters', async () => {
      const validQueries = [
        {},
        { photographerId: 'photographer_query' },
        { status: 'planned' },
        { page: '1', limit: '10' },
        { fromDate: '2024-01-01T00:00:00Z', toDate: '2024-12-31T23:59:59Z' }
      ];

      for (const query of validQueries) {
        const response = await app.inject({
          method: 'GET',
          url: '/shoots',
          query
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');

        const responseBody = JSON.parse(response.body);
        expect(responseBody).toMatchObject({
          shoots: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          totalPages: expect.any(Number)
        });

        // Validate each shoot in the response
        for (const shoot of responseBody.shoots) {
          const shootValidation = ShootSchema.safeParse({
            ...shoot,
            scheduledDate: shoot.scheduledDate ? new Date(shoot.scheduledDate) : undefined,
            createdAt: new Date(shoot.createdAt),
            updatedAt: new Date(shoot.updatedAt)
          });
          expect(shootValidation.success).toBe(true);
        }
      }
    });

    it('should reject invalid query parameters with 400', async () => {
      const invalidQueries = [
        { page: '0' },           // Page must be >= 1
        { limit: '0' },          // Limit must be >= 1
        { limit: '101' },        // Limit must be <= 100
        { status: 'invalid' },   // Invalid status enum
        { fromDate: 'invalid-date' }  // Invalid date format
      ];

      for (const invalidQuery of invalidQueries) {
        const response = await app.inject({
          method: 'GET',
          url: '/shoots',
          query: invalidQuery
        });

        expect(response.statusCode).toBe(400);
        expect(response.headers['content-type']).toContain('application/json');
      }
    });
  });

  describe('GET /shoots/:shootId Contract', () => {
    let createdShootId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shoots',
        payload: {
          title: 'Get Test Shoot',
          clientEmail: 'get@example.com',
          photographerId: 'photographer_get'
        }
      });
      
      createdShootId = JSON.parse(createResponse.body).id;
    });

    it('should return valid Shoot for existing ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/shoots/${createdShootId}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate response matches Shoot schema
      const shootValidation = ShootSchema.safeParse({
        ...responseBody,
        scheduledDate: responseBody.scheduledDate ? new Date(responseBody.scheduledDate) : undefined,
        createdAt: new Date(responseBody.createdAt),
        updatedAt: new Date(responseBody.updatedAt)
      });
      
      expect(shootValidation.success).toBe(true);
      expect(responseBody.id).toBe(createdShootId);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shoots/nonexistent-id'
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      
      const errorBody = JSON.parse(response.body);
      expect(errorBody).toMatchObject({
        error: expect.any(String),
        statusCode: 404
      });
    });
  });

  describe('PATCH /shoots/:shootId Contract', () => {
    let createdShootId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shoots',
        payload: {
          title: 'Update Test Shoot',
          clientEmail: 'update@example.com',
          photographerId: 'photographer_update'
        }
      });
      
      createdShootId = JSON.parse(createResponse.body).id;
    });

    it('should accept valid UpdateShootRequest and return updated Shoot', async () => {
      const validUpdate = {
        title: 'Updated Title',
        status: 'in_progress',
        location: 'Updated Location'
      };

      // Validate request payload against schema
      const requestValidation = UpdateShootRequestSchema.safeParse(validUpdate);
      expect(requestValidation.success).toBe(true);

      const response = await app.inject({
        method: 'PATCH',
        url: `/shoots/${createdShootId}`,
        payload: validUpdate
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate response matches Shoot schema
      const shootValidation = ShootSchema.safeParse({
        ...responseBody,
        scheduledDate: responseBody.scheduledDate ? new Date(responseBody.scheduledDate) : undefined,
        createdAt: new Date(responseBody.createdAt),
        updatedAt: new Date(responseBody.updatedAt)
      });
      
      expect(shootValidation.success).toBe(true);
      expect(responseBody).toMatchObject({
        id: createdShootId,
        title: 'Updated Title',
        status: 'in_progress',
        location: 'Updated Location'
      });
    });

    it('should reject invalid UpdateShootRequest with 400', async () => {
      const invalidUpdates = [
        { title: '' },                    // Empty title
        { title: 'A'.repeat(101) },       // Title too long
        { status: 'invalid_status' },     // Invalid status
        { location: 'A'.repeat(501) }     // Location too long
      ];

      for (const invalidUpdate of invalidUpdates) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/shoots/${createdShootId}`,
          payload: invalidUpdate
        });

        expect(response.statusCode).toBe(400);
        expect(response.headers['content-type']).toContain('application/json');
      }
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/shoots/nonexistent-id',
        payload: { title: 'Updated Title' }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /shoots/:shootId Contract', () => {
    let createdShootId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shoots',
        payload: {
          title: 'Delete Test Shoot',
          clientEmail: 'delete@example.com',
          photographerId: 'photographer_delete'
        }
      });
      
      createdShootId = JSON.parse(createResponse.body).id;
    });

    it('should return 204 for successful deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/shoots/${createdShootId}`
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');

      // Verify the shoot is actually deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shoots/${createdShootId}`
      });
      
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/shoots/nonexistent-id'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Content-Type and Headers Contract', () => {
    it('should set correct headers for all endpoints', async () => {
      const endpoints = [
        { method: 'GET', url: '/health' },
        { method: 'GET', url: '/shoots' },
        { method: 'POST', url: '/shoots', payload: { title: 'Test', clientEmail: 'test@example.com', photographerId: 'test' }}
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject(endpoint);
        
        // All JSON responses should have correct content-type
        if (response.statusCode !== 204) {
          expect(response.headers['content-type']).toContain('application/json');
        }
        
        // Check for security headers (if implemented)
        // expect(response.headers['x-content-type-options']).toBe('nosniff');
        // expect(response.headers['x-frame-options']).toBe('DENY');
      }
    });
  });

  describe('Error Response Contract', () => {
    it('should return consistent error format for all error responses', async () => {
      const errorEndpoints = [
        { method: 'GET', url: '/shoots/nonexistent-id', expectedStatus: 404 },
        { method: 'POST', url: '/shoots', payload: { title: '' }, expectedStatus: 400 },
        { method: 'DELETE', url: '/shoots/nonexistent-id', expectedStatus: 404 }
      ];

      for (const endpoint of errorEndpoints) {
        const response = await app.inject(endpoint);
        
        expect(response.statusCode).toBe(endpoint.expectedStatus);
        expect(response.headers['content-type']).toContain('application/json');
        
        const errorBody = JSON.parse(response.body);
        expect(errorBody).toMatchObject({
          error: expect.any(String),
          statusCode: endpoint.expectedStatus,
          message: expect.any(String)
        });
      }
    });
  });
});