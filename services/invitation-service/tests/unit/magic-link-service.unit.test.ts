import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MagicLinkService } from '../../src/features/magic-links/services/magic-link.service';
import { 
  MagicLinkGenerationRequest,
  MagicLinkValidationRequest 
} from '@tempsdarret/shared/schemas/invite.schema';
import { 
  createMockMagicLink,
  createMockMagicLinkRepository,
  createMockUserService,
  createMockJWTService,
  createMockEventPublisher 
} from '../setup';

describe('MagicLinkService Unit Tests (ADR-003)', () => {
  let magicLinkService: MagicLinkService;
  let mockMagicLinkRepository: any;
  let mockUserService: any;
  let mockJWTService: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    mockMagicLinkRepository = createMockMagicLinkRepository();
    mockUserService = createMockUserService();
    mockJWTService = createMockJWTService();
    mockEventPublisher = createMockEventPublisher();

    magicLinkService = new MagicLinkService(
      mockMagicLinkRepository,
      mockUserService,
      mockJWTService,
      mockEventPublisher
    );
  });

  describe('generateMagicLink', () => {
    it('should generate 64-character hex token with 15-minute expiry (ADR-003)', async () => {
      const request: MagicLinkGenerationRequest = {
        email: 'client@example.com',
        shootId: 'shoot_123'
      };

      const mockMagicLink = createMockMagicLink();
      mockMagicLinkRepository.getRecentTokensCount.mockResolvedValue(0);
      mockMagicLinkRepository.create.mockResolvedValue(mockMagicLink);

      const result = await magicLinkService.generateMagicLink(request);

      // Verify 64-character hex token (ADR-003)
      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      
      // Verify 15-minute expiry (ADR-003)
      const expiryTime = new Date(result.expiresAt).getTime();
      const currentTime = Date.now();
      const expectedExpiry = currentTime + (15 * 60 * 1000);
      expect(expiryTime).toBeGreaterThan(currentTime);
      expect(expiryTime).toBeLessThanOrEqual(expectedExpiry + 1000);

      // Verify repository called with hashed token, not raw
      expect(mockMagicLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.not.stringMatching(result.token), // Should be hashed
          clientEmail: 'client@example.com',
          shootId: 'shoot_123'
        })
      );
    });

    it('should enforce rate limiting (ADR-003)', async () => {
      const request: MagicLinkGenerationRequest = {
        email: 'ratelimited@example.com',
        shootId: 'shoot_123'
      };

      mockMagicLinkRepository.getRecentTokensCount.mockResolvedValue(3);

      await expect(magicLinkService.generateMagicLink(request))
        .rejects.toThrow('Rate limit exceeded');

      expect(mockMagicLinkRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateMagicLink', () => {
    it('should validate magic link and issue JWT (ADR-003)', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
        shootId: 'shoot_123'
      };

      const mockMagicLink = createMockMagicLink({
        shootId: 'shoot_123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        isActive: true,
        accessCount: 0
      });

      const mockUser = {
        id: 'user_123',
        email: 'client@example.com',
        role: 'client',
        isActive: true
      };

      const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      mockMagicLinkRepository.findByToken.mockResolvedValue(mockMagicLink);
      mockUserService.findUserByEmail.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue(mockJWT);
      mockMagicLinkRepository.markAsUsed.mockResolvedValue(true);

      const result = await magicLinkService.validateMagicLink(request);

      // Verify JWT payload (ADR-003)
      expect(mockJWTService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          email: 'client@example.com',
          role: 'client',
          shootId: 'shoot_123'
        }),
        { expiresIn: '15m' }
      );

      // Verify response format
      expect(result).toEqual({
        accessToken: mockJWT,
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: 'user_123',
          email: 'client@example.com',
          role: 'client',
          shootId: 'shoot_123'
        }
      });

      // Verify single-use enforcement (ADR-003)
      expect(mockMagicLinkRepository.markAsUsed).toHaveBeenCalled();

      // Verify authentication event published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          eventType: 'user.authenticated',
          method: 'magic_link'
        }),
        'user_123'
      );
    });

    it('should reject invalid token', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'invalid_token'
      };

      mockMagicLinkRepository.findByToken.mockResolvedValue(null);

      await expect(magicLinkService.validateMagicLink(request))
        .rejects.toThrow('Invalid magic link token');
    });

    it('should reject expired tokens (ADR-003)', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'expired_token'
      };

      const expiredMagicLink = createMockMagicLink({
        expiresAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      });

      mockMagicLinkRepository.findByToken.mockResolvedValue(expiredMagicLink);

      await expect(magicLinkService.validateMagicLink(request))
        .rejects.toThrow('Magic link has expired');

      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });

    it('should reject already used tokens (ADR-003: single-use)', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'used_token'
      };

      const usedMagicLink = createMockMagicLink({
        isActive: false,
        accessCount: 1
      });

      mockMagicLinkRepository.findByToken.mockResolvedValue(usedMagicLink);

      await expect(magicLinkService.validateMagicLink(request))
        .rejects.toThrow('Magic link has already been used');

      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });

    it('should validate shoot ID when provided', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'valid_token',
        shootId: 'wrong_shoot'
      };

      const magicLink = createMockMagicLink({
        shootId: 'correct_shoot',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: true
      });

      mockMagicLinkRepository.findByToken.mockResolvedValue(magicLink);

      await expect(magicLinkService.validateMagicLink(request))
        .rejects.toThrow('Invalid shoot ID for this magic link');
    });

    it('should reject inactive users', async () => {
      const request: MagicLinkValidationRequest = {
        token: 'valid_token'
      };

      const magicLink = createMockMagicLink({
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: true
      });

      const inactiveUser = {
        id: 'user_123',
        email: 'client@example.com',
        role: 'client',
        isActive: false
      };

      mockMagicLinkRepository.findByToken.mockResolvedValue(magicLink);
      mockUserService.findUserByEmail.mockResolvedValue(inactiveUser);

      await expect(magicLinkService.validateMagicLink(request))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('recordAccess', () => {
    it('should update access count and timestamp', async () => {
      const token = 'access_token';
      const magicLink = createMockMagicLink({ accessCount: 0 });

      mockMagicLinkRepository.findByToken.mockResolvedValue(magicLink);
      mockMagicLinkRepository.update.mockResolvedValue({ accessCount: 1 });

      const result = await magicLinkService.recordAccess(token);

      expect(result).toEqual({ accessCount: 1 });
      expect(mockMagicLinkRepository.update).toHaveBeenCalledWith(
        expect.any(String), // hashed token
        expect.objectContaining({
          accessCount: 1,
          lastAccessedAt: expect.any(Date)
        })
      );
    });

    it('should throw error for non-existent token', async () => {
      mockMagicLinkRepository.findByToken.mockResolvedValue(null);

      await expect(magicLinkService.recordAccess('missing_token'))
        .rejects.toThrow('Magic link not found');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens', async () => {
      mockMagicLinkRepository.cleanup.mockResolvedValue(5);

      const result = await magicLinkService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockMagicLinkRepository.cleanup).toHaveBeenCalled();
    });
  });
});