import {
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery,
  Invitation
} from '../shared/contracts/invites.dto';
import { InvitationRepository } from '../persistence/invitation.repository';
import { MagicLinkRepository } from '../persistence/magic-link.repository';
import { EventPublisher } from '../shared/messaging/event-publisher';
import { appConfig } from '../config/app.config';
import { parseDuration } from '@tempsdarret/shared/config';
import { randomBytes } from 'crypto';

// Enriched by user-service so the invitation can be composed (and its email
// sent by notification-service) without direct service-to-service calls.
export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  email: string;
  shootId?: string;
  shootTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  photographerName?: string;
  photographerEmail?: string;
  timestamp: string;
}

export class InvitationService {
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

    // Generate magic link (ADR-003: 64-char hex; 48h invitation TTL from config)
    const token = randomBytes(32).toString('hex'); // 64-char hex
    const expiresAt = new Date(Date.now() + parseDuration(appConfig.invitationTtl));
    const magicLink = await this.magicLinkRepository.create({
      token,
      shootId: event.shootId,
      clientEmail: event.email,
      expiresAt,
      isActive: true,
      accessCount: 0
    });

    const magicLinkUrl = `${appConfig.appBaseUrl}/gallery/access/${magicLink.token}`;

    // Publish enriched invitation.created — carries everything the
    // notification service needs to compose the email on its own.
    await this.eventPublisher.publish('invitations', {
      eventType: 'invitation.created',
      invitationId: invitation.id,
      shootId: invitation.shootId,
      clientEmail: invitation.clientEmail,
      shootDetails: {
        eventName: event.shootTitle,
        eventDate: event.eventDate,
        eventLocation: event.eventLocation,
        photographerName: event.photographerName,
        photographerEmail: event.photographerEmail
      },
      magicLinkUrl,
      expirationDate: expiresAt.toISOString(),
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