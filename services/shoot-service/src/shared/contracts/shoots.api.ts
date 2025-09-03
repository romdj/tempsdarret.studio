/**
 * Shoot Service API Contracts
 * Direct imports from TypeSpec-generated shared schemas
 */

// Import TypeSpec-derived types from shared package
import { 
  CreateShootRequest,
  UpdateShootRequest, 
  ShootQuery,
  Shoot,
  ShootStatus
} from '@tempsdarret/shared/schemas/shoot.schema';

// Re-export TypeSpec-derived types for service use
export type { CreateShootRequest, UpdateShootRequest, ShootQuery, Shoot, ShootStatus };

// Service-specific response wrappers (not in TypeSpec, service implementation detail)
export interface PaginatedShootsResponse {
  shoots: Shoot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API response wrappers matching TypeSpec SuccessResponse/ApiError patterns
export interface ShootApiError {
  success: false;
  error: string;
  details?: Record<string, any>;
}

export interface ShootApiSuccess<T = any> {
  success: true;
  data: T;
}

export type ShootApiResponse<T = any> = ShootApiSuccess<T> | ShootApiError;

// TypeSpec operation return types
export type CreateShootResponse = ShootApiSuccess<Shoot> | ShootApiError;
export type GetShootResponse = ShootApiSuccess<Shoot> | ShootApiError;
export type UpdateShootResponse = ShootApiSuccess<Shoot> | ShootApiError;
export type ListShootsResponse = ShootApiSuccess<PaginatedShootsResponse> | ShootApiError;
export type ArchiveShootResponse = ShootApiSuccess<Shoot> | ShootApiError;