/**
 * Processing Service
 * Handles file processing tasks like thumbnail generation and metadata extraction
 */

import sharp from 'sharp';
import { ExifParserFactory } from 'ts-exif-parser';
import { FileModel } from '../shared/contracts/files.api.js';
import { FileMetadataDTO } from '../shared/contracts/files.dto.js';

export interface ProcessingConfig {
  thumbnailSize: number;
  thumbnailQuality: number;
  enableMetadataExtraction: boolean;
  maxProcessingTimeMs: number;
}

export class ProcessingService {
  private config: ProcessingConfig;

  constructor(config: ProcessingConfig) {
    this.config = config;
  }

  /**
   * Process file - generate thumbnails and extract metadata
   */
  async processFile(file: FileModel): Promise<FileMetadataDTO> {
    const startTime = Date.now();
    const metadata: FileMetadataDTO = {
      processing: {
        thumbnailGenerated: false,
        metadataExtracted: false,
        processingTime: 0,
        processingErrors: [],
      },
    };

    try {
      // Only process images and RAW files
      if (this.shouldProcessFile(file.type)) {
        
        // Extract EXIF metadata for images
        if (this.config.enableMetadataExtraction) {
          try {
            const exifData = await this.extractMetadata(file.storagePath);
            metadata.exif = exifData.exif;
            metadata.technical = exifData.technical;
            metadata.processing!.metadataExtracted = true;
          } catch (error) {
            metadata.processing!.processingErrors!.push(
              `Metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        // Generate thumbnail for images
        if (file.type === 'jpeg' || file.type === 'png') {
          try {
            const thumbnailPath = await this.generateThumbnail(file.storagePath, file.id);
            metadata.processing!.thumbnailGenerated = true;
            // TODO: Update file record with thumbnail URL
          } catch (error) {
            metadata.processing!.processingErrors!.push(
              `Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      metadata.processing!.processingTime = Date.now() - startTime;
      return metadata;

    } catch (error) {
      metadata.processing!.processingTime = Date.now() - startTime;
      metadata.processing!.processingErrors!.push(
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Generate thumbnail for image file
   */
  async generateThumbnail(storagePath: string, fileId: string): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
    const inputPath = path.join('/data/files', storagePath);
    const thumbnailDir = path.join('/data/thumbnails', path.dirname(storagePath));
    const thumbnailPath = path.join(thumbnailDir, `${fileId}_thumb.jpg`);

    // Ensure thumbnail directory exists
    await fs.promises.mkdir(thumbnailDir, { recursive: true });

    // Generate thumbnail using Sharp
    await sharp(inputPath)
      .resize(this.config.thumbnailSize, this.config.thumbnailSize, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: this.config.thumbnailQuality,
        progressive: true,
      })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Extract EXIF and technical metadata from image
   */
  async extractMetadata(storagePath: string): Promise<{
    exif?: FileMetadataDTO['exif'];
    technical?: FileMetadataDTO['technical'];
  }> {
    const fs = await import('fs');
    const path = await import('path');
    
    const inputPath = path.join('/data/files', storagePath);
    
    try {
      // Read file buffer for EXIF extraction
      const buffer = await fs.promises.readFile(inputPath);
      
      // Extract EXIF data
      const parser = ExifParserFactory.create(buffer);
      const result = parser.parse();
      
      // Get image dimensions using Sharp
      const image = sharp(inputPath);
      const imageMetadata = await image.metadata();

      const exif: FileMetadataDTO['exif'] = {};
      const technical: FileMetadataDTO['technical'] = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        colorSpace: imageMetadata.space,
        bitDepth: imageMetadata.depth,
      };

      // Parse EXIF tags
      if (result.tags) {
        const tags = result.tags;
        
        // Camera information
        if (tags.Make) exif.camera = `${tags.Make} ${tags.Model || ''}`.trim();
        if (tags.LensModel) exif.lens = tags.LensModel;
        
        // Technical settings
        if (tags.FocalLength) exif.focalLength = tags.FocalLength;
        if (tags.FNumber) exif.aperture = `f/${tags.FNumber}`;
        if (tags.ExposureTime) {
          exif.shutterSpeed = tags.ExposureTime > 1 
            ? `${tags.ExposureTime}s` 
            : `1/${Math.round(1/tags.ExposureTime)}s`;
        }
        if (tags.ISO) exif.iso = tags.ISO;
        
        // Date taken
        if (tags.DateTimeOriginal) {
          exif.dateTaken = new Date(tags.DateTimeOriginal * 1000).toISOString();
        }

        // GPS location
        if (tags.GPSLatitude && tags.GPSLongitude) {
          exif.gpsLocation = {
            latitude: tags.GPSLatitude,
            longitude: tags.GPSLongitude,
          };
        }
      }

      return { exif, technical };
      
    } catch (error) {
      console.warn(`Failed to extract metadata from ${storagePath}:`, error);
      return {};
    }
  }

  /**
   * Validate processing results
   */
  async validateFile(file: FileModel): Promise<boolean> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join('/data/files', file.storagePath);
      const stats = await fs.promises.stat(filePath);
      
      // Basic validation
      if (stats.size !== file.size) {
        throw new Error(`File size mismatch: expected ${file.size}, got ${stats.size}`);
      }

      // Image-specific validation
      if (file.type === 'jpeg' || file.type === 'png') {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
          throw new Error('Invalid image: missing dimensions');
        }
      }

      return true;
      
    } catch (error) {
      console.error(`File validation failed for ${file.id}:`, error);
      return false;
    }
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(fileType: string): boolean {
    return ['jpeg', 'png', 'raw'].includes(fileType);
  }

  /**
   * Get processing queue status
   */
  async getProcessingStatus(): Promise<{
    queueLength: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    // This would integrate with a proper job queue in production
    // For now, return mock data
    return {
      queueLength: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }
}