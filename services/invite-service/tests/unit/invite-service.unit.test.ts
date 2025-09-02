import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InviteService } from '../../src/features/invitations/services/invite.service';
import { 
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery 
} from '@tempsdarret/shared/schemas/invite.schema';
import { 
  createMockInvitation,
  createMockEventPublisher,
  createMockInvitationRepository,
  createMockMagicLinkRepository,
  createMockEmailService 
} from '../setup';

describe('InviteService Unit Tests', () => {
  let inviteService: InviteService;
  let mockInvitationRepository: any;
  let mockMagicLinkRepository: any;
  let mockEventPublisher: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockInvitationRepository = createMockInvitationRepository();
    mockMagicLinkRepository = createMockMagicLinkRepository();
    mockEventPublisher = createMockEventPublisher();
    mockEmailService = createMockEmailService();

    inviteService = new InviteService(
      mockInvitationRepository,
      mockMagicLinkRepository,
      mockEventPublisher,
      mockEmailService
    );
  });

  describe('createInvitation', () => {
    it('should create invitation with valid data', async () => {
      const request: CreateInvitationRequest = {
        shootId: 'shoot_123',
        clientEmail: 'client@example.com',
        message: 'Welcome!'
      };

      const expectedInvitation = createMockInvitation(request);
      mockInvitationRepository.create.mockResolvedValue(expectedInvitation);

      const result = await inviteService.createInvitation(request);

      expect(result).toEqual(expectedInvitation);
      expect(mockInvitationRepository.create).toHaveBeenCalledWith(request);
    });
  });

  describe('listInvitations', () => {
    it('should return paginated invitation list', async () => {
      const query: InvitationQuery = {
        shootId: 'shoot_123',
        page: 1,
        limit: 10
      };

      const mockInvitations = [createMockInvitation(), createMockInvitation()];
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

    it('should calculate total pages correctly', async () => {
      const query: InvitationQuery = { page: 1, limit: 3 };
      
      mockInvitationRepository.list.mockResolvedValue([]);
      mockInvitationRepository.count.mockResolvedValue(10);

      const result = await inviteService.listInvitations(query);

      expect(result.totalPages).toBe(4); // Math.ceil(10 / 3)
    });
  });

  describe('sendInvitation', () => {
    it('should send email and update status on success', async () => {
      const invitationId = 'invitation_123';
      const request: SendInvitationRequest = { subject: 'Test' };
      const invitation = createMockInvitation();
      const updatedInvitation = createMockInvitation({ status: 'sent' });

      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockEmailService.sendInvitation.mockResolvedValue(true);
      mockInvitationRepository.update.mockResolvedValue(updatedInvitation);

      const result = await inviteService.sendInvitation(invitationId, request);

      expect(result).toEqual({ sent: true });
      expect(mockEmailService.sendInvitation).toHaveBeenCalledWith(invitation, request);
      expect(mockInvitationRepository.update).toHaveBeenCalledWith(
        invitationId,
        expect.objectContaining({ status: 'sent' })
      );
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should not update status when email fails', async () => {
      const invitationId = 'invitation_123';
      const invitation = createMockInvitation();

      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockEmailService.sendInvitation.mockResolvedValue(false);

      const result = await inviteService.sendInvitation(invitationId, {});

      expect(result).toEqual({ sent: false });
      expect(mockInvitationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when invitation not found', async () => {
      mockInvitationRepository.findById.mockResolvedValue(null);

      await expect(inviteService.sendInvitation('missing_id', {}))
        .rejects.toThrow('Invitation not found');
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation and invalidate magic link', async () => {
      const invitationId = 'invitation_123';
      const invitation = createMockInvitation();
      const revokedInvitation = createMockInvitation({ status: 'revoked' });

      mockInvitationRepository.findById.mockResolvedValue(invitation);
      mockInvitationRepository.update.mockResolvedValue(revokedInvitation);
      mockMagicLinkRepository.markAsUsed.mockResolvedValue(true);

      const result = await inviteService.revokeInvitation(invitationId);

      expect(result).toEqual(revokedInvitation);
      expect(mockMagicLinkRepository.markAsUsed).toHaveBeenCalledWith(
        invitation.magicLinkToken
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({ eventType: 'invite.revoked' }),
        invitationId
      );
    });

    it('should throw error when invitation not found', async () => {
      mockInvitationRepository.findById.mockResolvedValue(null);

      await expect(inviteService.revokeInvitation('missing_id'))
        .rejects.toThrow('Invitation not found');
    });
  });

  describe('Event Handlers', () => {
    describe('handleUserCreatedEvent', () => {
      it('should validate email format', async () => {
        const invalidEvent = {
          eventType: 'user.created',
          email: 'invalid-email',
          shootId: 'shoot_123'
        };

        await expect(inviteService.handleUserCreatedEvent(invalidEvent))
          .rejects.toThrow('Invalid email format');
      });

      it('should create invitation and publish event', async () => {
        const event = {
          eventType: 'user.created',
          email: 'client@example.com',
          shootId: 'shoot_123'
        };

        const invitation = createMockInvitation();
        const magicLink = { token: 'token123', expiresAt: new Date() };

        mockInvitationRepository.create.mockResolvedValue(invitation);
        mockMagicLinkRepository.create.mockResolvedValue(magicLink);

        const result = await inviteService.handleUserCreatedEvent(event);

        expect(result).toEqual(invitation);
        expect(mockInvitationRepository.create).toHaveBeenCalledWith({
          shootId: 'shoot_123',
          clientEmail: 'client@example.com',
          status: 'pending'
        });
        expect(mockEventPublisher.publish).toHaveBeenCalled();
      });
    });

    describe('handleUserVerifiedEvent', () => {
      it('should reactivate existing invitation', async () => {
        const event = {
          eventType: 'user.verified',
          email: 'existing@example.com',
          shootId: 'shoot_456'
        };

        const existingInvitation = createMockInvitation({ 
          clientEmail: 'existing@example.com',
          status: 'expired' 
        });
        const reactivatedInvitation = createMockInvitation({ status: 'pending' });

        mockInvitationRepository.findByShootId.mockResolvedValue([existingInvitation]);
        mockInvitationRepository.update.mockResolvedValue(reactivatedInvitation);

        const result = await inviteService.handleUserVerifiedEvent(event);

        expect(result).toEqual(reactivatedInvitation);
        expect(mockInvitationRepository.update).toHaveBeenCalledWith(
          existingInvitation.id,
          { status: 'pending' }
        );
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'invites',
          expect.objectContaining({ eventType: 'invite.reactivated' }),
          existingInvitation.id
        );
      });

      it('should create new invitation if none exists', async () => {
        const event = {
          eventType: 'user.verified',
          email: 'new@example.com',
          shootId: 'shoot_456'
        };

        const invitation = createMockInvitation();
        const magicLink = { token: 'token123', expiresAt: new Date() };

        mockInvitationRepository.findByShootId.mockResolvedValue([]);
        mockInvitationRepository.create.mockResolvedValue(invitation);
        mockMagicLinkRepository.create.mockResolvedValue(magicLink);

        const result = await inviteService.handleUserVerifiedEvent(event);

        expect(result).toEqual(invitation);
        expect(mockInvitationRepository.create).toHaveBeenCalled();
      });
    });
  });
});