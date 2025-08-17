import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { ShootController } from './shoot.controller';
import { ShootService } from '../services/shoot.service';
import { CreateShootRequest, Shoot, ShootStatus } from '@tempsdarret/shared/schemas/shoot.schema';
import { ZodError } from 'zod';

// Mock the shoot service
const mockShootService = {
  createShoot: vi.fn(),
  getShoot: vi.fn(),
  updateShoot: vi.fn(),
  listShoots: vi.fn(),
  deleteShoot: vi.fn()
};

// Mock Fastify request and reply
const createMockRequest = <T extends RouteGenericInterface = RouteGenericInterface>(data: any = {}) => ({
  body: data.body || {},
  params: data.params || {},
  query: data.query || {}
}) as FastifyRequest<T>;

const createMockReply = () => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  } as unknown as FastifyReply;
  return reply;
};

describe('ShootController', () => {
  let controller: ShootController;

  beforeEach(() => {
    controller = new ShootController(mockShootService as any);
    vi.clearAllMocks();
  });

  describe('createShoot', () => {
    it('should create a shoot and return 201 with success response', async () => {
      const requestData: CreateShootRequest = {
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        scheduledDate: new Date('2024-06-15T14:00:00Z'),
        location: 'Central Park'
      };

      const createdShoot: Shoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        ...requestData,
        status: 'planned',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z')
      };

      mockShootService.createShoot.mockResolvedValue(createdShoot);

      const request = createMockRequest<{ Body: CreateShootRequest }>({ body: requestData });
      const reply = createMockReply();

      await controller.createShoot(request, reply);

      expect(mockShootService.createShoot).toHaveBeenCalledWith(requestData);
      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({
        data: createdShoot,
        message: 'Shoot created successfully'
      });
    });

    it('should return 400 for validation errors', async () => {
      const invalidRequest = {
        title: '', // Invalid empty title
        clientEmail: 'invalid-email',
        photographerId: 'photographer_123'
      };

      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          origin: 'value',
          message: 'String must contain at least 1 character(s)',
          path: ['title']
        }
      ]);

      mockShootService.createShoot.mockRejectedValue(zodError);

      const request = createMockRequest({ body: invalidRequest });
      const reply = createMockReply();

      await controller.createShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        code: 400,
        message: 'Validation error',
        details: 'Validation failed'
      });
    });

    it('should return 500 for internal errors', async () => {
      const requestData: CreateShootRequest = {
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      mockShootService.createShoot.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest<{ Body: CreateShootRequest }>({ body: requestData });
      const reply = createMockReply();

      await controller.createShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to create shoot'
      });
    });
  });

  describe('getShoot', () => {
    it('should return a shoot when found', async () => {
      const shoot: Shoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'planned',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z')
      };

      mockShootService.getShoot.mockResolvedValue(shoot);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' } 
      });
      const reply = createMockReply();

      await controller.getShoot(request, reply);

      expect(mockShootService.getShoot).toHaveBeenCalledWith('shoot_1234567890abcdef1234567890abcdef');
      expect(reply.send).toHaveBeenCalledWith({
        data: shoot
      });
    });

    it('should return 404 when shoot not found', async () => {
      mockShootService.getShoot.mockResolvedValue(null);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_nonexistent123456789012345678901234' } 
      });
      const reply = createMockReply();

      await controller.getShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        code: 404,
        message: 'Shoot not found'
      });
    });

    it('should return 500 for internal errors', async () => {
      mockShootService.getShoot.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' } 
      });
      const reply = createMockReply();

      await controller.getShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to get shoot'
      });
    });
  });

  describe('updateShoot', () => {
    it('should update a shoot successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress' as ShootStatus
      };

      const updatedShoot: Shoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        title: 'Updated Title',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'in_progress',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T12:00:00Z')
      };

      mockShootService.updateShoot.mockResolvedValue(updatedShoot);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' },
        body: updateData
      });
      const reply = createMockReply();

      await controller.updateShoot(request, reply);

      expect(mockShootService.updateShoot).toHaveBeenCalledWith(
        'shoot_1234567890abcdef1234567890abcdef',
        updateData
      );
      expect(reply.send).toHaveBeenCalledWith({
        data: updatedShoot,
        message: 'Shoot updated successfully'
      });
    });

    it('should return 404 when shoot not found', async () => {
      mockShootService.updateShoot.mockResolvedValue(null);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_nonexistent123456789012345678901234' },
        body: { title: 'Updated Title' }
      });
      const reply = createMockReply();

      await controller.updateShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        code: 404,
        message: 'Shoot not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          origin: 'value',
          message: 'String must contain at least 1 character(s)',
          path: ['title']
        }
      ]);

      mockShootService.updateShoot.mockRejectedValue(zodError);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' },
        body: { title: '' }
      });
      const reply = createMockReply();

      await controller.updateShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        code: 400,
        message: 'Validation error',
        details: 'Validation failed'
      });
    });
  });

  describe('listShoots', () => {
    it('should list shoots with pagination', async () => {
      const shoots: Shoot[] = [
        {
          id: 'shoot_1234567890abcdef1234567890abcdef',
          title: 'Shoot 1',
          clientEmail: 'client1@example.com',
          photographerId: 'photographer_123',
          status: 'planned',
          createdAt: new Date('2024-01-10T10:00:00Z'),
          updatedAt: new Date('2024-01-10T10:00:00Z')
        },
        {
          id: 'shoot_abcdef1234567890abcdef1234567890',
          title: 'Shoot 2',
          clientEmail: 'client2@example.com',
          photographerId: 'photographer_123',
          status: 'completed',
          createdAt: new Date('2024-01-09T10:00:00Z'),
          updatedAt: new Date('2024-01-09T10:00:00Z')
        }
      ];

      mockShootService.listShoots.mockResolvedValue({
        shoots,
        total: 25
      });

      const request = createMockRequest({ 
        query: { page: 1, limit: 10, photographerId: 'photographer_123' }
      });
      const reply = createMockReply();

      await controller.listShoots(request, reply);

      expect(mockShootService.listShoots).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        photographerId: 'photographer_123'
      });
      expect(reply.send).toHaveBeenCalledWith({
        data: shoots,
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          origin: 'value',
          message: 'Number must be greater than or equal to 1',
          path: ['page']
        }
      ]);

      mockShootService.listShoots.mockRejectedValue(zodError);

      const request = createMockRequest({ 
        query: { page: 0 } // Invalid page number
      });
      const reply = createMockReply();

      await controller.listShoots(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        code: 400,
        message: 'Invalid query parameters',
        details: 'Validation failed'
      });
    });
  });

  describe('deleteShoot', () => {
    it('should delete a shoot successfully', async () => {
      mockShootService.deleteShoot.mockResolvedValue(true);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' }
      });
      const reply = createMockReply();

      await controller.deleteShoot(request, reply);

      expect(mockShootService.deleteShoot).toHaveBeenCalledWith('shoot_1234567890abcdef1234567890abcdef');
      expect(reply.send).toHaveBeenCalledWith({
        data: { deleted: true },
        message: 'Shoot deleted successfully'
      });
    });

    it('should return 404 when shoot not found', async () => {
      mockShootService.deleteShoot.mockResolvedValue(false);

      const request = createMockRequest({ 
        params: { shootId: 'shoot_nonexistent123456789012345678901234' }
      });
      const reply = createMockReply();

      await controller.deleteShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        code: 404,
        message: 'Shoot not found'
      });
    });

    it('should return 500 for internal errors', async () => {
      mockShootService.deleteShoot.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ 
        params: { shootId: 'shoot_1234567890abcdef1234567890abcdef' }
      });
      const reply = createMockReply();

      await controller.deleteShoot(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to delete shoot'
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await controller.healthCheck(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        status: 'ok',
        service: 'shoot-service'
      });
    });
  });
});