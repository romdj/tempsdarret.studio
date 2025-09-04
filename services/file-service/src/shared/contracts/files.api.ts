/**
 * File Service API Contracts
 * Based on file-service.tsp TypeSpec definitions
 */

// File type enumeration matching TypeSpec + sidecar files
export type FileType = 'jpeg' | 'png' | 'raw' | 'video' | 'sidecar' | 'config';

// Processing status enumeration
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Archive type enumeration
export type ArchiveType = 'jpeg' | 'raw' | 'complete';

// Core file model
export interface FileModel {
  id: string;
  filename: string;
  type: FileType;
  size: number;
  mimeType: string;
  shootId: string;
  storagePath: string;
  publicUrl?: string;
  thumbnailUrl?: string;
  processingStatus: ProcessingStatus;
  metadata?: Record<string, unknown>;
  tags?: string[];
  // Sidecar/config files - only photographers have access
  photographerOnly?: boolean;
  parentFileId?: string; // Link to the main RAW file for sidecars
  sidecarType?: 'xmp' | 'psd' | 'psb' | 'cos' | 'col' | 'afphoto' | 'xcf';
  createdAt: string;
  updatedAt: string;
}

// File upload request
export interface FileUploadRequest {
  shootId: string;
  tags?: string[];
}

// File query parameters
export interface FileQuery {
  shootId?: string;
  type?: FileType;
  processingStatus?: ProcessingStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}

// Archive models
export interface CreateArchiveRequest {
  shootId: string;
  type: ArchiveType;
  fileIds?: string[];
}

export interface ArchiveModel {
  id: string;
  shootId: string;
  type: ArchiveType;
  size: number;
  downloadUrl: string;
  expiresAt: string;
  status: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
}

// Response wrappers
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Download response metadata (headers will be set separately)
export interface FileDownloadMeta {
  contentType: string;
  contentLength: number;
  filename: string;
  supportsRanges: boolean;
}

export interface ArchiveDownloadMeta {
  contentType: 'application/zip';
  contentLength: number;
  filename: string;
  supportsRanges: boolean;
}