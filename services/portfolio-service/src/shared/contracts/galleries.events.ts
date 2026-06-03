/**
 * Portfolio Service Event Contracts — `galleries` channel
 * Direct mapping to AsyncAPI 3.0 gallery event schemas (ADR-023).
 *
 * Source of truth for gallery.* events. The corresponding entries in
 * packages/events/src/contracts/galleries.events.ts and the generator at
 * packages/events/scripts/generate-from-typescript.js must stay aligned.
 */

import type { BaseEvent } from './portfolios.events';

// Domain payloads -----------------------------------------------------------

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

// Envelope payloads ---------------------------------------------------------

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

// Event type constants -----------------------------------------------------

export const GALLERY_EVENT_TYPES = {
  CREATED: 'gallery.created',
  UPDATED: 'gallery.updated',
  DELETED: 'gallery.deleted',
  IMAGES_ADDED: 'gallery.images-added',
} as const;

export type GalleryEventType =
  typeof GALLERY_EVENT_TYPES[keyof typeof GALLERY_EVENT_TYPES];
