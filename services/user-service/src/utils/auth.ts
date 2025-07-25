import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  generateMagicLinkToken, 
  addMinutes, 
  MAGIC_LINK_CONFIG,
  type MagicLinkPayload,
  type UserRole 
} from '@tempsdarret/shared';
import { getConfig } from '@tempsdarret/shared';

const config = getConfig();

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  shootId?: string;
}

export const generateJWT = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
};

export const verifyJWT = (token: string): JWTPayload => {
  return jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
};

export const generateMagicLink = (email: string, shootId?: string): { 
  token: string; 
  expiresAt: Date 
} => {
  const token = generateMagicLinkToken();
  const expiresAt = addMinutes(new Date(), MAGIC_LINK_CONFIG.EXPIRES_IN_MINUTES);
  
  return { token, expiresAt };
};

export const createMagicLinkUrl = (token: string, baseUrl: string, shootId?: string): string => {
  const url = new URL('/auth/magic-link', baseUrl);
  url.searchParams.set('token', token);
  
  if (shootId) {
    url.searchParams.set('shootId', shootId);
  }
  
  return url.toString();
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  
  return token;
};

export const isTokenExpired = (exp: number): boolean => {
  return Date.now() >= exp * 1000;
};