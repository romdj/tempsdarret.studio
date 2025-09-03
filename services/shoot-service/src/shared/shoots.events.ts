/**
 * Shoot Service Event Contracts
 * Direct mapping to AsyncAPI 3.0 shoot event schemas
 */

// Base event structure per ADR-023 AsyncAPI specification
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
}

// Shoot event data structures mapping to AsyncAPI schemas
export interface ShootCreatedData {
  shootId: string;
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
  status: 'planned';
  createdAt: string;
}

export interface ShootUpdatedData {
  shootId: string;
  title?: string;
  scheduledDate?: string;
  location?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
  updatedAt: string;
}

export interface ShootCompletedData {
  shootId: string;
  completedAt: string;
  totalPhotos: number;
  totalSizeMB: number;
  photographerId: string;
}

export interface ShootDeliveredData {
  shootId: string;
  clientEmail: string;
  deliveredAt: string;
  deliveryMethod: 'gallery_link' | 'download_archive' | 'physical_media';
  archiveSize?: number;
  expiresAt?: string;
}

// Complete event payload types matching AsyncAPI definitions
export interface ShootCreatedPayload extends BaseEvent {
  eventType: 'shoot.created';
  data: ShootCreatedData;
}

export interface ShootUpdatedPayload extends BaseEvent {
  eventType: 'shoot.updated';
  data: ShootUpdatedData;
}

export interface ShootCompletedPayload extends BaseEvent {
  eventType: 'shoot.completed';
  data: ShootCompletedData;
}

export interface ShootDeliveredPayload extends BaseEvent {
  eventType: 'shoot.delivered';
  data: ShootDeliveredData;
}

// Union type for all shoot events
export type ShootEvent = 
  | ShootCreatedPayload 
  | ShootUpdatedPayload 
  | ShootCompletedPayload 
  | ShootDeliveredPayload;

// Event type constants for type safety
export const SHOOT_EVENT_TYPES = {
  CREATED: 'shoot.created',
  UPDATED: 'shoot.updated',
  COMPLETED: 'shoot.completed',
  DELIVERED: 'shoot.delivered',
} as const;

export type ShootEventType = typeof SHOOT_EVENT_TYPES[keyof typeof SHOOT_EVENT_TYPES];