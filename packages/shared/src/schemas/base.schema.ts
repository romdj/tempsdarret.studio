import { z } from 'zod';

// Base schemas that map to our TypeSpec common models
export const TimestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date()
});

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int()
});

export const ApiErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  details: z.string().optional()
});

export const UserRoleSchema = z.enum(['photographer', 'client', 'guest']);

// Common ID validation patterns
export const ShootIdSchema = z.string().regex(/^shoot_[a-f0-9]{32}$/, 'Invalid shoot ID format');
export const EmailSchema = z.string().email('Invalid email format');
export const UserIdSchema = z.string().min(10).max(50);

// Base model type that extends timestamps
export type BaseModel = z.infer<typeof TimestampsSchema> & {
  id: string;
};