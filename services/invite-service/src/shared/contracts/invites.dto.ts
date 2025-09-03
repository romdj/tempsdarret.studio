import { z } from 'zod';

// Zod schemas for validation
export const InvitationStatusSchema = z.enum(['pending', 'sent', 'expired', 'completed']);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export const InvitationSchema = z.object({
  id: z.string(),
  shootId: z.string(),
  clientEmail: z.string().email(),
  status: InvitationStatusSchema,
  sentAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const MagicLinkSchema = z.object({
  id: z.string(),
  token: z.string(),
  shootId: z.string(),
  clientEmail: z.string().email(),
  expiresAt: z.date(),
  isActive: z.boolean(),
  accessCount: z.number().int().min(0),
  usedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type MagicLink = z.infer<typeof MagicLinkSchema>;

export const CreateInvitationRequestSchema = z.object({
  shootId: z.string(),
  clientEmail: z.string().email(),
  status: InvitationStatusSchema.default('pending')
});
export type CreateInvitationRequest = z.infer<typeof CreateInvitationRequestSchema>;

export const CreateMagicLinkRequestSchema = z.object({
  token: z.string(),
  shootId: z.string(),
  clientEmail: z.string().email(),
  expiresAt: z.date(),
  isActive: z.boolean(),
  accessCount: z.number().int().min(0).default(0)
});
export type CreateMagicLinkRequest = z.infer<typeof CreateMagicLinkRequestSchema>;

export const SendInvitationRequestSchema = z.object({
  message: z.string().optional()
});
export type SendInvitationRequest = z.infer<typeof SendInvitationRequestSchema>;

export const InvitationQuerySchema = z.object({
  shootId: z.string().optional(),
  status: InvitationStatusSchema.optional(),
  clientEmail: z.string().email().optional(),
  limit: z.number().int().positive().max(100).default(20)
});
export type InvitationQuery = z.infer<typeof InvitationQuerySchema>;

export const MagicLinkGenerationRequestSchema = z.object({
  shootId: z.string(),
  email: z.string().email()
});
export type MagicLinkGenerationRequest = z.infer<typeof MagicLinkGenerationRequestSchema>;

export const MagicLinkValidationRequestSchema = z.object({
  token: z.string(),
  shootId: z.string().optional()
});
export type MagicLinkValidationRequest = z.infer<typeof MagicLinkValidationRequestSchema>;

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  clientEmail: z.string().email(),
  shootId: z.string(),
  accessToken: z.string(),
  expiresIn: z.number().int().positive()
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;