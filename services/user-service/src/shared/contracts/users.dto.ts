import { z } from 'zod';

// Zod schemas for validation
export const UserRoleSchema = z.enum(['photographer', 'client', 'guest']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema,
  profilePictureUrl: z.string().url().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('client'),
  profilePictureUrl: z.string().url().optional()
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: UserRoleSchema.optional(),
  profilePictureUrl: z.string().url().optional(),
  isActive: z.boolean().optional()
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const UserQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional()
});
export type UserQuery = z.infer<typeof UserQuerySchema>;