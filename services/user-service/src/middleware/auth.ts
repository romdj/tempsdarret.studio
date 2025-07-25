import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJWT, extractTokenFromHeader, isTokenExpired, type JWTPayload } from '../utils/auth.js';
import { UserRole } from '@tempsdarret/shared';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export const authenticateUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const token = extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required'
        }
      });
    }

    const payload = verifyJWT(token);
    
    if (isTokenExpired(payload.iat)) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }

    request.user = payload;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      }
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Role ${request.user.role} not authorized for this action`
        }
      });
    }
  };
};

export const requireAdmin = requireRole(['admin']);
export const requirePhotographer = requireRole(['photographer', 'admin']);
export const requireClientOrAdmin = requireRole(['client', 'admin']);

export const requireShootAccess = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  const shootId = (request.params as any).shootId || request.user.shootId;
  
  if (!shootId) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MISSING_SHOOT_ID',
        message: 'Shoot ID is required'
      }
    });
  }

  // Admin and photographer have access to all shoots
  if (['admin', 'photographer'].includes(request.user.role)) {
    return;
  }

  // Clients can only access their assigned shoots
  if (request.user.role === 'client' && request.user.shootId !== shootId) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'SHOOT_ACCESS_DENIED',
        message: 'Access denied to this shoot'
      }
    });
  }
};