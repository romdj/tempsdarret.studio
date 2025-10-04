import { FastifyInstance } from 'fastify';
import { InvitationHandlers } from './invitation.handlers';

export function registerInvitationRoutes(fastify: FastifyInstance, handlers: InvitationHandlers): void {
  // Invitation CRUD operations
  fastify.post('/invitations', handlers.createInvitation.bind(handlers));
  fastify.get('/invitations', handlers.listInvitations.bind(handlers));
  fastify.get('/invitations/:inviteId', handlers.getInvitation.bind(handlers));
  fastify.post('/invitations/:inviteId/send', handlers.sendInvitation.bind(handlers));
}