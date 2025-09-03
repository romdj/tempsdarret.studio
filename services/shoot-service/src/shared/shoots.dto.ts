/**
 * Shoot Service Data Transfer Objects
 * HTTP request/response DTOs for service endpoints
 */

// Request DTOs matching TypeSpec-generated schemas
export interface CreateShootDto {
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
}

export interface UpdateShootDto {
  title?: string;
  scheduledDate?: string;
  location?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
}

// Response DTOs
export interface ShootResponseDto {
  id: string;
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Query parameter DTO
export interface ShootQueryDto {
  photographerId?: string;
  clientEmail?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Pagination response DTO
export interface PaginatedShootsDto {
  shoots: ShootResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}