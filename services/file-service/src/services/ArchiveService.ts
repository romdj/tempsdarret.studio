/**
 * Archive Service
 * Handles creation and management of file archives
 */

import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Model } from 'mongoose';
import { FileService } from './FileService.js';
import { EventEmitter } from './EventEmitter.js';
import { 
  ArchiveModel,
  ArchiveType,
  ProcessingStatus 
} from '../shared/contracts/files.api.js';
import { CreateArchiveDTO } from '../shared/contracts/files.dto.js';
import { 
  ArchiveDocument, 
  transformArchiveDocument 
} from '../shared/contracts/files.mongoose.js';
import { generateId } from '../shared/utils/id.js';

export interface CreateArchiveRequest {
  shootId: string;
  type: ArchiveType;
  fileIds?: string[];
}

export interface ArchiveConfig {
  basePath: string;
  maxArchiveSize: number; // Max size in bytes
  defaultExpirationDays: number;
  compressionLevel: number;
}

export class ArchiveService {
  constructor(
    private archiveModel: Model<ArchiveDocument>,
    private fileService: FileService,
    private eventEmitter: EventEmitter,
    private config: ArchiveConfig
  ) {}

  /**
   * Create a new archive
   */
  async createArchive(request: CreateArchiveRequest): Promise<ArchiveModel> {
    const archiveId = generateId();
    
    // Get files to include in archive
    let files = request.fileIds 
      ? await this.fileService.getFilesByIds(request.fileIds)
      : await this.fileService.getFilesByShootId(request.shootId);

    // Filter files by archive type
    files = this.filterFilesByType(files, request.type);
    
    if (files.length === 0) {
      throw new Error(`No files found for archive type: ${request.type}`);
    }

    // Calculate estimated size
    const estimatedSize = files.reduce((total, file) => total + file.size, 0);
    
    if (estimatedSize > this.config.maxArchiveSize) {
      throw new Error(`Archive size ${estimatedSize} exceeds maximum allowed size ${this.config.maxArchiveSize}`);
    }

    // Create archive record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.defaultExpirationDays);

    const archiveDoc = new this.archiveModel({
      _id: archiveId,
      shootId: request.shootId,
      type: request.type,
      size: 0, // Will be updated when archive is completed
      downloadUrl: `/archives/${archiveId}/download`,
      expiresAt,
      status: 'pending',
    });

    const savedDoc = await archiveDoc.save();
    const archive = transformArchiveDocument(savedDoc);

    // Emit archive created event
    await this.eventEmitter.emitArchiveCreated({
      archiveId,
      shootId: request.shootId,
      archiveType: request.type,
      fileCount: files.length,
      estimatedSize,
      status: 'pending',
      createdAt: archive.createdAt,
    });

    // Start background archive generation
    this.startArchiveGeneration(archiveId, files);

    return archive;
  }

  /**
   * Get archive by ID
   */
  async getArchiveById(archiveId: string): Promise<ArchiveModel | null> {
    const doc = await this.archiveModel.findById(archiveId);
    return doc ? transformArchiveDocument(doc) : null;
  }

  /**
   * Get archives by shoot ID
   */
  async getArchivesByShootId(shootId: string): Promise<ArchiveModel[]> {
    const docs = await this.archiveModel
      .find({ shootId })
      .sort({ createdAt: -1 })
      .exec();
    
    return docs.map(transformArchiveDocument);
  }

  /**
   * Create download stream for archive
   */
  async createArchiveDownloadStream(archiveId: string): Promise<NodeJS.ReadableStream> {
    const archive = await this.getArchiveById(archiveId);
    if (!archive || archive.status !== 'completed') {
      throw new Error('Archive not ready for download');
    }

    const archivePath = this.getArchivePath(archiveId);
    return createReadStream(archivePath);
  }

  /**
   * Delete archive
   */
  async deleteArchive(archiveId: string): Promise<boolean> {
    const doc = await this.archiveModel.findById(archiveId);
    if (!doc) {
      return false;
    }

    // Delete archive file
    const archivePath = this.getArchivePath(archiveId);
    try {
      await fs.unlink(archivePath);
    } catch (error) {
      console.warn(`Failed to delete archive file ${archivePath}:`, error);
    }

    // Delete database record
    await this.archiveModel.deleteOne({ _id: archiveId });
    return true;
  }

  /**
   * Cleanup expired archives
   */
  async cleanupExpiredArchives(): Promise<number> {
    const expiredArchives = await this.archiveModel.find({
      expiresAt: { $lt: new Date() }
    });

    let cleanedCount = 0;
    for (const archive of expiredArchives) {
      try {
        await this.deleteArchive(archive._id);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup archive ${archive._id}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Update archive status
   */
  async updateArchiveStatus(archiveId: string, status: ProcessingStatus, size?: number): Promise<void> {
    const update: any = { status, updatedAt: new Date() };
    if (size !== undefined) {
      update.size = size;
    }

    await this.archiveModel.updateOne({ _id: archiveId }, update);

    // Emit archive ready event if completed
    if (status === 'completed') {
      const archive = await this.getArchiveById(archiveId);
      if (archive) {
        await this.eventEmitter.emitArchiveReady({
          archiveId,
          shootId: archive.shootId,
          finalSize: archive.size,
          downloadUrl: archive.downloadUrl,
          expiresAt: archive.expiresAt,
          readyAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Generate archive file in background
   */
  private async startArchiveGeneration(archiveId: string, files: any[]): Promise<void> {
    process.nextTick(async () => {
      try {
        await this.updateArchiveStatus(archiveId, 'processing');
        
        const archivePath = this.getArchivePath(archiveId);
        
        // Ensure archive directory exists
        await fs.mkdir(path.dirname(archivePath), { recursive: true });

        // Create ZIP archive
        const output = createWriteStream(archivePath);
        const archive = archiver('zip', {
          zlib: { level: this.config.compressionLevel }
        });

        archive.pipe(output);

        // Add files to archive
        for (const file of files) {
          const filePath = path.join('/data/files', file.storagePath);
          archive.file(filePath, { name: file.filename });
        }

        await archive.finalize();

        // Wait for archive to be written
        await new Promise((resolve, reject) => {
          output.on('close', resolve);
          output.on('error', reject);
          archive.on('error', reject);
        });

        // Get final archive size
        const stats = await fs.stat(archivePath);
        
        // Update archive status
        await this.updateArchiveStatus(archiveId, 'completed', stats.size);

        console.log(`Archive ${archiveId} completed: ${stats.size} bytes`);
        
      } catch (error) {
        console.error(`Archive generation failed for ${archiveId}:`, error);
        await this.updateArchiveStatus(archiveId, 'failed');
      }
    });
  }

  /**
   * Filter files by archive type
   */
  private filterFilesByType(files: any[], type: ArchiveType): any[] {
    switch (type) {
      case 'jpeg':
        return files.filter(f => f.type === 'jpeg');
      case 'raw':
        return files.filter(f => f.type === 'raw');
      case 'complete':
        return files; // Include all files
      default:
        throw new Error(`Unknown archive type: ${type}`);
    }
  }

  /**
   * Get archive file path
   */
  private getArchivePath(archiveId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return path.join(
      this.config.basePath,
      'archives',
      String(year),
      month,
      `${archiveId}.zip`
    );
  }
}