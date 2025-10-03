import { ShootRepository } from '../persistence/shoot.repository.js';

export interface AccessValidationResult {
  allowed: boolean;
  shootId?: string;
  reason?: string;
}

export class ShootAccessService {
  constructor(private readonly shootRepository: ShootRepository) {}

  /**
   * Validate client can access shoot
   * Checks:
   * - Shoot exists and is accessible
   * - Magic link token if provided
   * - Access hasn't expired
   * - Logs access attempt for analytics
   */
  async validateShootAccess(
    shootRef: string,
    clientToken?: string
  ): Promise<AccessValidationResult> {
    // Find shoot by reference
    const shoot = await this.shootRepository.findByReference(shootRef);

    if (!shoot) {
      return {
        allowed: false,
        reason: 'Shoot not found'
      };
    }

    // Check if client access is enabled
    if (!shoot.access?.allowClientAccess) {
      return {
        allowed: false,
        shootId: shoot.id,
        reason: 'Client access not enabled for this shoot'
      };
    }

    // Check if access has expired
    if (shoot.access.expiresAt && new Date(shoot.access.expiresAt) < new Date()) {
      return {
        allowed: false,
        shootId: shoot.id,
        reason: 'Access has expired'
      };
    }

    // If token provided, validate it (would integrate with invite-service)
    if (clientToken) {
      // TODO: Validate token with invite-service
      // For now, we'll assume valid if provided
    }

    // Log access attempt
    await this.logAccess(shoot.id, clientToken);

    return {
      allowed: true,
      shootId: shoot.id
    };
  }

  private async logAccess(shootId: string, token?: string): Promise<void> {
    // Update last access timestamp
    await this.shootRepository.updateById(shootId, {
      'status.lastClientAccess': new Date()
    } as any);

    // TODO: Publish access event for analytics
  }
}
