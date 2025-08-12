import { FastifyInstance } from 'fastify';
import { ShootController } from '../controllers/shoot.controller';

export function registerShootRoutes(fastify: FastifyInstance, controller: ShootController) {
  // Health check
  fastify.get('/health', controller.healthCheck.bind(controller));
  
  // Create shoot
  fastify.post('/shoots', controller.createShoot.bind(controller));
}