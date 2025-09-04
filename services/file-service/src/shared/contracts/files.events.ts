/**
 * File Service Event Contracts
 * Direct mapping to AsyncAPI 3.0 file event schemas
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

// File event data structures mapping to AsyncAPI schemas
export interface FileUploadedData {
  fileId: string;
  originalName: string;
  shootId: string;
  size: number;
  mimeType: string;
  storagePath: string;
  fileType: 'jpeg' | 'png' | 'raw' | 'video';
  uploadedAt: string;
}

export interface FileProcessedData {
  fileId: string;
  processingStatus: 'completed' | 'failed';
  processingDetails?: {
    thumbnailGenerated?: boolean;
    metadataExtracted?: boolean;
    errorMessage?: string;
  };
  processedAt: string;
}

export interface FileDeletedData {
  fileId: string;
  shootId: string;
  originalName: string;
  deletedAt: string;
  cleanupStatus: 'completed' | 'pending';
}

export interface ArchiveCreatedData {
  archiveId: string;
  shootId: string;
  archiveType: 'jpeg' | 'raw' | 'complete';
  fileCount: number;
  estimatedSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface ArchiveReadyData {
  archiveId: string;
  shootId: string;
  finalSize: number;
  downloadUrl: string;
  expiresAt: string;
  readyAt: string;
}

// Complete event payload types matching AsyncAPI definitions
export interface FileUploadedPayload extends BaseEvent {
  eventType: 'file.uploaded';
  data: FileUploadedData;
}

export interface FileProcessedPayload extends BaseEvent {
  eventType: 'file.processed';
  data: FileProcessedData;
}

export interface FileDeletedPayload extends BaseEvent {
  eventType: 'file.deleted';
  data: FileDeletedData;
}

export interface ArchiveCreatedPayload extends BaseEvent {
  eventType: 'archive.created';
  data: ArchiveCreatedData;
}

export interface ArchiveReadyPayload extends BaseEvent {
  eventType: 'archive.ready';
  data: ArchiveReadyData;
}

// Union type for all file events
export type FileEvent = 
  | FileUploadedPayload 
  | FileProcessedPayload 
  | FileDeletedPayload 
  | ArchiveCreatedPayload 
  | ArchiveReadyPayload;

// Event type constants for type safety
export const FILE_EVENT_TYPES = {
  UPLOADED: 'file.uploaded',
  PROCESSED: 'file.processed',
  DELETED: 'file.deleted',
  ARCHIVE_CREATED: 'archive.created',
  ARCHIVE_READY: 'archive.ready',
} as const;

export type FileEventType = typeof FILE_EVENT_TYPES[keyof typeof FILE_EVENT_TYPES];