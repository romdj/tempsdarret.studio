/**
 * File Service
 * Core business logic for file operations
 */

/* global NodeJS */

import { Model } from 'mongoose';
import { StorageService, FileStats } from './StorageService.js';
import { ProcessingService } from './ProcessingService.js';
import { EventEmitter } from './EventEmitter.js';
import { 
  FileModel, 
  FileQuery,
  FileType,
  ProcessingStatus 
} from '../shared/contracts/files.api.js';
import {
  CreateFileDTO,
  UpdateFileDTO,
  validateCreateFileDTO,
  validateUpdateFileDTO,
  applyFileUpdate
} from '../shared/contracts/files.dto.js';
import { 
  FileDocument, 
  transformFileDocument 
} from '../shared/contracts/files.mongoose.js';
import { generateId } from '../shared/utils/id.js';

export interface FileUploadData {
  fileData: Buffer;
  originalName: string;
  mimeType: string;
  shootId: string;
  tags?: string[];
}

export interface FileListResult {
  files: FileModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class FileService {
  /* eslint-disable max-params */
  constructor(
    private readonly fileModel: Model<FileDocument>,
    private readonly storageService: StorageService,
    private readonly processingService: ProcessingService,
    private readonly eventEmitter: EventEmitter
  ) {}

  /**
   * Upload and store a new file
   */
  async uploadFile(data: FileUploadData): Promise<FileModel> {
    const fileId = generateId();
    
    // Determine file type from MIME type and filename
    const fileType = this.determineFileType(data.mimeType, data.originalName);
    
    // Check if this is a photographer-only file
    const photographerOnly = fileType === 'sidecar' || fileType === 'config';
    
    // Store file to filesystem
    const storagePath = await this.storageService.storeFile(
      fileId, 
      data.fileData, 
      data.originalName
    );

    // Create file DTO
    const createDTO: CreateFileDTO = {
      originalName: data.originalName,
      shootId: data.shootId,
      size: data.fileData.length,
      mimeType: data.mimeType,
      storagePath,
      type: fileType,
      tags: data.tags,
      photographerOnly,
      sidecarType: this.getSidecarType(data.originalName, fileType),
    };

    if (!validateCreateFileDTO(createDTO)) {
      throw new Error('Invalid file data');
    }

    // Create database record
    const fileDoc = new this.fileModel({
      _id: fileId,
      ...createDTO,
    });

    const savedDoc = await fileDoc.save();
    const fileModel = transformFileDocument(savedDoc);

    // Emit file uploaded event
    await this.eventEmitter.emitFileUploaded({
      fileId,
      originalName: data.originalName,
      shootId: data.shootId,
      size: data.fileData.length,
      mimeType: data.mimeType,
      storagePath,
      fileType,
      uploadedAt: fileModel.createdAt,
    });

    // Start background processing for large files or specific types
    this.startBackgroundProcessing(fileModel);

    return fileModel;
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<FileModel | null> {
    const doc = await this.fileModel.findById(fileId);
    return doc ? transformFileDocument(doc) : null;
  }

  /**
   * List files with filtering and pagination
   */
  async listFiles(query: FileQuery): Promise<FileListResult> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      ...(query.shootId && { shootId: query.shootId }),
      ...(query.type && { type: query.type }),
      ...(query.processingStatus && { processingStatus: query.processingStatus }),
      ...(query.tags?.length && { tags: { $in: query.tags } })
    };

    // Execute queries in parallel
    const [docs, total] = await Promise.all([
      this.fileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.fileModel.countDocuments(filter)
    ]);

    return {
      files: docs.map(transformFileDocument),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId: string, update: UpdateFileDTO): Promise<FileModel | null> {
    if (!validateUpdateFileDTO(update)) {
      throw new Error('Invalid update data');
    }

    const doc = await this.fileModel.findById(fileId);
    if (!doc) {
      return null;
    }

    // Apply update
    const currentModel = transformFileDocument(doc);
    const updatedModel = applyFileUpdate(currentModel, update);

    // Update document
    Object.assign(doc, {
      filename: updatedModel.filename,
      processingStatus: updatedModel.processingStatus,
      publicUrl: updatedModel.publicUrl,
      thumbnailUrl: updatedModel.thumbnailUrl,
      metadata: updatedModel.metadata,
      tags: updatedModel.tags,
      updatedAt: new Date(),
    });

    const savedDoc = await doc.save();
    return transformFileDocument(savedDoc);
  }

  /**
   * Delete file and cleanup storage
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const doc = await this.fileModel.findById(fileId);
    if (!doc) {
      return false;
    }

    const fileModel = transformFileDocument(doc);

    // Delete from storage
    await this.storageService.deleteFile(fileModel.storagePath);
    
    // Delete chunks if they exist
    await this.storageService.deleteChunks(fileId);

    // Delete from database
    await this.fileModel.deleteOne({ _id: fileId });

    // Emit file deleted event
    await this.eventEmitter.emitFileDeleted({
      fileId,
      shootId: fileModel.shootId,
      originalName: fileModel.filename,
      deletedAt: new Date().toISOString(),
      cleanupStatus: 'completed',
    });

    return true;
  }

  /**
   * Get file statistics for download (ADR-026 requirement)
   */
  async getFileStats(storagePath: string): Promise<FileStats> {
    return await this.storageService.getFileStats(storagePath);
  }

  /**
   * Create download stream for file
   */
  async createDownloadStream(
    fileId: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const file = await this.getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const stats = await this.getFileStats(file.storagePath);
    
    // Use chunked stream for large files (ADR-027)
    if (this.storageService.shouldUseChunking(stats.size)) {
      // Ensure chunks are created
      await this.storageService.createChunksForFile(fileId, file.storagePath);
      return await this.storageService.createChunkedReadStream(fileId, options);
    } else {
      // Use direct filesystem stream for smaller files
      return this.storageService.createReadStream(file.storagePath, options);
    }
  }

  /**
   * Get files by shoot ID
   */
  async getFilesByShootId(shootId: string): Promise<FileModel[]> {
    const docs = await this.fileModel
      .find({ shootId })
      .sort({ createdAt: -1 })
      .exec();
    
    return docs.map(transformFileDocument);
  }

  /**
   * Get files by IDs
   */
  async getFilesByIds(fileIds: string[]): Promise<FileModel[]> {
    const docs = await this.fileModel
      .find({ _id: { $in: fileIds } })
      .exec();
    
    return docs.map(transformFileDocument);
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    fileId: string,
    status: ProcessingStatus,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.fileModel.updateOne(
      { _id: fileId },
      {
        processingStatus: status,
        ...(details && { metadata: { $set: { processingDetails: details } } }),
        updatedAt: new Date()
      }
    );

    // Emit processing event
    await this.eventEmitter.emitFileProcessed({
      fileId,
      processingStatus: status,
      processingDetails: details,
      processedAt: new Date().toISOString(),
    });
  }

  /**
   * Determine file type from MIME type and filename
   */
  private determineFileType(mimeType: string, filename?: string): FileType {
    const extension = filename?.toLowerCase().split('.').pop();
    
    // Sidecar/Config file formats (photographer-only access per TypeSpec comments)
    const sidecarExtensions = ['xmp']; // Adobe Lightroom/Photoshop sidecar
    const configExtensions = ['psd', 'psb', 'cos', 'col', 'afphoto', 'xcf']; // Editor project files

    if (extension && sidecarExtensions.includes(extension)) {
      return 'sidecar';
    }
    if (extension && configExtensions.includes(extension)) {
      return 'config';
    }
    
    // Standard image formats
    if (mimeType.startsWith('image/jpeg')) {return 'jpeg';}
    if (mimeType.startsWith('image/png')) {return 'png';}
    if (mimeType.startsWith('video/')) {return 'video';}
    
    // RAW formats based on file-service.tsp comments
    const rawFormats = [
      'image/x-canon-cr2', 'image/x-canon-cr3', // Canon: .CR2, .CR3
      'image/x-nikon-nef', 'image/x-nikon-nrw', // Nikon: .NEF, .NRW
      'image/x-sony-arw', // Sony: .ARW
      'image/x-olympus-orf', // Olympus: .ORF
      'image/x-adobe-dng', // Leica: .DNG, .RWL
      'image/x-hasselblad-3fr', 'image/x-hasselblad-fff', // Hasselblad: .3FR, .FFF
      'image/x-phaseone-iiq', // Phase One: .IIQ
    ];
    
    if (rawFormats.includes(mimeType)) {return 'raw';}
    
    // Check by file extension for RAW formats
    const rawExtensions = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'orf', 'dng', 'rwl', '3fr', 'fff', 'iiq'];
    if (extension && rawExtensions.includes(extension)) {return 'raw';}
    
    // Default to jpeg for unknown image types
    if (mimeType.startsWith('image/')) {return 'jpeg';}
    
    return 'raw'; // Default fallback
  }

  /**
   * Get sidecar type from filename and file type
   */
  private getSidecarType(
    filename: string,
    fileType: FileType
  ): 'xmp' | 'psd' | 'psb' | 'cos' | 'col' | 'afphoto' | 'xcf' | undefined {
    if (fileType !== 'sidecar' && fileType !== 'config') {
      return undefined;
    }
    
    const extension = filename.toLowerCase().split('.').pop();
    
    // Map extensions to sidecar types per TypeSpec comments
    switch (extension) {
      case 'xmp': return 'xmp'; // Adobe Lightroom/Photoshop sidecar
      case 'psd': return 'psd'; // Adobe Photoshop internal project
      case 'psb': return 'psb'; // Adobe Photoshop large docs
      case 'cos': return 'cos'; // Capture One
      case 'col': return 'col'; // Capture One
      case 'afphoto': return 'afphoto'; // Affinity Photo
      case 'xcf': return 'xcf'; // GIMP
      default: return undefined;
    }
  }

  /**
   * Start background processing for uploaded files
   */
  private startBackgroundProcessing(file: FileModel): void {
    // Process asynchronously without blocking the response
    process.nextTick(async () => {
      try {
        await this.processingService.processFile(file);
      } catch (error) {
        console.error(`Background processing failed for file ${file.id}:`, error);
        await this.updateProcessingStatus(file.id, 'failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }
}