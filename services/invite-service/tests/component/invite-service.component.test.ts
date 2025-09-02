import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InviteService } from '../../src/features/invitations/services/invite.service';
import { MagicLinkService } from '../../src/features/magic-links/services/magic-link.service';
import { 
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery,
  MagicLinkValidationRequest,
  Invitation,
  MagicLink
} from '@tempsdarret/shared/schemas/invite.schema';
import { 
  createMockInvitation,
  createMockMagicLink,
  createMockEventPublisher,
  createMockInvitationRepository,
  createMockMagicLinkRepository,
  createMockEmailService,
  createMockUserService,
  createMockJWTService
} from '../setup';

describe('Invite Service Component Tests (TDD - ADR-003)', () => {
  let inviteService: InviteService;
  let magicLinkService: MagicLinkService;
  let mockEventPublisher: any;
  let mockInvitationRepository: any;
  let mockMagicLinkRepository: any;
  let mockEmailService: any;
  let mockUserService: any;
  let mockJWTService: any;

  beforeEach(() => {
    mockEventPublisher = createMockEventPublisher();
    mockInvitationRepository = createMockInvitationRepository();
    mockMagicLinkRepository = createMockMagicLinkRepository();
    mockEmailService = createMockEmailService();
    mockUserService = createMockUserService();
    mockJWTService = createMockJWTService();
    
    inviteService = new InviteService(
      mockInvitationRepository,
      mockMagicLinkRepository,
      mockEventPublisher,
      mockEmailService
    );
    
    magicLinkService = new MagicLinkService(
      mockMagicLinkRepository,
      mockUserService,
      mockJWTService,
      mockEventPublisher
    );
  });

  describe('Event-Driven Invitation Creation (Sequence Diagram Flow)', () => {
    it('should handle user.created event and generate invitation (sequence diagram)', async () => {
      const userCreatedEvent = {
        eventType: 'user.created',
        userId: 'user_123',
        email: 'newclient@example.com',
        role: 'client',
        shootId: 'shoot_123',
        timestamp: new Date().toISOString()
      };

      const expectedInvitation = createMockInvitation({
        id: 'invitation_new',
        shootId: 'shoot_123',
        clientEmail: 'newclient@example.com',
        status: 'pending'
      });

      const expectedMagicLink = createMockMagicLink({
        shootId: 'shoot_123',
        clientEmail: 'newclient@example.com'
      });

      mockInvitationRepository.create.mockResolvedValue(expectedInvitation);
      mockMagicLinkRepository.create.mockResolvedValue(expectedMagicLink);

      const result = await inviteService.handleUserCreatedEvent(userCreatedEvent);

      expect(result).toEqual(expectedInvitation);
      
      // Verify invitation creation
      expect(mockInvitationRepository.create).toHaveBeenCalledWith({
        shootId: 'shoot_123',
        clientEmail: 'newclient@example.com',
        status: 'pending'
      });

      // Verify magic link creation (ADR-003: 64-char hex, 15min expiry)
      expect(mockMagicLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shootId: 'shoot_123',
          clientEmail: 'newclient@example.com',
          expiresAt: expect.any(Date),
          isActive: true
        })
      );

      // Verify invite.created event published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.created',
          inviteId: 'invitation_new',
          email: 'newclient@example.com',
          shootId: 'shoot_123',
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(String)
        }),
        'invitation_new'
      );
    });

    it('should handle user.verified event and reactivate existing invitation', async () => {
      const userVerifiedEvent = {
        eventType: 'user.verified',
        userId: 'user_existing',
        email: 'existing@example.com',
        shootId: 'shoot_456',
        timestamp: new Date().toISOString()
      };

      const existingInvitation = createMockInvitation({
        id: 'invitation_existing',
        shootId: 'shoot_456',
        clientEmail: 'existing@example.com',
        status: 'expired'
      });

      const reactivatedInvitation = createMockInvitation({
        ...existingInvitation,
        status: 'pending',
        updatedAt: new Date()
      });

      mockInvitationRepository.findByShootId.mockResolvedValue([existingInvitation]);
      mockInvitationRepository.update.mockResolvedValue(reactivatedInvitation);

      const result = await inviteService.handleUserVerifiedEvent(userVerifiedEvent);

      expect(result).toEqual(reactivatedInvitation);
      
      // Verify invitation reactivation
      expect(mockInvitationRepository.update).toHaveBeenCalledWith(
        'invitation_existing',
        { status: 'pending' }
      );

      // Verify invite.reactivated event
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.reactivated',
          inviteId: 'invitation_existing',
          shootId: 'shoot_456'
        }),
        'invitation_existing'
      );
    });
  });

  describe('Magic Link Authentication (ADR-003 Implementation)', () => {
    it('should generate 64-character hex magic link with 15-minute expiry', async () => {
      const request = {
        email: 'client@example.com',
        shootId: 'shoot_123'
      };

      const mockMagicLink = createMockMagicLink();
      mockMagicLinkRepository.create.mockResolvedValue(mockMagicLink);
      mockMagicLinkRepository.getRecentTokensCount.mockResolvedValue(0); // Rate limit check

      const result = await magicLinkService.generateMagicLink(request);

      expect(result.token).toMatch(/^[a-f0-9]{64}$/); // ADR-003: 64-char hex
      
      // Verify 15-minute expiry (ADR-003)
      const expiryTime = new Date(result.expiresAt).getTime();
      const currentTime = Date.now();
      const expectedExpiry = currentTime + (15 * 60 * 1000); // 15 minutes
      expect(expiryTime).toBeGreaterThan(currentTime);
      expect(expiryTime).toBeLessThanOrEqual(expectedExpiry + 1000); // Allow 1s tolerance

      // Verify token is stored hashed (ADR-003 security)
      expect(mockMagicLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.not.stringMatching(result.token), // Should be hashed, not raw
          clientEmail: 'client@example.com',
          shootId: 'shoot_123'
        })
      );
    });

    it('should validate magic link and issue 15-minute JWT (ADR-003)', async () => {
      const validationRequest: MagicLinkValidationRequest = {
        token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
        shootId: 'shoot_123'
      };

      const mockMagicLink = createMockMagicLink({
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        isActive: true
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

      const result = await magicLinkService.validateMagicLink(validationRequest);

      // Verify JWT token issued (ADR-003: 15 minutes)
      expect(mockJWTService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          email: 'client@example.com',
          role: 'client',
          shootId: 'shoot_123',
          exp: expect.any(Number)
        }),
        expect.objectContaining({
          expiresIn: '15m' // ADR-003: 15 minutes
        })
      );

      expect(result).toMatchObject({
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

      // Verify token marked as used (ADR-003: single-use)
      expect(mockMagicLinkRepository.markAsUsed).toHaveBeenCalledWith(mockMagicLink.token);

      // Verify authentication event published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          eventType: 'user.authenticated',
          userId: 'user_123',
          method: 'magic_link',
          shootId: 'shoot_123'
        }),
        'user_123'
      );
    });

    it('should enforce rate limiting (ADR-003: max 3 requests per minute)', async () => {
      const request = {
        email: 'ratelimited@example.com',
        shootId: 'shoot_123'
      };

      // Simulate rate limit exceeded
      mockMagicLinkRepository.getRecentTokensCount.mockResolvedValue(3);

      await expect(magicLinkService.generateMagicLink(request))
        .rejects.toThrow('Rate limit exceeded');

      expect(mockMagicLinkRepository.create).not.toHaveBeenCalled();
    });

    it('should reject expired magic links (ADR-003)', async () => {
      const expiredRequest: MagicLinkValidationRequest = {
        token: 'expired123456789012345678901234567890123456789012345678901234567890',
        shootId: 'shoot_123'
      };

      const expiredMagicLink = createMockMagicLink({
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isActive: true
      });

      mockMagicLinkRepository.findByToken.mockResolvedValue(expiredMagicLink);

      await expect(magicLinkService.validateMagicLink(expiredRequest))
        .rejects.toThrow('Magic link has expired');

      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });

    it('should reject already used magic links (ADR-003: single-use)', async () => {
      const usedRequest: MagicLinkValidationRequest = {
        token: 'used1234567890123456789012345678901234567890123456789012345678901234',
        shootId: 'shoot_123'
      };

      const usedMagicLink = createMockMagicLink({
        isActive: false, // Already used
        accessCount: 1
      });

      mockMagicLinkRepository.findByToken.mockResolvedValue(usedMagicLink);

      await expect(magicLinkService.validateMagicLink(usedRequest))
        .rejects.toThrow('Magic link has already been used');

      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });
  });

  describe('Invitation CRUD Operations (TypeSpec InvitationOperations)', () => {
    it('should create invitation with valid CreateInvitationRequest', async () => {
      const createRequest: CreateInvitationRequest = {
        shootId: 'shoot_123',
        clientEmail: 'client@example.com',
        message: 'Welcome to your photo gallery!'
      };

      const expectedInvitation = createMockInvitation({
        shootId: 'shoot_123',
        clientEmail: 'client@example.com',
        message: 'Welcome to your photo gallery!'
      });

      mockInvitationRepository.create.mockResolvedValue(expectedInvitation);

      const result = await inviteService.createInvitation(createRequest);

      expect(result).toEqual(expectedInvitation);
      expect(mockInvitationRepository.create).toHaveBeenCalledWith(createRequest);
    });

    it('should list invitations with filtering and pagination', async () => {
      const query: InvitationQuery = {
        shootId: 'shoot_123',
        status: 'sent',
        page: 1,
        limit: 10
      };

      const mockInvitations = [
        createMockInvitation({ status: 'sent' }),
        createMockInvitation({ status: 'sent', id: 'invitation_456' })
      ];

      mockInvitationRepository.list.mockResolvedValue(mockInvitations);
      mockInvitationRepository.count.mockResolvedValue(2);

      const result = await inviteService.listInvitations(query);

      expect(result).toEqual({
        invitations: mockInvitations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should send invitation email and update status', async () => {
      const invitationId = 'invitation_123';
      const sendRequest: SendInvitationRequest = {
        subject: 'Your photos are ready!',
        templateVars: { photographerName: 'John Doe' }
      };

      const invitation = createMockInvitation();
      const sentInvitation = createMockInvitation({
        status: 'sent',
        sentAt: new Date()
      });

      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockEmailService.sendInvitation.mockResolvedValue(true);
      mockInvitationRepository.update.mockResolvedValue(sentInvitation);

      const result = await inviteService.sendInvitation(invitationId, sendRequest);

      expect(result).toEqual({ sent: true });
      
      // Verify email sent
      expect(mockEmailService.sendInvitation).toHaveBeenCalledWith(
        invitation,
        sendRequest
      );
      
      // Verify status updated
      expect(mockInvitationRepository.update).toHaveBeenCalledWith(
        invitationId,
        { status: 'sent', sentAt: expect.any(Date) }
      );

      // Verify event published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.sent',
          inviteId: invitationId
        }),
        invitationId
      );
    });

    it('should revoke invitation and invalidate magic link', async () => {
      const invitationId = 'invitation_123';
      const invitation = createMockInvitation({ status: 'sent' });
      const revokedInvitation = createMockInvitation({
        status: 'revoked',
        updatedAt: new Date()
      });

      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockInvitationRepository.update.mockResolvedValue(revokedInvitation);
      mockMagicLinkRepository.markAsUsed.mockResolvedValue(true);

      const result = await inviteService.revokeInvitation(invitationId);

      expect(result).toEqual(revokedInvitation);
      
      // Verify magic link invalidated
      expect(mockMagicLinkRepository.markAsUsed).toHaveBeenCalledWith(
        invitation.magicLinkToken
      );
      
      // Verify revocation event
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.revoked',
          inviteId: invitationId
        }),
        invitationId
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid email format in event processing', async () => {
      const invalidEvent = {
        eventType: 'user.created',
        userId: 'user_123',
        email: 'invalid-email',
        role: 'client',
        shootId: 'shoot_123'
      };

      await expect(inviteService.handleUserCreatedEvent(invalidEvent))
        .rejects.toThrow('Invalid email format');
    });

    it('should handle concurrent invitation creation for same shoot/email', async () => {
      const events = [
        {
          eventType: 'user.created',
          userId: 'user_1',
          email: 'concurrent@example.com',
          role: 'client',
          shootId: 'shoot_concurrent'
        },
        {
          eventType: 'user.verified',
          userId: 'user_1',
          email: 'concurrent@example.com',
          shootId: 'shoot_concurrent'
        }
      ];

      const invitation = createMockInvitation({
        shootId: 'shoot_concurrent',
        clientEmail: 'concurrent@example.com'
      });

      mockInvitationRepository.create.mockResolvedValue(invitation);
      mockInvitationRepository.findByShootId.mockResolvedValue([invitation]);

      const promises = [
        inviteService.handleUserCreatedEvent(events[0]),
        inviteService.handleUserVerifiedEvent(events[1])
      ];

      const results = await Promise.all(promises);
      
      // Should handle both events without conflict
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });

    it('should cleanup expired magic links automatically', async () => {
      mockMagicLinkRepository.cleanup.mockResolvedValue(5);

      const result = await magicLinkService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockMagicLinkRepository.cleanup).toHaveBeenCalled();
    });

    it('should handle email delivery failures gracefully', async () => {
      const invitationId = 'invitation_123';
      const sendRequest: SendInvitationRequest = {
        subject: 'Test invitation'
      };

      const invitation = createMockInvitation();
      
      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockEmailService.sendInvitation.mockResolvedValue(false); // Email failed

      const result = await inviteService.sendInvitation(invitationId, sendRequest);

      expect(result).toEqual({ sent: false });
      
      // Should not update invitation status on email failure
      expect(mockInvitationRepository.update).not.toHaveBeenCalled();
    });
  });
});