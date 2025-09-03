import { FastifyInstance } from 'fastify';
import { ShootHandlers } from './shoot.handlers';

export function registerShootRoutes(fastify: FastifyInstance, handlers: ShootHandlers) {
  // Health check
  fastify.get('/health', handlers.healthCheck.bind(handlers));
  
  // Shoot CRUD operations (matches our TypeSpec API)
  fastify.post('/shoots', handlers.createShoot.bind(handlers));
  fastify.get('/shoots', handlers.listShoots.bind(handlers));
  fastify.get('/shoots/:shootId', handlers.getShoot.bind(handlers));
  fastify.patch('/shoots/:shootId', handlers.updateShoot.bind(handlers));
  fastify.delete('/shoots/:shootId', handlers.deleteShoot.bind(handlers));
}