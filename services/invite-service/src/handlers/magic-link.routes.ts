import { FastifyInstance } from 'fastify';
import { MagicLinkHandlers } from './magic-link.handlers';

export function registerMagicLinkRoutes(fastify: FastifyInstance, handlers: MagicLinkHandlers) {
  // Health check
  fastify.get('/health', handlers.healthCheck.bind(handlers));
  
  // Magic link validation
  fastify.get('/magic-link/:token', handlers.validateMagicLink.bind(handlers));
}