import { FastifyRequest, FastifyReply } from 'fastify';
import { InviteService } from '../services/invite.service';
import { 
  CreateInvitationRequestSchema,
  SendInvitationRequestSchema,
  InvitationQuerySchema 
} from '@tempsdarret/shared/schemas/invite.schema';

export class InvitationController {
  constructor(private readonly inviteService: InviteService) {}

  async createInvitation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const validatedBody = CreateInvitationRequestSchema.parse(request.body);
      const invitation = await this.inviteService.createInvitation(validatedBody);

      await reply.status(201).send({
        success: true,
        data: invitation
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  }

  async listInvitations(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const validatedQuery = InvitationQuerySchema.parse(request.query);
      const result = await this.inviteService.listInvitations(validatedQuery);

      await reply.status(200).send({
        success: true,
        data: result.invitations,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid query'
      });
    }
  }

  async getInvitation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { invitationId } = request.params as { invitationId: string };
      const invitation = await this.inviteService.getInvitation(invitationId);

      if (invitation === null) {
        await reply.status(404).send({
          success: false,
          error: 'Invitation not found'
        });
        return;
      }

      await reply.status(200).send({
        success: true,
        data: invitation
      });
    } catch (error) {
      await reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async sendInvitation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { invitationId } = request.params as { invitationId: string };
      const validatedBody = SendInvitationRequestSchema.parse(request.body);

      const result = await this.inviteService.sendInvitation(invitationId, validatedBody);

      await reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation'
      });
    }
  }

  async resendInvitation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { invitationId } = request.params as { invitationId: string };
      const result = await this.inviteService.resendInvitation(invitationId);

      await reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation'
      });
    }
  }

  async revokeInvitation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { invitationId } = request.params as { invitationId: string };
      const invitation = await this.inviteService.revokeInvitation(invitationId);

      await reply.status(200).send({
        success: true,
        data: invitation
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke invitation'
      });
    }
  }
}