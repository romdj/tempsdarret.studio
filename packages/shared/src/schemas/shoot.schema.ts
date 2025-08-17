import { z } from 'zod';
import { TimestampsSchema, ShootIdSchema, EmailSchema } from './base.schema.js';

// Maps directly to our TypeSpec ShootStatus enum
export const ShootStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'delivered', 'archived']);

// Maps to our TypeSpec Shoot model
export const ShootSchema = z.object({
  id: ShootIdSchema,
  title: z.string().min(1).max(100),
  clientEmail: EmailSchema,
  photographerId: z.string(),
  scheduledDate: z.date().optional(),
  location: z.string().max(500).optional(),
  status: ShootStatusSchema
}).merge(TimestampsSchema);

// Maps to TypeSpec CreateShootRequest
export const CreateShootRequestSchema = z.object({
  title: z.string().min(1).max(100),
  clientEmail: EmailSchema,
  photographerId: z.string(),
  scheduledDate: z.date().optional(),
  location: z.string().max(500).optional()
});

// Maps to TypeSpec UpdateShootRequest
export const UpdateShootRequestSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  scheduledDate: z.date().optional(),
  location: z.string().max(500).optional(),
  status: ShootStatusSchema.optional()
});

// Maps to TypeSpec ShootQuery
export const ShootQuerySchema = z.object({
  photographerId: z.string().optional(),
  clientEmail: EmailSchema.optional(),
  status: ShootStatusSchema.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Type exports that match TypeSpec
export type Shoot = z.infer<typeof ShootSchema>;
export type CreateShootRequest = z.infer<typeof CreateShootRequestSchema>;
export type UpdateShootRequest = z.infer<typeof UpdateShootRequestSchema>;
export type ShootQuery = z.infer<typeof ShootQuerySchema>;
export type ShootStatus = z.infer<typeof ShootStatusSchema>;