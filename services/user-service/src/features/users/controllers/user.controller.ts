import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { 
  CreateUserRequestSchema, 
  UpdateUserRequestSchema, 
  UserQuerySchema,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery
} from '@tempsdarret/shared/schemas/user.schema';

interface UserParams {
  userId: string;
}

export class UserController {
  constructor(private userService: UserService) {}

  // Health check endpoint
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString()
    });
  }

  // POST /users - Create user (TypeSpec UserOperations.createUser)
  async createUser(
    request: FastifyRequest<{ Body: CreateUserRequest }>, 
    reply: FastifyReply
  ) {
    try {
      // Validate request body against schema
      const validatedData = CreateUserRequestSchema.parse(request.body);
      
      const user = await this.userService.createUser(validatedData);
      
      return reply.code(201).send({
        data: user,
        message: 'User created successfully'
      });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return reply.code(409).send({
          error: 'Conflict',
          message: error.message,
          statusCode: 409
        });
      }
      
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
          statusCode: 400
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
        statusCode: 500
      });
    }
  }

  // GET /users - List users (TypeSpec UserOperations.listUsers)
  async listUsers(
    request: FastifyRequest<{ Querystring: UserQuery }>, 
    reply: FastifyReply
  ) {
    try {
      // Validate and parse query parameters
      const validatedQuery = UserQuerySchema.parse(request.query);
      
      const result = await this.userService.listUsers(validatedQuery);
      
      return reply.code(200).send({
        data: result.users,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors,
          statusCode: 400
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
        statusCode: 500
      });
    }
  }

  // GET /users/:userId - Get user by ID (TypeSpec UserOperations.getUser)
  async getUser(
    request: FastifyRequest<{ Params: UserParams }>, 
    reply: FastifyReply
  ) {
    try {
      const { userId } = request.params;
      const user = await this.userService.getUser(userId);
      
      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
          statusCode: 404
        });
      }
      
      return reply.code(200).send({
        data: user
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
        statusCode: 500
      });
    }
  }

  // PATCH /users/:userId - Update user (TypeSpec UserOperations.updateUser)
  async updateUser(
    request: FastifyRequest<{ Params: UserParams; Body: UpdateUserRequest }>, 
    reply: FastifyReply
  ) {
    try {
      const { userId } = request.params;
      const validatedData = UpdateUserRequestSchema.parse(request.body);
      
      const user = await this.userService.updateUser(userId, validatedData);
      
      return reply.code(200).send({
        data: user,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          statusCode: 404
        });
      }
      
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
          statusCode: 400
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
        statusCode: 500
      });
    }
  }

  // DELETE /users/:userId - Deactivate user (TypeSpec UserOperations.deactivateUser)
  async deactivateUser(
    request: FastifyRequest<{ Params: UserParams }>, 
    reply: FastifyReply
  ) {
    try {
      const { userId } = request.params;
      const user = await this.userService.deactivateUser(userId);
      
      return reply.code(200).send({
        data: user,
        message: 'User deactivated successfully'
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          statusCode: 404
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
        statusCode: 500
      });
    }
  }
}