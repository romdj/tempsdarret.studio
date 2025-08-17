import { FastifyInstance } from 'fastify';
import { ShootController } from '../controllers/shoot.controller';

export function registerShootRoutes(fastify: FastifyInstance, controller: ShootController) {
  // Health check
  fastify.get('/health', controller.healthCheck.bind(controller));
  
  // Shoot CRUD operations (matches our TypeSpec API)
  fastify.post('/shoots', controller.createShoot.bind(controller));
  fastify.get('/shoots', controller.listShoots.bind(controller));
  fastify.get('/shoots/:shootId', controller.getShoot.bind(controller));
  fastify.patch('/shoots/:shootId', controller.updateShoot.bind(controller));
  fastify.delete('/shoots/:shootId', controller.deleteShoot.bind(controller));
}