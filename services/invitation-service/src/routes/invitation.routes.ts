import { FastifyInstance } from 'fastify';
import { InvitationController } from '../features/invitations/controllers/invitation.controller';

interface DIContainer {
  resolve<T>(name: string): T;
}

interface FastifyWithDI extends FastifyInstance {
  diContainer: DIContainer;
}

export async function invitationRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = (fastify as FastifyWithDI).diContainer.resolve<InvitationController>('invitationController');

  // TypeSpec InvitationOperations interface implementation
  fastify.post('/invitations', controller.createInvitation.bind(controller));
  fastify.get('/invitations', controller.listInvitations.bind(controller));
  fastify.get('/invitations/:invitationId', controller.getInvitation.bind(controller));
  fastify.post('/invitations/:invitationId/send', controller.sendInvitation.bind(controller));
  fastify.post('/invitations/:invitationId/resend', controller.resendInvitation.bind(controller));
  fastify.delete('/invitations/:invitationId', controller.revokeInvitation.bind(controller));
}