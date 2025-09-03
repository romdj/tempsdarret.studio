// API types for user service - TypeSpec imports
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'photographer' | 'client' | 'guest';

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
  profilePictureUrl?: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  profilePictureUrl?: string;
  isActive?: boolean;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface UserResponse {
  data: User;
  message?: string;
}

export interface UserListResponse {
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}