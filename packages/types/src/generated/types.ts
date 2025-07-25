// This file will be auto-generated from TypeSpec models
// Placeholder for now

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}

export enum UserRole {
  PHOTOGRAPHER = "photographer",
  CLIENT = "client", 
  ADMIN = "admin",
}

export interface Shoot extends BaseEntity {
  title: string;
  description?: string;
  clientId: string;
  photographerId: string;
  scheduledDate?: Date;
  status: ShootStatus;
  location?: string;
  totalPhotos?: number;
  archiveSize?: number;
}

export enum ShootStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed", 
  DELIVERED = "delivered",
  ARCHIVED = "archived",
}