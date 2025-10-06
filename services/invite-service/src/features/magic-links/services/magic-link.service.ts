/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import {
  MagicLinkGenerationRequest,
  MagicLinkValidationRequest,
  AuthResponse,
  MagicLink
} from '@tempsdarret/shared/schemas/invite.schema';

export class MagicLinkService {
  constructor(
    private readonly magicLinkRepository: any,
    private readonly userService: any,
    private readonly jwtService: any,
    private readonly eventPublisher: any
  ) {}

  async generateMagicLink(request: MagicLinkGenerationRequest): Promise<MagicLink> {
    // Rate limiting check (ADR-003: max 3 requests per minute)
    const recentCount = await this.magicLinkRepository.getRecentTokensCount(request.email);
    if (recentCount >= 3) {
      throw new Error('Rate limit exceeded');
    }

    // Generate 64-character hex token (ADR-003)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage (ADR-003 security)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create magic link with 15-minute expiry (ADR-003)
    const magicLinkData = {
      token: hashedToken, // Store hashed version
      shootId: request.shootId,
      clientEmail: request.email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      accessCount: 0,
      isActive: true
    };

    const magicLink = await this.magicLinkRepository.create(magicLinkData);
    
    // Return magic link with raw token (for client use)
    return {
      ...magicLink,
      token // Return raw token, not hashed
    };
  }

  async validateMagicLink(request: MagicLinkValidationRequest): Promise<AuthResponse> {
    // Hash incoming token to match stored version
    const hashedToken = crypto.createHash('sha256').update(request.token).digest('hex');
    
    // Find magic link by hashed token
    const magicLink = await this.magicLinkRepository.findByToken(hashedToken);
    if (!magicLink) {
      throw new Error('Invalid magic link token');
    }

    // Check if expired (ADR-003)
    if (new Date() > magicLink.expiresAt) {
      throw new Error('Magic link has expired');
    }

    // Check if already used (ADR-003: single-use)
    if (!magicLink.isActive || magicLink.accessCount > 0) {
      throw new Error('Magic link has already been used');
    }

    // Validate shoot ID if provided
    if (request.shootId && magicLink.shootId !== request.shootId) {
      throw new Error('Invalid shoot ID for this magic link');
    }

    // Find user by email
    const user = await this.userService.findUserByEmail(magicLink.clientEmail);
    if (!user?.isActive) {
      throw new Error('User not found or inactive');
    }

    // Mark magic link as used (ADR-003: single-use)
    await this.magicLinkRepository.markAsUsed(hashedToken);

    // Generate JWT with 15-minute expiry (ADR-003)
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      shootId: magicLink.shootId,
      invitationId: magicLink.invitationId,
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '15m'
    });

    // Publish authentication event
    await this.eventPublisher.publish(
      'auth',
      {
        eventType: 'user.authenticated',
        userId: user.id,
        method: 'magic_link',
        shootId: magicLink.shootId,
        timestamp: new Date().toISOString()
      },
      user.id
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        shootId: magicLink.shootId
      }
    };
  }

  async recordAccess(token: string): Promise<{ accessCount: number }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const magicLink = await this.magicLinkRepository.findByToken(hashedToken);
    
    if (!magicLink) {
      throw new Error('Magic link not found');
    }

    // Update access count and timestamp
    const updatedCount = magicLink.accessCount + 1;
    await this.magicLinkRepository.update(hashedToken, {
      accessCount: updatedCount,
      lastAccessedAt: new Date()
    });

    return { accessCount: updatedCount };
  }

  async cleanupExpiredTokens(): Promise<number> {
    return this.magicLinkRepository.cleanup();
  }
}