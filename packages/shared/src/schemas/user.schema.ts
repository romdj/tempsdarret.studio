import { z } from 'zod';
import { TimestampsSchema, EmailSchema } from './base.schema.js';

// Maps directly to TypeSpec UserRole enum from common.tsp
export const UserRoleSchema = z.enum(['photographer', 'client', 'guest']);

// Maps to TypeSpec User model from user-service.tsp
export const UserSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema,
  profilePictureUrl: z.string().url().optional(),
  isActive: z.boolean().default(true)
}).merge(TimestampsSchema);

// Maps to TypeSpec CreateUserRequest from user-service.tsp
export const CreateUserRequestSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema,
  profilePictureUrl: z.string().url().optional()
});

// Maps to TypeSpec UpdateUserRequest from user-service.tsp
export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profilePictureUrl: z.string().url().optional(),
  isActive: z.boolean().optional()
});

// Maps to TypeSpec UserQuery from user-service.tsp
export const UserQuerySchema = z.object({
  role: UserRoleSchema.optional(),
  // HTTP query strings arrive as 'true'/'false'; map them to booleans while
  // still accepting genuine booleans from in-process callers.
  isActive: z
    .preprocess(
      (value) => (value === 'true' ? true : value === 'false' ? false : value),
      z.boolean().optional()
    ),
  search: z.string().optional(), // Search by name or email
  // Coerced because HTTP query parameters always arrive as strings.
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Note: Magic link authentication schemas are handled by invitation-service
// per sequence diagram and ADR-003

// Type exports that match TypeSpec models
export type User = z.infer<typeof UserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

// Magic link authentication types are in invite service schemas