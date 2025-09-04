/**
 * File Service Configuration
 * Environment-based configuration following ADR-026/027 requirements
 */

export interface FileServiceConfig {
  port: number;
  mongoUrl: string;
  kafkaUrl: string;
  storage: {
    basePath: string;
    chunkSize: number;
    largeFileThreshold: number;
    chunkTTLHours: number;
  };
  processing: {
    thumbnailSize: number;
    thumbnailQuality: number;
    enableMetadataExtraction: boolean;
    maxProcessingTimeMs: number;
  };
  archive: {
    basePath: string;
    maxArchiveSize: number;
    defaultExpirationDays: number;
    compressionLevel: number;
  };
}

export const config: FileServiceConfig = {
  port: parseInt(process.env.PORT || '3003'),
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/file-service',
  kafkaUrl: process.env.KAFKA_URL || 'localhost:9092',
  
  // Storage configuration per ADR-027
  storage: {
    basePath: process.env.STORAGE_BASE_PATH || '/data/files',
    chunkSize: parseInt(process.env.CHUNK_SIZE || '261120'), // 255KB (GridFS default)
    largeFileThreshold: parseInt(process.env.LARGE_FILE_THRESHOLD || '26214400'), // 25MB
    chunkTTLHours: parseInt(process.env.CHUNK_TTL_HOURS || '24'), // 24 hours
  },
  
  // Processing configuration
  processing: {
    thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300'),
    thumbnailQuality: parseInt(process.env.THUMBNAIL_QUALITY || '85'),
    enableMetadataExtraction: process.env.ENABLE_METADATA_EXTRACTION === 'true',
    maxProcessingTimeMs: parseInt(process.env.MAX_PROCESSING_TIME_MS || '30000'), // 30 seconds
  },
  
  // Archive configuration
  archive: {
    basePath: process.env.ARCHIVE_BASE_PATH || '/data',
    maxArchiveSize: parseInt(process.env.MAX_ARCHIVE_SIZE || '53687091200'), // 50GB
    defaultExpirationDays: parseInt(process.env.ARCHIVE_EXPIRATION_DAYS || '7'),
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6'),
  },
};

export default config;