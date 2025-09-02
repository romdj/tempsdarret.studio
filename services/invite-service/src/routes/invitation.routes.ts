import { FastifyInstance } from 'fastify';
import { InvitationController } from '../features/invitations/controllers/invitation.controller';

export async function invitationRoutes(fastify: FastifyInstance) {
  const controller = fastify.diContainer.resolve<InvitationController>('invitationController');

  // TypeSpec InvitationOperations interface implementation
  fastify.post('/invitations', controller.createInvitation.bind(controller));
  fastify.get('/invitations', controller.listInvitations.bind(controller));
  fastify.get('/invitations/:invitationId', controller.getInvitation.bind(controller));
  fastify.post('/invitations/:invitationId/send', controller.sendInvitation.bind(controller));
  fastify.post('/invitations/:invitationId/resend', controller.resendInvitation.bind(controller));
  fastify.delete('/invitations/:invitationId', controller.revokeInvitation.bind(controller));
}