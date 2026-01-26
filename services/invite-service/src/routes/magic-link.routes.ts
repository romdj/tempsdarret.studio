import { FastifyInstance } from 'fastify';
import { MagicLinkController } from '../features/magic-links/controllers/magic-link.controller';

interface DIContainer {
  resolve<T>(name: string): T;
}

interface FastifyWithDI extends FastifyInstance {
  diContainer: DIContainer;
}

export async function magicLinkRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = (fastify as FastifyWithDI).diContainer.resolve<MagicLinkController>('magicLinkController');

  // TypeSpec MagicLinkOperations interface implementation (ADR-003)
  fastify.get('/magic-links/:token', controller.validateMagicLink.bind(controller));
  fastify.post('/magic-links/:token/access', controller.recordAccess.bind(controller));
}