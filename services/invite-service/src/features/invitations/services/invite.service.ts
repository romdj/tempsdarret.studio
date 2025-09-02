import { 
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery,
  Invitation
} from '@tempsdarret/shared/schemas/invite.schema';
import { EmailSchema } from '@tempsdarret/shared/schemas/base.schema';

export class InviteService {
  constructor(
    private invitationRepository: any,
    private magicLinkRepository: any,
    private eventPublisher: any,
    private emailService: any
  ) {}

  async handleUserCreatedEvent(event: any): Promise<Invitation> {
    // Validate email format
    const emailValidation = EmailSchema.safeParse(event.email);
    if (!emailValidation.success) {
      throw new Error('Invalid email format');
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

    // Publish invite.created event
    await this.eventPublisher.publish(
      'invites',
      {
        eventType: 'invite.created',
        inviteId: invitation.id,
        email: event.email,
        shootId: event.shootId,
        token: magicLink.token,
        expiresAt: magicLink.expiresAt.toISOString()
      },
      invitation.id
    );

    return invitation;
  }

  async handleUserVerifiedEvent(event: any): Promise<Invitation> {
    // Find existing invitations for this shoot
    const existingInvitations = await this.invitationRepository.findByShootId(event.shootId);
    const targetInvitation = existingInvitations.find((inv: any) => inv.clientEmail === event.email);

    if (targetInvitation) {
      // Reactivate existing invitation
      const updatedInvitation = await this.invitationRepository.update(
        targetInvitation.id,
        { status: 'pending' }
      );

      // Publish reactivation event
      await this.eventPublisher.publish(
        'invites',
        {
          eventType: 'invite.reactivated',
          inviteId: targetInvitation.id,
          shootId: event.shootId
        },
        targetInvitation.id
      );

      return updatedInvitation;
    }

    // If no existing invitation, create new one
    return this.handleUserCreatedEvent(event);
  }

  async createInvitation(request: CreateInvitationRequest): Promise<Invitation> {
    return this.invitationRepository.create(request);
  }

  async listInvitations(query: InvitationQuery) {
    const invitations = await this.invitationRepository.list(query);
    const total = await this.invitationRepository.count(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      invitations,
      total,
      page: query.page,
      limit: query.limit,
      totalPages
    };
  }

  async getInvitation(invitationId: string): Promise<Invitation | null> {
    return this.invitationRepository.findById(invitationId);
  }

  async sendInvitation(invitationId: string, request: SendInvitationRequest): Promise<{ sent: boolean }> {
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Send email
    const emailSent = await this.emailService.sendInvitation(invitation, request);
    
    if (emailSent) {
      // Update invitation status
      await this.invitationRepository.update(invitationId, {
        status: 'sent',
        sentAt: new Date()
      });

      // Publish sent event
      await this.eventPublisher.publish(
        'invites',
        {
          eventType: 'invite.sent',
          inviteId: invitationId
        },
        invitationId
      );
    }

    return { sent: emailSent };
  }

  async resendInvitation(invitationId: string): Promise<{ sent: boolean }> {
    return this.sendInvitation(invitationId, {});
  }

  async revokeInvitation(invitationId: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Invalidate associated magic link
    await this.magicLinkRepository.markAsUsed(invitation.magicLinkToken);

    // Update invitation status
    const revokedInvitation = await this.invitationRepository.update(invitationId, {
      status: 'revoked',
      updatedAt: new Date()
    });

    // Publish revocation event
    await this.eventPublisher.publish(
      'invites',
      {
        eventType: 'invite.revoked',
        inviteId: invitationId
      },
      invitationId
    );

    return revokedInvitation;
  }
}