import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  CreateInvitationRequestSchema,
  SendInvitationRequestSchema,
  InvitationQuerySchema,
  InvitationSchema,
  MagicLinkValidationRequestSchema,
  AuthResponseSchema
} from '@tempsdarret/shared/schemas/invite.schema';

describe('Invite Service API Contract Tests (TypeSpec Compliance)', () => {
  describe('Invitation API Contracts', () => {
    describe('POST /invitations - CreateInvitationRequest', () => {
      it('should validate correct CreateInvitationRequest schema', () => {
        const validRequest = {
          shootId: 'shoot_123',
          clientEmail: 'client@example.com',
          message: 'Welcome to your photo gallery!'
        };

        const result = CreateInvitationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data).toEqual(validRequest);
        }
      });

      it('should reject CreateInvitationRequest with invalid email', () => {
        const invalidRequest = {
          shootId: 'shoot_123',
          clientEmail: 'invalid-email',
          message: 'Welcome!'
        };

        const result = CreateInvitationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('clientEmail')
          )).toBe(true);
        }
      });

      it('should reject CreateInvitationRequest with message too long', () => {
        const invalidRequest = {
          shootId: 'shoot_123',
          clientEmail: 'client@example.com',
          message: 'A'.repeat(1001) // Over 1000 character limit
        };

        const result = CreateInvitationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('message')
          )).toBe(true);
        }
      });

      it('should allow CreateInvitationRequest without optional message', () => {
        const validRequest = {
          shootId: 'shoot_123',
          clientEmail: 'client@example.com'
        };

        const result = CreateInvitationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });
    });

    describe('POST /invitations/{id}/send - SendInvitationRequest', () => {
      it('should validate correct SendInvitationRequest schema', () => {
        const validRequest = {
          subject: 'Your photos are ready!',
          templateVars: {
            photographerName: 'John Doe',
            galleryUrl: 'https://example.com/gallery/123'
          }
        };

        const result = SendInvitationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject SendInvitationRequest with subject too long', () => {
        const invalidRequest = {
          subject: 'A'.repeat(201), // Over 200 character limit
          templateVars: {}
        };

        const result = SendInvitationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should allow empty SendInvitationRequest', () => {
        const validRequest = {};

        const result = SendInvitationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });
    });

    describe('GET /invitations - InvitationQuery', () => {
      it('should validate correct InvitationQuery with all parameters', () => {
        const validQuery = {
          shootId: 'shoot_123',
          clientEmail: 'client@example.com',
          status: 'sent',
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-12-31'),
          page: 1,
          limit: 20
        };

        const result = InvitationQuerySchema.safeParse(validQuery);
        expect(result.success).toBe(true);
      });

      it('should apply default values for pagination', () => {
        const minimalQuery = {};

        const result = InvitationQuerySchema.safeParse(minimalQuery);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it('should reject InvitationQuery with invalid status', () => {
        const invalidQuery = {
          status: 'invalid_status'
        };

        const result = InvitationQuerySchema.safeParse(invalidQuery);
        expect(result.success).toBe(false);
      });

      it('should reject InvitationQuery with limit too high', () => {
        const invalidQuery = {
          limit: 101 // Over 100 limit
        };

        const result = InvitationQuerySchema.safeParse(invalidQuery);
        expect(result.success).toBe(false);
      });

      it('should reject InvitationQuery with page less than 1', () => {
        const invalidQuery = {
          page: 0
        };

        const result = InvitationQuerySchema.safeParse(invalidQuery);
        expect(result.success).toBe(false);
      });
    });

    describe('Invitation Response Schema', () => {
      it('should validate correct Invitation response', () => {
        const validInvitation = {
          id: 'invitation_123',
          shootId: 'shoot_456',
          clientEmail: 'client@example.com',
          status: 'sent',
          magicLinkToken: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
          sentAt: new Date('2024-01-15T10:00:00Z'),
          viewedAt: new Date('2024-01-15T14:30:00Z'),
          message: 'Welcome to your gallery!',
          createdAt: new Date('2024-01-15T09:00:00Z'),
          updatedAt: new Date('2024-01-15T14:30:00Z')
        };

        const result = InvitationSchema.safeParse(validInvitation);
        expect(result.success).toBe(true);
      });

      it('should validate Invitation with minimal required fields', () => {
        const minimalInvitation = {
          id: 'invitation_minimal',
          shootId: 'shoot_minimal',
          clientEmail: 'minimal@example.com',
          status: 'pending',
          magicLinkToken: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456a',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = InvitationSchema.safeParse(minimalInvitation);
        expect(result.success).toBe(true);
      });

      it('should reject Invitation with invalid status', () => {
        const invalidInvitation = {
          id: 'invitation_invalid',
          shootId: 'shoot_invalid',
          clientEmail: 'invalid@example.com',
          status: 'invalid_status',
          magicLinkToken: 'token123',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = InvitationSchema.safeParse(invalidInvitation);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Magic Link API Contracts (ADR-003)', () => {
    describe('GET /magic-links/{token} - MagicLinkValidationRequest', () => {
      it('should validate correct MagicLinkValidationRequest with 64-char hex token', () => {
        const validRequest = {
          token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
          shootId: 'shoot_123'
        };

        const result = MagicLinkValidationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject MagicLinkValidationRequest with invalid token format', () => {
        const invalidRequest = {
          token: 'invalid_token_format',
          shootId: 'shoot_123'
        };

        const result = MagicLinkValidationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.message.includes('Invalid magic link token format')
          )).toBe(true);
        }
      });

      it('should reject MagicLinkValidationRequest with non-hex characters', () => {
        const invalidRequest = {
          token: 'g1h2i3j4k5l6789012345678901234567890123456789012345678901234567890123456' // Contains g,h,i,j,k
        };

        const result = MagicLinkValidationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject MagicLinkValidationRequest with wrong token length', () => {
        const invalidRequests = [
          { token: 'a1b2c3d4e5' }, // Too short
          { token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456789' } // Too long
        ];

        invalidRequests.forEach(request => {
          const result = MagicLinkValidationRequestSchema.safeParse(request);
          expect(result.success).toBe(false);
        });
      });

      it('should allow MagicLinkValidationRequest without shootId', () => {
        const validRequest = {
          token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456'
        };

        const result = MagicLinkValidationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });
    });

    describe('AuthResponse Schema (ADR-003)', () => {
      it('should validate correct AuthResponse', () => {
        const validResponse = {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          tokenType: 'Bearer',
          expiresIn: 900, // 15 minutes in seconds
          user: {
            id: 'user_123',
            email: 'client@example.com',
            role: 'client',
            shootId: 'shoot_456'
          }
        };

        const result = AuthResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('should apply default tokenType', () => {
        const responseWithoutTokenType = {
          accessToken: 'jwt.token.here',
          expiresIn: 900,
          user: {
            id: 'user_123',
            email: 'client@example.com',
            role: 'client'
          }
        };

        const result = AuthResponseSchema.safeParse(responseWithoutTokenType);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.tokenType).toBe('Bearer');
        }
      });

      it('should validate AuthResponse with guest role', () => {
        const guestResponse = {
          accessToken: 'jwt.token.here',
          expiresIn: 900,
          user: {
            id: 'guest_123',
            email: 'guest@example.com',
            role: 'guest',
            shootId: 'shoot_789'
          }
        };

        const result = AuthResponseSchema.safeParse(guestResponse);
        expect(result.success).toBe(true);
      });

      it('should reject AuthResponse with invalid user role', () => {
        const invalidResponse = {
          accessToken: 'jwt.token.here',
          expiresIn: 900,
          user: {
            id: 'user_123',
            email: 'client@example.com',
            role: 'invalid_role'
          }
        };

        const result = AuthResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
      });

      it('should reject AuthResponse with invalid email format', () => {
        const invalidResponse = {
          accessToken: 'jwt.token.here',
          expiresIn: 900,
          user: {
            id: 'user_123',
            email: 'invalid-email',
            role: 'client'
          }
        };

        const result = AuthResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
      });

      it('should allow AuthResponse without shootId', () => {
        const validResponse = {
          accessToken: 'jwt.token.here',
          expiresIn: 900,
          user: {
            id: 'user_123',
            email: 'client@example.com',
            role: 'photographer'
          }
        };

        const result = AuthResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Response Contracts', () => {
    it('should validate standard API error format', () => {
      const errorFormats = [
        {
          success: false,
          error: 'Invitation not found'
        },
        {
          success: false,
          error: 'Magic link has expired'
        },
        {
          success: false,
          error: 'Rate limit exceeded'
        }
      ];

      errorFormats.forEach(error => {
        expect(error.success).toBe(false);
        expect(typeof error.error).toBe('string');
      });
    });
  });

  describe('Success Response Contracts', () => {
    it('should validate standard API success format', () => {
      const successFormats = [
        {
          success: true,
          data: { id: 'invitation_123', status: 'created' }
        },
        {
          success: true,
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
        },
        {
          success: true,
          data: { sent: true }
        }
      ];

      successFormats.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
      });
    });
  });

  describe('TypeSpec Enum Validation', () => {
    it('should validate all InvitationStatus enum values', () => {
      const validStatuses = ['pending', 'sent', 'viewed', 'accepted', 'expired', 'revoked'];
      
      validStatuses.forEach(status => {
        const invitation = {
          id: 'test_id',
          shootId: 'test_shoot',
          clientEmail: 'test@example.com',
          status,
          magicLinkToken: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = InvitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all user role enum values', () => {
      const validRoles = ['photographer', 'client', 'guest'];
      
      validRoles.forEach(role => {
        const user = {
          id: 'user_123',
          email: 'test@example.com',
          role
        };

        const authResponse = {
          accessToken: 'token',
          expiresIn: 900,
          user
        };

        const result = AuthResponseSchema.safeParse(authResponse);
        expect(result.success).toBe(true);
      });
    });
  });
});