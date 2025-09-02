import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InviteService } from '../../src/features/invitations/services/invite.service';
import { MagicLinkService } from '../../src/features/magic-links/services/magic-link.service';
import { 
  CreateInvitationRequest,
  MagicLinkGenerationRequest,
  MagicLinkValidationRequest
} from '@tempsdarret/shared/schemas/invite.schema';

// Mock event publisher for integration tests
const mockEventPublisher = {
  publish: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockEmailService = {
  sendInvitation: vi.fn(),
  sendMagicLink: vi.fn()
};

const mockUserService = {
  findUserByEmail: vi.fn(),
  getUser: vi.fn()
};

const mockJWTService = {
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn()
};

describe('Invite Service Integration Tests', () => {
  let inviteService: InviteService;
  let magicLinkService: MagicLinkService;
  let mockInvitationRepository: any;
  let mockMagicLinkRepository: any;

  beforeEach(() => {
    // Create in-memory repositories for integration testing
    mockInvitationRepository = createInMemoryInvitationRepository();
    mockMagicLinkRepository = createInMemoryMagicLinkRepository();
    
    inviteService = new InviteService(
      mockInvitationRepository,
      mockMagicLinkRepository,
      mockEventPublisher as any,
      mockEmailService
    );
    
    magicLinkService = new MagicLinkService(
      mockMagicLinkRepository,
      mockUserService,
      mockJWTService,
      mockEventPublisher as any
    );

    vi.clearAllMocks();
  });

  describe('End-to-End Magic Link Authentication Flow (ADR-003)', () => {
    it('should handle complete magic link authentication workflow', async () => {
      // Step 1: User created event triggers invitation creation
      const userCreatedEvent = {
        eventType: 'user.created',
        userId: 'user_integration',
        email: 'integration@example.com',
        role: 'client',
        shootId: 'shoot_integration',
        timestamp: new Date().toISOString()
      };

      const createdInvitation = await inviteService.handleUserCreatedEvent(userCreatedEvent);
      
      expect(createdInvitation).toMatchObject({
        clientEmail: 'integration@example.com',
        shootId: 'shoot_integration',
        status: 'pending'
      });

      // Step 2: Generate magic link for authentication
      const magicLinkRequest: MagicLinkGenerationRequest = {
        email: 'integration@example.com',
        shootId: 'shoot_integration'
      };

      const magicLink = await magicLinkService.generateMagicLink(magicLinkRequest);
      
      expect(magicLink.token).toMatch(/^[a-f0-9]{64}$/); // ADR-003: 64-char hex
      expect(magicLink.clientEmail).toBe('integration@example.com');

      // Step 3: Mock user service response
      mockUserService.findUserByEmail.mockResolvedValue({
        id: 'user_integration',
        email: 'integration@example.com',
        role: 'client',
        isActive: true
      });

      mockJWTService.sign.mockReturnValue('mock.jwt.token');

      // Step 4: Validate magic link and authenticate
      const validationRequest: MagicLinkValidationRequest = {
        token: magicLink.token,
        shootId: 'shoot_integration'
      };

      const authResponse = await magicLinkService.validateMagicLink(validationRequest);
      
      expect(authResponse).toMatchObject({
        accessToken: 'mock.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes
        user: {
          id: 'user_integration',
          email: 'integration@example.com',
          role: 'client',
          shootId: 'shoot_integration'
        }
      });

      // Step 5: Verify events were published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.created',
          inviteId: createdInvitation.id
        }),
        createdInvitation.id
      );

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          eventType: 'user.authenticated',
          userId: 'user_integration',
          method: 'magic_link'
        }),
        'user_integration'
      );

      // Step 6: Verify magic link is now used (ADR-003: single-use)
      await expect(magicLinkService.validateMagicLink(validationRequest))
        .rejects.toThrow('Magic link has already been used');
    });

    it('should handle invitation lifecycle with email sending', async () => {
      // Step 1: Create invitation
      const createRequest: CreateInvitationRequest = {
        shootId: 'shoot_lifecycle',
        clientEmail: 'lifecycle@example.com',
        message: 'Welcome to your gallery!'
      };

      const invitation = await inviteService.createInvitation(createRequest);
      expect(invitation.status).toBe('pending');

      // Step 2: Send invitation email
      mockEmailService.sendInvitation.mockResolvedValue(true);

      const sendResult = await inviteService.sendInvitation(invitation.id, {
        subject: 'Your photos are ready!',
        templateVars: { photographerName: 'John Doe' }
      });

      expect(sendResult).toEqual({ sent: true });
      
      // Verify invitation status updated
      const sentInvitation = await inviteService.getInvitation(invitation.id);
      expect(sentInvitation?.status).toBe('sent');
      expect(sentInvitation?.sentAt).toBeDefined();

      // Step 3: Test resend functionality
      const resendResult = await inviteService.resendInvitation(invitation.id);
      expect(resendResult).toEqual({ sent: true });

      // Step 4: Revoke invitation
      const revokedInvitation = await inviteService.revokeInvitation(invitation.id);
      expect(revokedInvitation.status).toBe('revoked');

      // Verify revocation event published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'invites',
        expect.objectContaining({
          eventType: 'invite.revoked',
          inviteId: invitation.id
        }),
        invitation.id
      );
    });
  });

  describe('Rate Limiting and Security Integration (ADR-003)', () => {
    it('should enforce rate limiting across multiple requests', async () => {
      const email = 'ratelimit@example.com';
      const shootId = 'shoot_ratelimit';

      // Generate 3 magic links (at the limit)
      for (let i = 0; i < 3; i++) {
        await magicLinkService.generateMagicLink({ email, shootId });
      }

      // 4th request should be rate limited
      await expect(magicLinkService.generateMagicLink({ email, shootId }))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle token expiry correctly', async () => {
      const request: MagicLinkGenerationRequest = {
        email: 'expiry@example.com',
        shootId: 'shoot_expiry'
      };

      // Generate magic link
      const magicLink = await magicLinkService.generateMagicLink(request);

      // Manually expire the token by setting expiresAt in the past
      await mockMagicLinkRepository.update(magicLink.token, {
        expiresAt: new Date(Date.now() - 60000) // 1 minute ago
      });

      // Try to validate expired token
      await expect(magicLinkService.validateMagicLink({
        token: magicLink.token,
        shootId: 'shoot_expiry'
      })).rejects.toThrow('Magic link has expired');
    });
  });

  describe('Event-Driven Architecture Integration', () => {
    it('should handle concurrent user events without conflicts', async () => {
      const shootId = 'shoot_concurrent';
      const email = 'concurrent@example.com';

      const events = [
        {
          eventType: 'user.created',
          userId: 'user_1',
          email,
          role: 'client',
          shootId
        },
        {
          eventType: 'user.verified',
          userId: 'user_1',
          email,
          shootId
        }
      ];

      // Process events concurrently
      const results = await Promise.all([
        inviteService.handleUserCreatedEvent(events[0]),
        inviteService.handleUserVerifiedEvent(events[1])
      ]);

      // Both should succeed without conflicts
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      
      // Verify appropriate events published
      const publishCalls = mockEventPublisher.publish.mock.calls;
      const eventTypes = publishCalls.map(call => call[1].eventType);
      
      expect(eventTypes).toContain('invite.created');
    });

    it('should handle high-volume invitation creation', async () => {
      const shootId = 'shoot_volume';
      const invitationCount = 20;

      // Create multiple invitations concurrently
      const createPromises = Array(invitationCount).fill(null).map((_, index) => 
        inviteService.createInvitation({
          shootId,
          clientEmail: `client${index}@example.com`,
          message: `Welcome client ${index}!`
        })
      );

      const createdInvitations = await Promise.all(createPromises);
      
      expect(createdInvitations).toHaveLength(invitationCount);
      
      // Verify all have unique IDs
      const uniqueIds = new Set(createdInvitations.map(inv => inv.id));
      expect(uniqueIds.size).toBe(invitationCount);

      // Test querying the invitations
      const result = await inviteService.listInvitations({
        shootId,
        page: 1,
        limit: 25
      });

      expect(result.total).toBe(invitationCount);
      expect(result.invitations).toHaveLength(invitationCount);
    });
  });
});

// Helper functions for in-memory repositories
function createInMemoryInvitationRepository() {
  const invitations = new Map();
  let idCounter = 1;

  return {
    create: vi.fn(async (data: any) => {
      const invitation = {
        id: `invitation_${idCounter++}`,
        ...data,
        status: data.status || 'pending',
        magicLinkToken: `token_${Date.now()}_${Math.random()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      invitations.set(invitation.id, invitation);
      return invitation;
    }),

    findById: vi.fn(async (id: string) => {
      return invitations.get(id) || null;
    }),

    findByShootId: vi.fn(async (shootId: string) => {
      return Array.from(invitations.values()).filter((inv: any) => inv.shootId === shootId);
    }),

    update: vi.fn(async (id: string, updates: any) => {
      const invitation = invitations.get(id);
      if (invitation) {
        const updated = { ...invitation, ...updates, updatedAt: new Date() };
        invitations.set(id, updated);
        return updated;
      }
      return null;
    }),

    list: vi.fn(async (query: any) => {
      let results = Array.from(invitations.values());
      
      if (query.shootId) {
        results = results.filter((inv: any) => inv.shootId === query.shootId);
      }
      if (query.status) {
        results = results.filter((inv: any) => inv.status === query.status);
      }
      if (query.clientEmail) {
        results = results.filter((inv: any) => inv.clientEmail === query.clientEmail);
      }

      const start = (query.page - 1) * query.limit;
      return results.slice(start, start + query.limit);
    }),

    count: vi.fn(async (query: any) => {
      let results = Array.from(invitations.values());
      
      if (query.shootId) {
        results = results.filter((inv: any) => inv.shootId === query.shootId);
      }
      if (query.status) {
        results = results.filter((inv: any) => inv.status === query.status);
      }
      if (query.clientEmail) {
        results = results.filter((inv: any) => inv.clientEmail === query.clientEmail);
      }

      return results.length;
    })
  };
}

function createInMemoryMagicLinkRepository() {
  const magicLinks = new Map();
  const tokenCounts = new Map(); // For rate limiting

  return {
    create: vi.fn(async (data: any) => {
      const magicLink = {
        ...data,
        accessCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      magicLinks.set(data.token, magicLink);
      
      // Track for rate limiting
      const email = data.clientEmail;
      const now = Date.now();
      if (!tokenCounts.has(email)) {
        tokenCounts.set(email, []);
      }
      tokenCounts.get(email).push(now);
      
      return magicLink;
    }),

    findByToken: vi.fn(async (token: string) => {
      return magicLinks.get(token) || null;
    }),

    markAsUsed: vi.fn(async (token: string) => {
      const magicLink = magicLinks.get(token);
      if (magicLink) {
        magicLink.isActive = false;
        magicLink.accessCount += 1;
        magicLink.lastAccessedAt = new Date();
        magicLink.updatedAt = new Date();
        return true;
      }
      return false;
    }),

    update: vi.fn(async (token: string, updates: any) => {
      const magicLink = magicLinks.get(token);
      if (magicLink) {
        Object.assign(magicLink, updates, { updatedAt: new Date() });
        return magicLink;
      }
      return null;
    }),

    getRecentTokensCount: vi.fn(async (email: string, minutes: number = 1) => {
      const cutoff = Date.now() - minutes * 60 * 1000;
      const timestamps = tokenCounts.get(email) || [];
      return timestamps.filter((time: number) => time > cutoff).length;
    }),

    cleanup: vi.fn(async () => {
      let cleaned = 0;
      const now = new Date();
      
      for (const [token, magicLink] of magicLinks.entries()) {
        if (magicLink.expiresAt < now) {
          magicLinks.delete(token);
          cleaned++;
        }
      }
      
      return cleaned;
    })
  };
}