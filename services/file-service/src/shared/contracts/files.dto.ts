/**
 * File Service Data Transfer Objects
 * Input/Output transformations and validation schemas
 */

import { FileModel, FileType, ProcessingStatus } from './files.api.js';

// File creation DTO (internal)
export interface CreateFileDTO {
  originalName: string;
  shootId: string;
  size: number;
  mimeType: string;
  storagePath: string;
  type: FileType;
  tags?: string[];
  metadata?: Record<string, unknown>;
  photographerOnly?: boolean;
  parentFileId?: string;
  sidecarType?: 'xmp' | 'psd' | 'psb' | 'cos' | 'col' | 'afphoto' | 'xcf';
}

// File update DTO
export interface UpdateFileDTO {
  filename?: string;
  processingStatus?: ProcessingStatus;
  publicUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// File processing DTO (internal)
export interface ProcessFileDTO {
  fileId: string;
  processingType: 'thumbnail' | 'metadata' | 'validation';
  processingData?: Record<string, unknown>;
}

// Archive creation DTO (internal)
export interface CreateArchiveDTO {
  shootId: string;
  type: 'jpeg' | 'raw' | 'complete';
  fileIds: string[];
  estimatedSize: number;
}

// File metadata DTO (extracted from files)
export interface FileMetadataDTO {
  exif?: {
    camera?: string;
    lens?: string;
    focalLength?: number;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    dateTaken?: string;
    gpsLocation?: {
      latitude: number;
      longitude: number;
    };
  };
  technical?: {
    width?: number;
    height?: number;
    colorSpace?: string;
    bitDepth?: number;
    compression?: string;
  };
  processing?: {
    thumbnailGenerated: boolean;
    metadataExtracted: boolean;
    processingTime: number;
    processingErrors?: string[];
  };
}

// File statistics DTO (for monitoring)
export interface FileStatsDTO {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<FileType, number>;
  filesByStatus: Record<ProcessingStatus, number>;
  averageFileSize: number;
  storageUtilization: number;
}

// Validation functions for DTOs
export function validateCreateFileDTO(dto: Partial<CreateFileDTO>): dto is CreateFileDTO {
  return (
    typeof dto.originalName === 'string' &&
    typeof dto.shootId === 'string' &&
    typeof dto.size === 'number' &&
    dto.size > 0 &&
    typeof dto.mimeType === 'string' &&
    typeof dto.storagePath === 'string' &&
    ['jpeg', 'png', 'raw', 'video'].includes(dto.type as FileType)
  );
}

export function validateUpdateFileDTO(dto: Partial<UpdateFileDTO>): boolean {
  // All fields are optional, just validate types if present
  if (dto.filename && typeof dto.filename !== 'string') {return false;}
  if (dto.processingStatus && !['pending', 'processing', 'completed', 'failed'].includes(dto.processingStatus)) {return false;}
  if (dto.publicUrl && typeof dto.publicUrl !== 'string') {return false;}
  if (dto.thumbnailUrl && typeof dto.thumbnailUrl !== 'string') {return false;}
  if (dto.metadata && typeof dto.metadata !== 'object') {return false;}
  if (dto.tags && !Array.isArray(dto.tags)) {return false;}
  
  return true;
}

// Transform functions
export function toFileModel(dto: CreateFileDTO, id: string): FileModel {
  return {
    id,
    filename: dto.originalName,
    type: dto.type,
    size: dto.size,
    mimeType: dto.mimeType,
    shootId: dto.shootId,
    storagePath: dto.storagePath,
    processingStatus: 'pending',
    tags: dto.tags,
    metadata: dto.metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function applyFileUpdate(file: FileModel, update: UpdateFileDTO): FileModel {
  return {
    ...file,
    ...(update.filename && { filename: update.filename }),
    ...(update.processingStatus && { processingStatus: update.processingStatus }),
    ...(update.publicUrl && { publicUrl: update.publicUrl }),
    ...(update.thumbnailUrl && { thumbnailUrl: update.thumbnailUrl }),
    ...(update.metadata && { metadata: { ...file.metadata, ...update.metadata } }),
    ...(update.tags && { tags: update.tags }),
    updatedAt: new Date().toISOString(),
  };
}