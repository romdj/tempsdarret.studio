import { FastifyInstance } from 'fastify';
import { UserHandlers } from './user.handlers';

export function registerUserRoutes(fastify: FastifyInstance, handlers: UserHandlers): void {
  // Health check
  fastify.get('/health', handlers.healthCheck.bind(handlers));

  // User CRUD operations
  fastify.post('/users', handlers.createUser.bind(handlers));
  fastify.get('/users', handlers.listUsers.bind(handlers));
  fastify.get('/users/:userId', handlers.getUser.bind(handlers));
  fastify.patch('/users/:userId', handlers.updateUser.bind(handlers));
  fastify.delete('/users/:userId', handlers.deactivateUser.bind(handlers));
}