import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller';

export function registerUserRoutes(fastify: FastifyInstance, controller: UserController) {
  // Health check
  fastify.get('/health', controller.healthCheck.bind(controller));
  
  // User CRUD operations (matches TypeSpec UserOperations)
  fastify.post('/users', controller.createUser.bind(controller));
  fastify.get('/users', controller.listUsers.bind(controller));
  fastify.get('/users/:userId', controller.getUser.bind(controller));
  fastify.patch('/users/:userId', controller.updateUser.bind(controller));
  fastify.delete('/users/:userId', controller.deactivateUser.bind(controller));
}