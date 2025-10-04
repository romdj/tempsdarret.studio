import { 
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery,
  Invitation
} from '../shared/contracts/invites.dto';
import { InvitationRepository } from '../persistence/invitation.repository';
import { MagicLinkRepository } from '../persistence/magic-link.repository';
import { EventPublisher } from '../shared/messaging/event-publisher';

export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  email: string;
  shootId?: string;
  timestamp: string;
}

export class InviteService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async handleUserCreatedEvent(event: UserCreatedEvent): Promise<Invitation> {
    if (event.shootId === undefined) {
      throw new Error('shootId is required for user created event');
    }

    // Create invitation
    const invitationData = {
      shootId: event.shootId,
      clientEmail: event.email,
      status: 'pending' as const
    };

    const invitation = await this.invitationRepository.create(invitationData);

    // Generate magic link (ADR-003: 64-char hex, 15-minute expiry)
    const magicLinkData = {
      shootId: event.shootId,
      clientEmail: event.email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      isActive: true
    };

    const magicLink = await this.magicLinkRepository.create(magicLinkData);

    // Publish invitation.created event
    await this.eventPublisher.publish('invitations', {
      eventType: 'invitation.created',
      invitationId: invitation.id,
      shootId: invitation.shootId,
      clientEmail: invitation.clientEmail,
      magicLinkToken: magicLink.token,
      timestamp: new Date().toISOString()
    });

    return invitation;
  }

  async createInvitation(request: CreateInvitationRequest): Promise<Invitation> {
    const invitation = await this.invitationRepository.create(request);

    await this.eventPublisher.publish('invitations', {
      eventType: 'invitation.created',
      invitationId: invitation.id,
      shootId: invitation.shootId,
      clientEmail: invitation.clientEmail,
      timestamp: new Date().toISOString()
    });

    return invitation;
  }

  async listInvitations(query: InvitationQuery): Promise<Invitation[]> {
    return this.invitationRepository.list(query);
  }

  async getInvitation(inviteId: string): Promise<Invitation | null> {
    return this.invitationRepository.findById(inviteId);
  }

  async sendInvitation(inviteId: string, _request: SendInvitationRequest): Promise<{ sent: boolean }> {
    const invitation = await this.invitationRepository.findById(inviteId);
    if (invitation === null) {
      throw new Error('Invitation not found');
    }

    // Update invitation status
    await this.invitationRepository.update(inviteId, { status: 'sent' });

    // Publish invitation.sent event
    await this.eventPublisher.publish('invitations', {
      eventType: 'invitation.sent',
      invitationId: inviteId,
      shootId: invitation.shootId,
      clientEmail: invitation.clientEmail,
      timestamp: new Date().toISOString()
    });

    return { sent: true };
  }
}