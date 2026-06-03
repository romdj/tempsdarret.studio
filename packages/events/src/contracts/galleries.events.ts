/**
 * Gallery Event Contracts
 * Consolidated from portfolio-service TypeScript contracts.
 *
 * KEEP IN SYNC with:
 *   - services/portfolio-service/src/shared/contracts/galleries.events.ts
 *   - packages/events/scripts/generate-from-typescript.js (channels + schemas)
 */

import type { BaseEvent } from './shoots.events.js';

export interface GalleryCreatedData {
  galleryId: string;
  portfolioId: string;
  shootId?: string;
  type: string;
  createdAt: string;
}

export interface GalleryUpdatedData {
  galleryId: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}

export interface GalleryDeletedData {
  galleryId: string;
  deletedAt: string;
}

export interface GalleryImagesAddedData {
  galleryId: string;
  imageCount: number;
  fileIds: string[];
  addedAt: string;
}

export interface GalleryCreatedPayload extends BaseEvent {
  eventType: 'gallery.created';
  data: GalleryCreatedData;
}

export interface GalleryUpdatedPayload extends BaseEvent {
  eventType: 'gallery.updated';
  data: GalleryUpdatedData;
}

export interface GalleryDeletedPayload extends BaseEvent {
  eventType: 'gallery.deleted';
  data: GalleryDeletedData;
}

export interface GalleryImagesAddedPayload extends BaseEvent {
  eventType: 'gallery.images-added';
  data: GalleryImagesAddedData;
}

export type GalleryEvent =
  | GalleryCreatedPayload
  | GalleryUpdatedPayload
  | GalleryDeletedPayload
  | GalleryImagesAddedPayload;

export const GALLERY_EVENT_TYPES = {
  CREATED: 'gallery.created',
  UPDATED: 'gallery.updated',
  DELETED: 'gallery.deleted',
  IMAGES_ADDED: 'gallery.images-added',
} as const;

export type GalleryEventType =
  typeof GALLERY_EVENT_TYPES[keyof typeof GALLERY_EVENT_TYPES];
