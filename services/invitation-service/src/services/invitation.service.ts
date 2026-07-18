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
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Shoot context enriched by user-service so the invitation can be composed
// (and its email sent by notification-service) without direct service calls.
interface EnrichedUserEvent {
  email: string;
  shootId?: string | undefined;
  shootTitle?: string | undefined;
  eventDate?: string | undefined;
  eventLocation?: string | undefined;
  photographerName?: string | undefined;
  photographerEmail?: string | undefined;
}

// Consumed events arrive as untyped JSON off Kafka — validated at the boundary
// (schema.parse) rather than cast; types are inferred from the schemas.
const enrichedUserEventShape = {
  email: z.string(),
  shootId: z.string().optional(),
  shootTitle: z.string().optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().optional(),
  photographerName: z.string().optional(),
  photographerEmail: z.string().optional()
};

export const userCreatedEventSchema = z.object({
  ...enrichedUserEventShape,
  eventType: z.literal('user.created'),
  userId: z.string(),
  timestamp: z.string()
});
export type UserCreatedEvent = z.infer<typeof userCreatedEventSchema>;

export const userVerifiedEventSchema = z.object({
  ...enrichedUserEventShape,
  eventType: z.literal('user.verified'),
  userId: z.string(),
  shootId: z.string(),
  timestamp: z.string()
});
export type UserVerifiedEvent = z.infer<typeof userVerifiedEventSchema>;

export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  // New client: create the invitation and publish invitation.created.
  async handleUserCreatedEvent(event: UserCreatedEvent): Promise<Invitation> {
    return this.createInvitationFromUserEvent(event);
  }

  // Existing client: same outcome — a fresh magic link and invitation.created —
  // so the notification flow is identical regardless of prior account state.
  async handleUserVerifiedEvent(event: UserVerifiedEvent): Promise<Invitation> {
    return this.createInvitationFromUserEvent(event);
  }

  private async createInvitationFromUserEvent(event: EnrichedUserEvent): Promise<Invitation> {
    if (event.shootId === undefined) {
      throw new Error('shootId is required to create an invitation');
    }

    const invitation = await this.invitationRepository.create({
      shootId: event.shootId,
      clientEmail: event.email,
      status: 'pending' as const
    });

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