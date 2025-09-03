import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShootService } from '../../src/services/shoot.service';
import { ShootRepository } from '../../src/persistence/shoot.repository';
import { ShootCreatedPublisher } from '../../src/events/publishers/shoot-created.publisher';
import { CreateShootRequest, ShootStatus } from '@tempsdarret/shared/schemas/shoot.schema';
import { ZodError } from 'zod';

// Mock dependencies
const mockShootRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn()
};

const mockShootCreatedPublisher = {
  publish: vi.fn()
};

describe('ShootService', () => {
  let shootService: ShootService;

  beforeEach(() => {
    shootService = new ShootService(
      mockShootRepository as any,
      mockShootCreatedPublisher as any
    );
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

      const mockSavedShoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        ...shootData,
        status: 'planned',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 'shoot_1234567890abcdef1234567890abcdef',
          ...shootData,
          status: 'planned',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      };

      mockShootRepository.create.mockResolvedValue(mockSavedShoot);

      const createdShoot = await shootService.createShoot(shootData);

      expect(mockShootRepository.create).toHaveBeenCalledWith(shootData);
      expect(mockShootCreatedPublisher.publish).toHaveBeenCalledWith(mockSavedShoot);
      expect(createdShoot).toMatchObject({
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        location: 'Central Park',
        status: 'planned'
      });
    });

    it('should throw ZodError for invalid email', async () => {
      const shootData = {
        title: 'Test Shoot',
        clientEmail: 'invalid-email',
        photographerId: 'photographer_123'
      } as CreateShootRequest;

      await expect(shootService.createShoot(shootData)).rejects.toThrow(ZodError);
    });
  });

  describe('getShoot', () => {
    it('should return a shoot by ID', async () => {
      const mockShoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'planned',
        toJSON: () => ({
          id: 'shoot_1234567890abcdef1234567890abcdef',
          title: 'Test Shoot',
          clientEmail: 'client@example.com',
          photographerId: 'photographer_123',
          status: 'planned'
        })
      };

      mockShootRepository.findById.mockResolvedValue(mockShoot);

      const foundShoot = await shootService.getShoot('shoot_1234567890abcdef1234567890abcdef');

      expect(mockShootRepository.findById).toHaveBeenCalledWith('shoot_1234567890abcdef1234567890abcdef');
      expect(foundShoot).toMatchObject({
        id: 'shoot_1234567890abcdef1234567890abcdef',
        title: 'Test Shoot'
      });
    });

    it('should return null for non-existent shoot', async () => {
      mockShootRepository.findById.mockResolvedValue(null);

      const foundShoot = await shootService.getShoot('shoot_nonexistent123456789012345678901234');
      expect(foundShoot).toBeNull();
    });
  });

  describe('updateShoot', () => {
    it('should update a shoot with valid data', async () => {
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress' as ShootStatus,
        location: 'New Location'
      };

      const mockUpdatedShoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        ...updateData,
        toJSON: () => ({
          id: 'shoot_1234567890abcdef1234567890abcdef',
          ...updateData
        })
      };

      mockShootRepository.updateById.mockResolvedValue(mockUpdatedShoot);

      const updatedShoot = await shootService.updateShoot('shoot_1234567890abcdef1234567890abcdef', updateData);

      expect(mockShootRepository.updateById).toHaveBeenCalledWith('shoot_1234567890abcdef1234567890abcdef', updateData);
      expect(updatedShoot).toMatchObject({
        title: 'Updated Title',
        status: 'in_progress',
        location: 'New Location'
      });
    });
  });

  describe('listShoots', () => {
    it('should return paginated shoots', async () => {
      const query = { page: 1, limit: 10 };
      const mockShoots = [
        {
          id: 'shoot_1',
          title: 'Shoot 1',
          toJSON: () => ({ id: 'shoot_1', title: 'Shoot 1' })
        }
      ];

      mockShootRepository.findMany.mockResolvedValue({
        shoots: mockShoots,
        total: 1
      });

      const result = await shootService.listShoots(query);

      expect(mockShootRepository.findMany).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        shoots: [{ id: 'shoot_1', title: 'Shoot 1' }],
        total: 1
      });
    });
  });

  describe('deleteShoot', () => {
    it('should delete a shoot successfully', async () => {
      mockShootRepository.deleteById.mockResolvedValue(true);

      const deleted = await shootService.deleteShoot('shoot_1234567890abcdef1234567890abcdef');

      expect(mockShootRepository.deleteById).toHaveBeenCalledWith('shoot_1234567890abcdef1234567890abcdef');
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent shoot', async () => {
      mockShootRepository.deleteById.mockResolvedValue(false);

      const deleted = await shootService.deleteShoot('shoot_nonexistent123456789012345678901234');
      expect(deleted).toBe(false);
    });
  });
});