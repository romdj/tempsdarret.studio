import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShootService } from './shoot.service';
import { ShootModel } from '../schemas/shoot.mongoose';
import { CreateShootRequest, ShootStatus } from '@tempsdarret/shared/schemas/shoot.schema';
import { ZodError } from 'zod';

// Mock the event publisher
const mockEventPublisher = {
  publish: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
};

describe('ShootService', () => {
  let shootService: ShootService;

  beforeEach(() => {
    shootService = new ShootService(mockEventPublisher as any);
    vi.clearAllMocks();
  });

  describe('createShoot', () => {
    it('should create a shoot with valid data', async () => {
      const shootData: CreateShootRequest = {
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        scheduledDate: new Date('2024-06-15T14:00:00Z'),
        location: 'Central Park'
      };

      const createdShoot = await shootService.createShoot(shootData);

      expect(createdShoot).toMatchObject({
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        location: 'Central Park',
        status: 'planned'
      });
      expect(createdShoot.id).toMatch(/^shoot_[a-f0-9]{32}$/);
      expect(createdShoot.createdAt).toBeInstanceOf(Date);
      expect(createdShoot.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a shoot without optional fields', async () => {
      const shootData: CreateShootRequest = {
        title: 'Portrait Session',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_456'
      };

      const createdShoot = await shootService.createShoot(shootData);

      expect(createdShoot).toMatchObject({
        title: 'Portrait Session',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_456',
        status: 'planned'
      });
      expect(createdShoot.scheduledDate).toBeNull();
      expect(createdShoot.location).toBeNull();
    });

    it('should publish an event after creating a shoot', async () => {
      const shootData: CreateShootRequest = {
        title: 'Event Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_789'
      };

      await shootService.createShoot(shootData);

      expect(mockEventPublisher.publish).toHaveBeenCalledOnce();
      const [topic, event, key] = mockEventPublisher.publish.mock.calls[0];
      
      expect(topic).toBe('shoots');
      expect(event).toMatchObject({
        eventType: 'shoot.created',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_789',
        title: 'Event Photography'
      });
      expect(event.shootId).toMatch(/^shoot_[a-f0-9]{32}$/);
      expect(key).toMatch(/^shoot_[a-f0-9]{32}$/);
    });

    it('should throw ZodError for invalid email', async () => {
      const shootData = {
        title: 'Test Shoot',
        clientEmail: 'invalid-email',
        photographerId: 'photographer_123'
      } as CreateShootRequest;

      await expect(shootService.createShoot(shootData)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for empty title', async () => {
      const shootData = {
        title: '',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      } as CreateShootRequest;

      await expect(shootService.createShoot(shootData)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for title exceeding max length', async () => {
      const shootData = {
        title: 'A'.repeat(101), // Exceeds 100 character limit
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      } as CreateShootRequest;

      await expect(shootService.createShoot(shootData)).rejects.toThrow(ZodError);
    });
  });

  describe('getShoot', () => {
    it('should return a shoot by ID', async () => {
      const shootData: CreateShootRequest = {
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const createdShoot = await shootService.createShoot(shootData);
      const foundShoot = await shootService.getShoot(createdShoot.id);

      expect(foundShoot).toMatchObject({
        id: createdShoot.id,
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      });
    });

    it('should return null for non-existent shoot', async () => {
      const foundShoot = await shootService.getShoot('shoot_nonexistent123456789012345678901234');
      expect(foundShoot).toBeNull();
    });
  });

  describe('updateShoot', () => {
    it('should update a shoot with valid data', async () => {
      const shootData: CreateShootRequest = {
        title: 'Original Title',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const createdShoot = await shootService.createShoot(shootData);
      
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress' as ShootStatus,
        location: 'New Location'
      };

      const updatedShoot = await shootService.updateShoot(createdShoot.id, updateData);

      expect(updatedShoot).toMatchObject({
        id: createdShoot.id,
        title: 'Updated Title',
        status: 'in_progress',
        location: 'New Location',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      });
    });

    it('should return null for non-existent shoot', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedShoot = await shootService.updateShoot('shoot_nonexistent123456789012345678901234', updateData);
      expect(updatedShoot).toBeNull();
    });

    it('should throw ZodError for invalid update data', async () => {
      const shootData: CreateShootRequest = {
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const createdShoot = await shootService.createShoot(shootData);
      
      const invalidUpdateData = {
        title: '', // Empty title should fail validation
      };

      await expect(shootService.updateShoot(createdShoot.id, invalidUpdateData)).rejects.toThrow(ZodError);
    });
  });

  describe('listShoots', () => {
    beforeEach(async () => {
      // Create test data
      const testShoots: CreateShootRequest[] = [
        {
          title: 'Wedding 1',
          clientEmail: 'wedding1@example.com',
          photographerId: 'photographer_1',
          scheduledDate: new Date('2024-06-01')
        },
        {
          title: 'Portrait 1',
          clientEmail: 'portrait1@example.com',
          photographerId: 'photographer_2',
          scheduledDate: new Date('2024-06-15')
        },
        {
          title: 'Wedding 2',
          clientEmail: 'wedding2@example.com',
          photographerId: 'photographer_1',
          scheduledDate: new Date('2024-07-01')
        }
      ];

      for (const shootData of testShoots) {
        await shootService.createShoot(shootData);
      }
    });

    it('should return all shoots with default pagination', async () => {
      const result = await shootService.listShoots({ page: 1, limit: 10 });

      expect(result.shoots).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.shoots[0].title).toBe('Wedding 2'); // Most recent first
    });

    it('should filter by photographerId', async () => {
      const result = await shootService.listShoots({ page: 1, limit: 10, photographerId: 'photographer_1' });

      expect(result.shoots).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.shoots.every(shoot => shoot.photographerId === 'photographer_1')).toBe(true);
    });

    it('should filter by clientEmail', async () => {
      const result = await shootService.listShoots({ page: 1, limit: 10, clientEmail: 'wedding1@example.com' });

      expect(result.shoots).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.shoots[0].clientEmail).toBe('wedding1@example.com');
    });

    it('should filter by status', async () => {
      // Update one shoot to completed status
      const allShoots = await shootService.listShoots({ page: 1, limit: 10 });
      await shootService.updateShoot(allShoots.shoots[0].id, { status: 'completed' });

      const result = await shootService.listShoots({ page: 1, limit: 10, status: 'completed' });

      expect(result.shoots).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.shoots[0].status).toBe('completed');
    });

    it('should filter by date range', async () => {
      const result = await shootService.listShoots({
        page: 1,
        limit: 10,
        fromDate: new Date('2024-06-01'),
        toDate: new Date('2024-06-30')
      });

      expect(result.shoots).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle pagination', async () => {
      const result = await shootService.listShoots({ page: 1, limit: 2 });

      expect(result.shoots).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should throw ZodError for invalid query parameters', async () => {
      const invalidQuery = { page: 0 }; // Page must be >= 1

      await expect(shootService.listShoots(invalidQuery as any)).rejects.toThrow(ZodError);
    });
  });

  describe('deleteShoot', () => {
    it('should delete an existing shoot', async () => {
      const shootData: CreateShootRequest = {
        title: 'To Be Deleted',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const createdShoot = await shootService.createShoot(shootData);
      const deleted = await shootService.deleteShoot(createdShoot.id);

      expect(deleted).toBe(true);

      const foundShoot = await shootService.getShoot(createdShoot.id);
      expect(foundShoot).toBeNull();
    });

    it('should return false for non-existent shoot', async () => {
      const deleted = await shootService.deleteShoot('shoot_nonexistent123456789012345678901234');
      expect(deleted).toBe(false);
    });
  });
});