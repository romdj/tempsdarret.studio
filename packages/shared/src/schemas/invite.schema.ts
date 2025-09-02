import { z } from 'zod';
import { TimestampsSchema, EmailSchema } from './base.schema.js';

// Maps to TypeSpec InvitationStatus enum
export const InvitationStatusSchema = z.enum([
  'pending', 
  'sent', 
  'viewed', 
  'accepted', 
  'expired', 
  'revoked'
]);

// Maps to TypeSpec MagicLink model
export const MagicLinkSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Token must be 64 character hex string'),
  shootId: z.string(),
  clientEmail: EmailSchema,
  expiresAt: z.date(),
  accessCount: z.number().int().default(0),
  lastAccessedAt: z.date().optional(),
  isActive: z.boolean().default(true)
}).merge(TimestampsSchema);

// Maps to TypeSpec Invitation model  
export const InvitationSchema = z.object({
  id: z.string(),
  shootId: z.string(),
  clientEmail: EmailSchema,
  status: InvitationStatusSchema,
  magicLinkToken: z.string(),
  sentAt: z.date().optional(),
  viewedAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  message: z.string().max(1000).optional()
}).merge(TimestampsSchema);

// Maps to TypeSpec CreateInvitationRequest
export const CreateInvitationRequestSchema = z.object({
  shootId: z.string(),
  clientEmail: EmailSchema,
  message: z.string().max(1000).optional()
});

// Maps to TypeSpec SendInvitationRequest  
export const SendInvitationRequestSchema = z.object({
  subject: z.string().max(200).optional(),
  templateVars: z.record(z.any()).optional()
});

// Maps to TypeSpec InvitationQuery
export const InvitationQuerySchema = z.object({
  shootId: z.string().optional(),
  clientEmail: EmailSchema.optional(),
  status: InvitationStatusSchema.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// ADR-003 Magic Link Authentication schemas
export const MagicLinkGenerationRequestSchema = z.object({
  email: EmailSchema,
  shootId: z.string()
});

export const MagicLinkValidationRequestSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid magic link token format'),
  shootId: z.string().optional()
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.number().int(), // seconds
  user: z.object({
    id: z.string(),
    email: EmailSchema,
    role: z.enum(['photographer', 'client', 'guest']),
    shootId: z.string().optional()
  })
});

export const JWTPayloadSchema = z.object({
  userId: z.string(),
  email: EmailSchema,
  role: z.enum(['photographer', 'client', 'guest']),
  shootId: z.string().optional(),
  invitationId: z.string().optional(),
  iat: z.number().int(),
  exp: z.number().int()
});

// Type exports matching TypeSpec models
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type MagicLink = z.infer<typeof MagicLinkSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
export type CreateInvitationRequest = z.infer<typeof CreateInvitationRequestSchema>;
export type SendInvitationRequest = z.infer<typeof SendInvitationRequestSchema>;
export type InvitationQuery = z.infer<typeof InvitationQuerySchema>;

// ADR-003 types
export type MagicLinkGenerationRequest = z.infer<typeof MagicLinkGenerationRequestSchema>;
export type MagicLinkValidationRequest = z.infer<typeof MagicLinkValidationRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;