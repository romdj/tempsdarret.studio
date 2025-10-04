/**
 * Storage Service
 * Implements ADR-027: Direct Filesystem + On-Demand GridFS chunks
 */

/* global NodeJS */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Model } from 'mongoose';
import { ChunkDocument } from '../shared/contracts/files.mongoose.js';

export interface StorageConfig {
  basePath: string;
  chunkSize: number;
  largeFileThreshold: number; // 25MB as per ADR-027
  chunkTTLHours: number; // 24 hours as per ADR-027
}

export interface FileStats {
  size: number;
  mimeType?: string;
  exists: boolean;
}

export interface ChunkInfo {
  index: number;
  offset: number;
  size: number;
  data?: Buffer;
}

export class StorageService {
  private readonly config: StorageConfig;
  private readonly chunkModel: Model<ChunkDocument>;

  constructor(config: StorageConfig, chunkModel: Model<ChunkDocument>) {
    this.config = config;
    this.chunkModel = chunkModel;
  }

  /**
   * Store file directly to filesystem (primary strategy - ADR-027)
   */
  async storeFile(fileId: string, data: Buffer, originalName: string): Promise<string> {
    const storagePath = this.generateStoragePath(fileId, originalName);
    const fullPath = path.join(this.config.basePath, storagePath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file directly to filesystem
    await fs.writeFile(fullPath, data);
    
    return storagePath;
  }

  /**
   * Store file from stream (for uploads)
   */
  async storeFileFromStream(fileId: string, stream: NodeJS.ReadableStream, originalName: string): Promise<string> {
    const storagePath = this.generateStoragePath(fileId, originalName);
    const fullPath = path.join(this.config.basePath, storagePath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Create write stream and pipe
    const writeStream = createWriteStream(fullPath);
    await pipeline(stream, writeStream);
    
    return storagePath;
  }

  /**
   * Get file stats (required for Content-Length per ADR-026)
   */
  async getFileStats(storagePath: string): Promise<FileStats> {
    const fullPath = path.join(this.config.basePath, storagePath);
    
    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        exists: true,
      };
    } catch {
      return {
        size: 0,
        exists: false,
      };
    }
  }

  /**
   * Create read stream for file download (primary strategy)
   */
  createReadStream(storagePath: string, options?: { start?: number; end?: number }): NodeJS.ReadableStream {
    const fullPath = path.join(this.config.basePath, storagePath);
    return createReadStream(fullPath, options);
  }

  /**
   * Check if file should use chunking (> 25MB per ADR-027)
   */
  shouldUseChunking(fileSize: number): boolean {
    return fileSize >= this.config.largeFileThreshold;
  }

  /**
   * Create chunks for large file access (on-demand strategy - ADR-027)
   */
  async createChunksForFile(fileId: string, storagePath: string): Promise<void> {
    const fullPath = path.join(this.config.basePath, storagePath);
    const stats = await fs.stat(fullPath);
    
    if (!this.shouldUseChunking(stats.size)) {
      return; // File too small for chunking
    }

    // Check if chunks already exist
    const existingChunks = await this.chunkModel.countDocuments({ fileId });
    if (existingChunks > 0) {
      return; // Chunks already created
    }

    console.log(`Creating chunks for large file ${fileId} (${stats.size} bytes)...`);
    const startTime = Date.now();

    const totalChunks = Math.ceil(stats.size / this.config.chunkSize);
    const chunks: Record<string, unknown>[] = [];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.chunkTTLHours);

    // Read file in chunks and create documents
    const fileHandle = await fs.open(fullPath, 'r');
    try {
      for (let i = 0; i < totalChunks; i++) {
        const offset = i * this.config.chunkSize;
        const length = Math.min(this.config.chunkSize, stats.size - offset);
        
        const buffer = Buffer.allocUnsafe(length);
        await fileHandle.read(buffer, 0, length, offset);
        
        chunks.push({
          fileId,
          chunkIndex: i,
          data: buffer,
          expiresAt,
        });

        // Batch insert every 1000 chunks to avoid memory issues
        if (chunks.length >= 1000) {
          await this.chunkModel.insertMany(chunks);
          chunks.length = 0;
        }
      }

      // Insert remaining chunks
      if (chunks.length > 0) {
        await this.chunkModel.insertMany(chunks);
      }

      const duration = Date.now() - startTime;
      console.log(`Created ${totalChunks} chunks for file ${fileId} in ${duration}ms`);
      
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Get chunk data for large file (on-demand access)
   */
  async getChunk(fileId: string, chunkIndex: number): Promise<Buffer | null> {
    const chunk = await this.chunkModel.findOne({ fileId, chunkIndex });
    return chunk?.data ?? null;
  }

  /**
   * Get file size for chunked file
   */
  async getChunkedFileInfo(fileId: string): Promise<{ totalChunks: number; totalSize: number } | null> {
    const chunks = await this.chunkModel.find({ fileId }).sort({ chunkIndex: 1 });
    if (chunks.length === 0) {
      return null;
    }

    const totalChunks = chunks.length;
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);

    return { totalChunks, totalSize };
  }

  /**
   * Create chunked read stream for large files
   */
  async createChunkedReadStream(
    fileId: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const { Readable } = await import('stream');

    const fileInfo = await this.getChunkedFileInfo(fileId);
    if (!fileInfo) {
      throw new Error(`No chunks found for file ${fileId}`);
    }

    const start = options?.start ?? 0;
    const end = options?.end ?? fileInfo.totalSize - 1;
    const startChunk = Math.floor(start / this.config.chunkSize);
    const endChunk = Math.floor(end / this.config.chunkSize);

    let currentChunk = startChunk;
    let currentPosition = start;

    return new Readable({
      async read(): Promise<void> {
        if (currentChunk > endChunk || currentPosition > end) {
          this.push(null); // End of stream
          return;
        }

        try {
          const chunkData = await this.getChunk(fileId, currentChunk);
          if (!chunkData) {
            this.emit('error', new Error(`Chunk ${currentChunk} not found for file ${fileId}`));
            return;
          }

          // Calculate slice boundaries
          const chunkStart = currentChunk * this.config.chunkSize;
          const localStart = Math.max(0, currentPosition - chunkStart);
          const localEnd = Math.min(chunkData.length, end - chunkStart + 1);
          
          const slice = chunkData.subarray(localStart, localEnd);
          this.push(slice);
          
          currentPosition += slice.length;
          if (localEnd >= chunkData.length) {
            currentChunk++;
          }
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Delete file from filesystem
   */
  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.config.basePath, storagePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist, which is okay for deletion
      console.warn(`Failed to delete file ${storagePath}:`, error);
    }
  }

  /**
   * Delete chunks for file (cleanup)
   */
  async deleteChunks(fileId: string): Promise<void> {
    await this.chunkModel.deleteMany({ fileId });
  }

  /**
   * Cleanup expired chunks (maintenance task)
   */
  async cleanupExpiredChunks(): Promise<number> {
    const result = await this.chunkModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount || 0;
  }

  /**
   * Generate storage path following ADR-027 structure
   */
  private generateStoragePath(fileId: string, originalName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = path.extname(originalName) || '.bin';
    
    return `${year}/${month}/${fileId}${extension}`;
  }

  /**
   * Ensure base storage directory exists
   */
  async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(this.config.basePath, { recursive: true });
  }
}