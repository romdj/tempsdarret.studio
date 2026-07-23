// Single source of truth: the canonical user schemas live in the shared package
// (derived from TypeSpec). Re-exported here so the rest of the service can keep
// importing from a local contract module without duplicating validation rules.
export {
  UserRoleSchema,
  UserSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserQuerySchema
} from '@tempsdarret/shared/schemas/user.schema';

export type {
  UserRole,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery
} from '@tempsdarret/shared/schemas/user.schema';
