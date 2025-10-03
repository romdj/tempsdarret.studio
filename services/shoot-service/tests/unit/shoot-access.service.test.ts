import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShootAccessService } from '../../src/services/shoot-access.service.js';
import { ShootRepository } from '../../src/persistence/shoot.repository.js';

describe('ShootAccessService', () => {
  let service: ShootAccessService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findByReference: vi.fn(),
      updateById: vi.fn()
    };

    service = new ShootAccessService(mockRepository);
  });

  describe('validateShootAccess', () => {
    it('should allow access to valid shoot with client access enabled', async () => {
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: true,
          expiresAt: null
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);
      mockRepository.updateById.mockResolvedValue(true);

      const result = await service.validateShootAccess('wedding-2024-smith-june');

      expect(result.allowed).toBe(true);
      expect(result.shootId).toBe('shoot-123');
      expect(result.reason).toBeUndefined();
      expect(mockRepository.updateById).toHaveBeenCalledWith(
        'shoot-123',
        expect.objectContaining({
          'status.lastClientAccess': expect.any(Date)
        })
      );
    });

    it('should deny access if shoot not found', async () => {
      mockRepository.findByReference.mockResolvedValue(null);

      const result = await service.validateShootAccess('non-existent-ref');

      expect(result.allowed).toBe(false);
      expect(result.shootId).toBeUndefined();
      expect(result.reason).toBe('Shoot not found');
    });

    it('should deny access if client access is disabled', async () => {
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: false
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);

      const result = await service.validateShootAccess('wedding-2024-smith-june');

      expect(result.allowed).toBe(false);
      expect(result.shootId).toBe('shoot-123');
      expect(result.reason).toBe('Client access not enabled for this shoot');
      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });

    it('should deny access if shoot has expired', async () => {
      const pastDate = new Date('2023-01-01');
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: true,
          expiresAt: pastDate
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);

      const result = await service.validateShootAccess('wedding-2024-smith-june');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Access has expired');
    });

    it('should allow access if expiry is in future', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: true,
          expiresAt: futureDate
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);
      mockRepository.updateById.mockResolvedValue(true);

      const result = await service.validateShootAccess('wedding-2024-smith-june');

      expect(result.allowed).toBe(true);
      expect(result.shootId).toBe('shoot-123');
    });

    it('should handle token-based access', async () => {
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: true,
          expiresAt: null
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);
      mockRepository.updateById.mockResolvedValue(true);

      const result = await service.validateShootAccess(
        'wedding-2024-smith-june',
        'magic-link-token-abc'
      );

      expect(result.allowed).toBe(true);
      expect(result.shootId).toBe('shoot-123');
    });

    it('should log access timestamp when access is granted', async () => {
      const mockShoot = {
        id: 'shoot-123',
        reference: 'wedding-2024-smith-june',
        access: {
          allowClientAccess: true
        }
      };

      mockRepository.findByReference.mockResolvedValue(mockShoot);
      mockRepository.updateById.mockResolvedValue(true);

      const beforeTime = Date.now();
      await service.validateShootAccess('wedding-2024-smith-june');
      const afterTime = Date.now();

      const updateCall = mockRepository.updateById.mock.calls[0];
      const accessTime = updateCall[1]['status.lastClientAccess'].getTime();

      expect(accessTime).toBeGreaterThanOrEqual(beforeTime);
      expect(accessTime).toBeLessThanOrEqual(afterTime);
    });
  });
});
