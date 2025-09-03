import crypto from 'crypto';
import { 
  MagicLinkGenerationRequest,
  MagicLinkValidationRequest,
  AuthResponse,
  MagicLink
} from '../shared/contracts/invites.dto';
import { MagicLinkRepository } from '../persistence/magic-link.repository';
import { EventPublisher } from '../shared/messaging/event-publisher';

export class MagicLinkService {
  constructor(
    private magicLinkRepository: MagicLinkRepository,
    private eventPublisher: EventPublisher
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

    // Publish magic.link.generated event
    await this.eventPublisher.publish('magic-links', {
      eventType: 'magic.link.generated',
      magicLinkId: magicLink.id,
      shootId: request.shootId,
      clientEmail: request.email,
      timestamp: new Date().toISOString()
    });

    // Return magic link with plain token for immediate use
    return {
      ...magicLink,
      token // Return unhashed token for immediate use
    };
  }

  async validateMagicLink(request: MagicLinkValidationRequest): Promise<AuthResponse> {
    // Hash provided token for comparison
    const hashedToken = crypto.createHash('sha256').update(request.token).digest('hex');
    
    // Find magic link by hashed token
    const magicLink = await this.magicLinkRepository.findByToken(hashedToken);
    
    if (!magicLink) {
      throw new Error('Invalid magic link');
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      throw new Error('Magic link has expired');
    }

    // Check if already used (single-use)
    if (!magicLink.isActive || magicLink.accessCount > 0) {
      throw new Error('Magic link has already been used');
    }

    // Verify shoot context if provided
    if (request.shootId && magicLink.shootId !== request.shootId) {
      throw new Error('Invalid shoot context');
    }

    // Mark as used
    await this.magicLinkRepository.markAsUsed(magicLink.id);

    // Publish magic.link.used event
    await this.eventPublisher.publish('magic-links', {
      eventType: 'magic.link.used',
      magicLinkId: magicLink.id,
      shootId: magicLink.shootId,
      clientEmail: magicLink.clientEmail,
      timestamp: new Date().toISOString()
    });

    // Return auth response (would include JWT in real implementation)
    return {
      success: true,
      clientEmail: magicLink.clientEmail,
      shootId: magicLink.shootId,
      accessToken: 'jwt-token-placeholder', // TODO: Generate real JWT
      expiresIn: 3600 // 1 hour
    };
  }
}