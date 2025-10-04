import { FastifyRequest, FastifyReply } from 'fastify';
import { InviteService } from '../services/invite.service';
import { 
  CreateInvitationRequestSchema,
  SendInvitationRequestSchema,
  InvitationQuerySchema,
  CreateInvitationRequest,
  SendInvitationRequest,
  InvitationQuery
} from '../shared/contracts/invites.dto';

interface InviteParams {
  inviteId: string;
}

export class InvitationHandlers {
  constructor(private readonly inviteService: InviteService) {}

  async createInvitation(
    request: FastifyRequest<{ Body: CreateInvitationRequest }>,
    reply: FastifyReply
  ): Promise<void> {
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

  async listInvitations(request: FastifyRequest<{ Querystring: InvitationQuery }>, reply: FastifyReply): Promise<void> {
    try {
      const validatedQuery = InvitationQuerySchema.parse(request.query);
      const invitations = await this.inviteService.listInvitations(validatedQuery);

      await reply.status(200).send({
        success: true,
        data: invitations
      });
    } catch (error) {
      await reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid query'
      });
    }
  }

  async getInvitation(request: FastifyRequest<{ Params: InviteParams }>, reply: FastifyReply): Promise<void> {
    try {
      const { inviteId } = request.params;
      const invitation = await this.inviteService.getInvitation(inviteId);

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

  async sendInvitation(
    request: FastifyRequest<{ Params: InviteParams; Body: SendInvitationRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { inviteId } = request.params;
      const validatedBody = SendInvitationRequestSchema.parse(request.body);

      const result = await this.inviteService.sendInvitation(inviteId, validatedBody);

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
}