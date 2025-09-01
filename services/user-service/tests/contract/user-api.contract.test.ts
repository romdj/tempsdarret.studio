import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../src/server';
import { 
  CreateUserRequestSchema, 
  UpdateUserRequestSchema, 
  UserQuerySchema, 
  UserSchema 
} from '@tempsdarret/shared/schemas/user.schema';

describe('User API Contract Tests (TypeSpec Compliance)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create server instance for contract testing
    app = await createServer({ 
      logger: false,
      // Use in-memory database for contract tests
      mongoUrl: 'memory',
      kafkaConfig: {
        clientId: 'user-contract-test',
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

  describe('POST /users Contract (TypeSpec CreateUserRequest → User)', () => {
    it('should accept valid CreateUserRequest and return TypeSpec User', async () => {
      const validPayload = {
        email: 'contract@example.com',
        name: 'Contract Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg'
      };

      // Validate request payload against TypeSpec schema
      const requestValidation = CreateUserRequestSchema.safeParse(validPayload);
      expect(requestValidation.success).toBe(true);

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: validPayload
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate response matches TypeSpec SuccessResponse<User>
      expect(responseBody).toMatchObject({
        data: expect.any(Object),
        message: expect.any(String)
      });

      // Validate User schema compliance
      const userValidation = UserSchema.safeParse({
        ...responseBody.data,
        createdAt: new Date(responseBody.data.createdAt),
        updatedAt: new Date(responseBody.data.updatedAt)
      });
      
      expect(userValidation.success).toBe(true);
      expect(responseBody.data).toMatchObject({
        id: expect.any(String),
        email: 'contract@example.com',
        name: 'Contract Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        isActive: true, // TypeSpec default value
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should reject invalid CreateUserRequest with TypeSpec ApiError', async () => {
      const invalidPayloads = [
        // Missing required fields (violates TypeSpec)
        { name: 'Test User', role: 'client' }, // missing email
        { email: 'test@example.com', role: 'client' }, // missing name
        { email: 'test@example.com', name: 'Test User' }, // missing role
        
        // Invalid field types/formats
        { email: 'invalid-email', name: 'Test User', role: 'client' }, // invalid email format
        { email: 'test@example.com', name: '', role: 'client' }, // name too short
        { email: 'test@example.com', name: 'A'.repeat(101), role: 'client' }, // name too long
        { email: 'test@example.com', name: 'Test User', role: 'invalid' }, // invalid role enum
        
        // Invalid optional fields
        { email: 'test@example.com', name: 'Test User', role: 'client', profilePictureUrl: 'not-a-url' }
      ];

      for (const invalidPayload of invalidPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: '/users',
          payload: invalidPayload
        });

        expect(response.statusCode).toBe(400);
        expect(response.headers['content-type']).toContain('application/json');
        
        const errorBody = JSON.parse(response.body);
        // Validate TypeSpec ApiError format
        expect(errorBody).toMatchObject({
          error: expect.any(String),
          message: expect.any(String),
          statusCode: 400
        });
      }
    });

    it('should return 409 for duplicate email (business rule)', async () => {
      const userPayload = {
        email: 'duplicate@example.com',
        name: 'First User',
        role: 'client'
      };

      // Create first user
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      expect(firstResponse.statusCode).toBe(201);

      // Try to create duplicate
      const duplicateResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { ...userPayload, name: 'Duplicate User' }
      });

      expect(duplicateResponse.statusCode).toBe(409);
      const errorBody = JSON.parse(duplicateResponse.body);
      expect(errorBody).toMatchObject({
        error: 'Conflict',
        message: 'User already exists',
        statusCode: 409
      });
    });
  });

  describe('GET /users Contract (TypeSpec UserQuery → PaginatedResponse<User>)', () => {
    let createdUserIds: string[] = [];

    beforeEach(async () => {
      // Create test users for query operations
      const testUsers = [
        { email: 'query1@example.com', name: 'Query User One', role: 'client' },
        { email: 'query2@example.com', name: 'Query User Two', role: 'photographer' },
        { email: 'query3@example.com', name: 'Active User', role: 'client' }
      ];

      for (const userData of testUsers) {
        const response = await app.inject({
          method: 'POST',
          url: '/users',
          payload: userData
        });
        const body = JSON.parse(response.body);
        createdUserIds.push(body.data.id);
      }
    });

    it('should return TypeSpec PaginatedResponse<User> with default query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate TypeSpec PaginatedResponse structure
      expect(responseBody).toMatchObject({
        data: expect.any(Array),
        meta: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number)
        }
      });

      // Validate default pagination values from TypeSpec
      expect(responseBody.meta.page).toBe(1);
      expect(responseBody.meta.limit).toBe(20);

      // Validate each User in response
      for (const user of responseBody.data) {
        const userValidation = UserSchema.safeParse({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        });
        expect(userValidation.success).toBe(true);
      }
    });

    it('should accept valid TypeSpec UserQuery parameters', async () => {
      const validQueries = [
        { role: 'client' },
        { role: 'photographer' },
        { isActive: true },
        { isActive: false },
        { search: 'query' },
        { page: 1, limit: 10 },
        { role: 'client', isActive: true },
        { search: 'user', page: 1, limit: 5 }
      ];

      for (const query of validQueries) {
        // Validate query against TypeSpec UserQuery schema
        const queryValidation = UserQuerySchema.safeParse(query);
        expect(queryValidation.success).toBe(true);

        const response = await app.inject({
          method: 'GET',
          url: '/users',
          query
        });

        expect(response.statusCode).toBe(200);
        const responseBody = JSON.parse(response.body);
        
        // Verify pagination values match request
        if (query.page) expect(responseBody.meta.page).toBe(query.page);
        if (query.limit) expect(responseBody.meta.limit).toBe(query.limit);
      }
    });

    it('should reject invalid TypeSpec UserQuery parameters', async () => {
      const invalidQueries = [
        { page: 0 },           // page must be >= 1
        { limit: 0 },          // limit must be >= 1  
        { limit: 101 },        // limit must be <= 100
        { role: 'invalid' },   // invalid UserRole enum
        { isActive: 'true' },  // isActive must be boolean
        { page: 'invalid' },   // page must be number
        { limit: 'invalid' }   // limit must be number
      ];

      for (const invalidQuery of invalidQueries) {
        const response = await app.inject({
          method: 'GET',
          url: '/users',
          query: invalidQuery
        });

        expect(response.statusCode).toBe(400);
        const errorBody = JSON.parse(response.body);
        expect(errorBody).toMatchObject({
          error: 'Validation Error',
          statusCode: 400
        });
      }
    });
  });

  describe('GET /users/:userId Contract (TypeSpec → SuccessResponse<User>)', () => {
    let testUserId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'gettest@example.com',
          name: 'Get Test User',
          role: 'client'
        }
      });
      
      testUserId = JSON.parse(createResponse.body).data.id;
    });

    it('should return TypeSpec SuccessResponse<User> for existing user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate TypeSpec SuccessResponse<User> structure
      expect(responseBody).toMatchObject({
        data: expect.any(Object)
      });

      // Validate User schema compliance
      const userValidation = UserSchema.safeParse({
        ...responseBody.data,
        createdAt: new Date(responseBody.data.createdAt),
        updatedAt: new Date(responseBody.data.updatedAt)
      });
      
      expect(userValidation.success).toBe(true);
      expect(responseBody.data.id).toBe(testUserId);
    });

    it('should return TypeSpec ApiError for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/nonexistent-id'
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      
      const errorBody = JSON.parse(response.body);
      expect(errorBody).toMatchObject({
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404
      });
    });
  });

  describe('PATCH /users/:userId Contract (TypeSpec UpdateUserRequest → SuccessResponse<User>)', () => {
    let testUserId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'update@example.com',
          name: 'Update Test User',
          role: 'client'
        }
      });
      
      testUserId = JSON.parse(createResponse.body).data.id;
    });

    it('should accept valid TypeSpec UpdateUserRequest and return User', async () => {
      const validUpdate = {
        name: 'Updated Name',
        profilePictureUrl: 'https://example.com/new-avatar.jpg',
        isActive: false
      };

      // Validate request against TypeSpec schema
      const requestValidation = UpdateUserRequestSchema.safeParse(validUpdate);
      expect(requestValidation.success).toBe(true);

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${testUserId}`,
        payload: validUpdate
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate TypeSpec SuccessResponse<User> structure
      expect(responseBody).toMatchObject({
        data: expect.any(Object),
        message: expect.any(String)
      });

      // Validate updated User schema compliance
      const userValidation = UserSchema.safeParse({
        ...responseBody.data,
        createdAt: new Date(responseBody.data.createdAt),
        updatedAt: new Date(responseBody.data.updatedAt)
      });
      
      expect(userValidation.success).toBe(true);
      expect(responseBody.data).toMatchObject({
        id: testUserId,
        name: 'Updated Name',
        profilePictureUrl: 'https://example.com/new-avatar.jpg',
        isActive: false
      });
    });

    it('should reject invalid TypeSpec UpdateUserRequest', async () => {
      const invalidUpdates = [
        { name: '' },                    // name too short (violates minLength(1))
        { name: 'A'.repeat(101) },       // name too long (violates maxLength(100))
        { isActive: 'false' },           // isActive must be boolean
        { profilePictureUrl: 'not-url' } // invalid URL format
      ];

      for (const invalidUpdate of invalidUpdates) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/users/${testUserId}`,
          payload: invalidUpdate
        });

        expect(response.statusCode).toBe(400);
        const errorBody = JSON.parse(response.body);
        expect(errorBody).toMatchObject({
          error: 'Validation Error',
          statusCode: 400
        });
      }
    });

    it('should return TypeSpec ApiError for non-existent user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/nonexistent-id',
        payload: { name: 'Updated Name' }
      });

      expect(response.statusCode).toBe(404);
      const errorBody = JSON.parse(response.body);
      expect(errorBody).toMatchObject({
        error: 'Not Found',
        statusCode: 404
      });
    });
  });

  describe('DELETE /users/:userId Contract (TypeSpec deactivateUser → SuccessResponse<User>)', () => {
    let testUserId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'delete@example.com',
          name: 'Delete Test User',
          role: 'client'
        }
      });
      
      testUserId = JSON.parse(createResponse.body).data.id;
    });

    it('should return TypeSpec SuccessResponse<User> with isActive=false', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${testUserId}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const responseBody = JSON.parse(response.body);
      
      // Validate TypeSpec SuccessResponse<User> structure
      expect(responseBody).toMatchObject({
        data: expect.any(Object),
        message: expect.any(String)
      });

      // Validate deactivated User schema compliance
      const userValidation = UserSchema.safeParse({
        ...responseBody.data,
        createdAt: new Date(responseBody.data.createdAt),
        updatedAt: new Date(responseBody.data.updatedAt)
      });
      
      expect(userValidation.success).toBe(true);
      expect(responseBody.data).toMatchObject({
        id: testUserId,
        isActive: false // TypeSpec deactivateUser should set isActive to false
      });
    });

    it('should return TypeSpec ApiError for non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/users/nonexistent-id'
      });

      expect(response.statusCode).toBe(404);
      const errorBody = JSON.parse(response.body);
      expect(errorBody).toMatchObject({
        error: 'Not Found',
        statusCode: 404
      });
    });
  });

  describe('HTTP Headers and Content-Type Contract', () => {
    it('should set correct content-type headers for all endpoints', async () => {
      const endpoints = [
        { method: 'GET', url: '/health' },
        { method: 'GET', url: '/users' },
        { 
          method: 'POST', 
          url: '/users', 
          payload: { email: 'header@example.com', name: 'Header Test', role: 'client' }
        }
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject(endpoint);
        
        // All JSON responses should have correct content-type
        expect(response.headers['content-type']).toContain('application/json');
        
        // Check for consistent charset
        if (response.headers['content-type'].includes('charset')) {
          expect(response.headers['content-type']).toContain('charset=utf-8');
        }
      }
    });
  });

  describe('Error Response Consistency (TypeSpec ApiError)', () => {
    it('should return consistent TypeSpec ApiError format for all error responses', async () => {
      const errorEndpoints = [
        { 
          method: 'GET', 
          url: '/users/nonexistent-id', 
          expectedStatus: 404,
          expectedError: 'Not Found'
        },
        { 
          method: 'POST', 
          url: '/users', 
          payload: { name: 'No Email' }, 
          expectedStatus: 400,
          expectedError: 'Validation Error'
        },
        { 
          method: 'DELETE', 
          url: '/users/nonexistent-id', 
          expectedStatus: 404,
          expectedError: 'Not Found'
        }
      ];

      for (const endpoint of errorEndpoints) {
        const response = await app.inject(endpoint);
        
        expect(response.statusCode).toBe(endpoint.expectedStatus);
        expect(response.headers['content-type']).toContain('application/json');
        
        const errorBody = JSON.parse(response.body);
        
        // Validate TypeSpec ApiError structure
        expect(errorBody).toMatchObject({
          error: endpoint.expectedError,
          statusCode: endpoint.expectedStatus,
          message: expect.any(String)
        });
      }
    });
  });
});