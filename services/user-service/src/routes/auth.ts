import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User.js';
import { MagicLink } from '../models/MagicLink.js';
import { 
  generateMagicLink, 
  createMagicLinkUrl, 
  generateJWT,
  verifyJWT 
} from '../utils/auth.js';
import { 
  validateEmail, 
  validateMagicLinkToken,
  isExpired,
  type ApiResponse 
} from '@tempsdarret/shared';

// Request schemas
const RequestMagicLinkSchema = z.object({
  email: z.string().email(),
  shootId: z.string().optional(),
});

const ValidateMagicLinkSchema = z.object({
  token: z.string().length(64),
  shootId: z.string().optional(),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

type RequestMagicLinkBody = z.infer<typeof RequestMagicLinkSchema>;
type ValidateMagicLinkBody = z.infer<typeof ValidateMagicLinkSchema>;

export async function authRoutes(fastify: FastifyInstance) {
  
  // Request magic link
  fastify.post<{ Body: RequestMagicLinkBody }>('/auth/request-magic-link', async (
    request: FastifyRequest<{ Body: RequestMagicLinkBody }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ message: string }>> => {
    try {
      const validation = RequestMagicLinkSchema.safeParse(request.body);
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

      const { email, shootId } = validation.data;

      // Validate email format
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

      // Check rate limiting - max 3 requests per hour per email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLinks = await MagicLink.countDocuments({
        email,
        createdAt: { $gte: oneHourAgo }
      });

      if (recentLinks >= 3) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many magic link requests. Please try again later.'
          }
        });
      }

      // Find or create user
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          email,
          role: 'client',
          isActive: true,
        });
        await user.save();
      }

      // Generate magic link
      const { token, expiresAt } = generateMagicLink(email, shootId);

      // Save magic link to database
      const magicLink = new MagicLink({
        email,
        token,
        shootId,
        userId: user.id,
        expiresAt,
      });
      await magicLink.save();

      // TODO: Send email with magic link
      // For now, we'll just return success
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const magicLinkUrl = createMagicLinkUrl(token, baseUrl, shootId);
      
      fastify.log.info(`Magic link generated for ${email}: ${magicLinkUrl}`);

      return reply.send({
        success: true,
        data: {
          message: 'Magic link sent to your email address'
        }
      });

    } catch (error) {
      fastify.log.error('Error requesting magic link:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate magic link'
        }
      });
    }
  });

  // Validate magic link and authenticate
  fastify.post<{ Body: ValidateMagicLinkBody }>('/auth/magic-link', async (
    request: FastifyRequest<{ Body: ValidateMagicLinkBody }>,
    reply: FastifyReply
  ) => {
    try {
      const validation = ValidateMagicLinkSchema.safeParse(request.body);
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

      const { token } = validation.data;

      // Find magic link
      const magicLink = await MagicLink.findOne({ token, isUsed: false });
      
      if (!magicLink) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired magic link'
          }
        });
      }

      // Check expiration
      if (isExpired(magicLink.expiresAt)) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Magic link has expired'
          }
        });
      }

      // Find user
      const user = await User.findById(magicLink.userId);
      if (!user || !user.isActive) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found or inactive'
          }
        });
      }

      // Mark magic link as used
      magicLink.isUsed = true;
      magicLink.usedAt = new Date();
      await magicLink.save();

      // Update user last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate JWT
      const jwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        shootId: magicLink.shootId,
      };
      
      const accessToken = generateJWT(jwtPayload);

      return reply.send({
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            shootId: magicLink.shootId,
          }
        }
      });

    } catch (error) {
      fastify.log.error('Error validating magic link:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to authenticate with magic link'
        }
      });
    }
  });

  // Get current user profile
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await User.findById(request.user!.userId);
      
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
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        }
      });

    } catch (error) {
      fastify.log.error('Error fetching user profile:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user profile'
        }
      });
    }
  });

  // Logout (invalidate token - client-side for JWT)
  fastify.post('/auth/logout', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // For JWT tokens, logout is primarily client-side
    // We could maintain a blacklist, but for now, simple response
    return reply.send({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  });
}