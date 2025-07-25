import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User.js';
import { 
  validateEmail, 
  validatePagination,
  type ApiResponse,
  type PaginatedResponse,
  type UserRole 
} from '@tempsdarret/shared';

// Request schemas
const UpdateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.boolean().optional(),
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['photographer', 'client', 'admin']).optional(),
});

const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(['photographer', 'client', 'admin']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

type UpdateUserBody = z.infer<typeof UpdateUserSchema>;
type CreateUserBody = z.infer<typeof CreateUserSchema>;
type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;

export async function userRoutes(fastify: FastifyInstance) {

  // Get all users (admin only)
  fastify.get<{ Querystring: GetUsersQuery }>('/users', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (
    request: FastifyRequest<{ Querystring: GetUsersQuery }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PaginatedResponse<any>>> => {
    try {
      const validation = GetUsersQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.issues
          }
        });
      }

      const { page, limit, role, isActive, search } = validation.data;

      // Build query
      const query: any = {};
      
      if (role) {
        query.role = role;
      }
      
      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      }
      
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ];
      }

      // Get total count
      const total = await User.countDocuments(query);
      
      // Get paginated results
      const users = await User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: {
          items: users,
          total,
          page,
          limit,
          totalPages,
        }
      });

    } catch (error) {
      fastify.log.error('Error fetching users:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  });

  // Get user by ID
  fastify.get<{ Params: { userId: string } }>('/users/:userId', {
    preHandler: [fastify.authenticate]
  }, async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.params;

      // Users can view their own profile, admins can view anyone
      if (request.user!.role !== 'admin' && request.user!.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      const user = await User.findById(userId).select('-__v');
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      return reply.send({
        success: true,
        data: user
      });

    } catch (error) {
      fastify.log.error('Error fetching user:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user'
        }
      });
    }
  });

  // Create user (admin only)
  fastify.post<{ Body: CreateUserBody }>('/users', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ) => {
    try {
      const validation = CreateUserSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const { email, firstName, lastName, role = 'client' } = validation.data;

      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: emailValidation.errors[0]
          }
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }

      // Create user
      const user = new User({
        email,
        firstName,
        lastName,
        role,
        isActive: true,
      });

      await user.save();

      return reply.status(201).send({
        success: true,
        data: user
      });

    } catch (error) {
      fastify.log.error('Error creating user:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user'
        }
      });
    }
  });

  // Update user
  fastify.put<{ 
    Params: { userId: string };
    Body: UpdateUserBody;
  }>('/users/:userId', {
    preHandler: [fastify.authenticate]
  }, async (
    request: FastifyRequest<{ 
      Params: { userId: string };
      Body: UpdateUserBody;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.params;
      
      // Users can update their own profile, admins can update anyone
      if (request.user!.role !== 'admin' && request.user!.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      const validation = UpdateUserSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues
          }
        });
      }

      const updates = validation.data;

      // Non-admin users cannot change isActive status
      if (request.user!.role !== 'admin' && 'isActive' in updates) {
        delete updates.isActive;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-__v');

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      return reply.send({
        success: true,
        data: user
      });

    } catch (error) {
      fastify.log.error('Error updating user:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user'
        }
      });
    }
  });

  // Delete user (admin only)
  fastify.delete<{ Params: { userId: string } }>('/users/:userId', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.params;

      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          message: 'User deleted successfully'
        }
      });

    } catch (error) {
      fastify.log.error('Error deleting user:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user'
        }
      });
    }
  });
}