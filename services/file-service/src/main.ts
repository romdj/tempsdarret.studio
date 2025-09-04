/**
 * File Service Main Application
 * Implements ADR-026/027 file storage and download requirements
 */

import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { FileHandlers } from './handlers/FileHandlers.js';
import { FileService } from './services/FileService.js';
import { StorageService } from './services/StorageService.js';
import { ProcessingService } from './services/ProcessingService.js';
import { ArchiveService } from './services/ArchiveService.js';
import { EventEmitter } from './services/EventEmitter.js';
import { 
  fileSchema, 
  archiveSchema, 
  chunkSchema,
  FileDocument,
  ArchiveDocument,
  ChunkDocument 
} from './shared/contracts/files.mongoose.js';

// Mock Kafka producer - replace with actual implementation
class MockEventProducer {
  async publish(topic: string, key: string, value: any, headers?: Record<string, string>): Promise<void> {
    console.log(`[EVENT] ${topic}:${key}`, { type: value.eventType, headers });
  }
}

async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024 * 1024, // 1GB for large file uploads
  });

  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB for form fields
      fields: 10,
      fileSize: 1024 * 1024 * 1024, // 1GB for files
      files: 10,
    },
  });

  return fastify;
}

async function connectDatabase(): Promise<{
  fileModel: mongoose.Model<FileDocument>;
  archiveModel: mongoose.Model<ArchiveDocument>;  
  chunkModel: mongoose.Model<ChunkDocument>;
}> {
  await mongoose.connect(config.mongoUrl);
  console.log('Connected to MongoDB');

  const fileModel = mongoose.model<FileDocument>('File', fileSchema);
  const archiveModel = mongoose.model<ArchiveDocument>('Archive', archiveSchema);
  const chunkModel = mongoose.model<ChunkDocument>('Chunk', chunkSchema);

  return { fileModel, archiveModel, chunkModel };
}

async function setupServices(models: {
  fileModel: mongoose.Model<FileDocument>;
  archiveModel: mongoose.Model<ArchiveDocument>;
  chunkModel: mongoose.Model<ChunkDocument>;
}) {
  // Initialize services
  const eventProducer = new MockEventProducer();
  const eventEmitter = new EventEmitter(eventProducer);
  
  const storageService = new StorageService(config.storage, models.chunkModel);
  const processingService = new ProcessingService(config.processing);
  const fileService = new FileService(
    models.fileModel,
    storageService,
    processingService,
    eventEmitter
  );
  
  const archiveService = new ArchiveService(
    models.archiveModel,
    fileService,
    eventEmitter,
    config.archive
  );

  // Ensure storage directories exist
  await storageService.ensureStorageDirectory();

  return {
    fileService,
    archiveService,
    storageService,
    processingService,
    eventEmitter,
  };
}

async function setupRoutes(
  fastify: FastifyInstance, 
  handlers: FileHandlers
) {
  // File operations
  fastify.post('/files', handlers.uploadFile.bind(handlers));
  fastify.get('/files', handlers.listFiles.bind(handlers));
  fastify.get('/files/:fileId', handlers.getFile.bind(handlers));
  fastify.get('/files/:fileId/download', handlers.downloadFile.bind(handlers));
  fastify.delete('/files/:fileId', handlers.deleteFile.bind(handlers));

  // Archive operations
  fastify.post('/files/archives', handlers.createArchive.bind(handlers));
  fastify.get('/files/archives/:archiveId', handlers.getArchive.bind(handlers));
  fastify.get('/files/archives/:archiveId/download', handlers.downloadArchive.bind(handlers));

  // Health check
  fastify.get('/health', async () => ({
    status: 'healthy',
    service: 'file-service',
    timestamp: new Date().toISOString(),
  }));
}

async function setupCleanupTasks(services: {
  storageService: StorageService;
  archiveService: ArchiveService;
}) {
  // Cleanup expired chunks every hour (ADR-027)
  setInterval(async () => {
    try {
      const cleanedChunks = await services.storageService.cleanupExpiredChunks();
      if (cleanedChunks > 0) {
        console.log(`Cleaned up ${cleanedChunks} expired chunks`);
      }
    } catch (error) {
      console.error('Chunk cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Cleanup expired archives every 6 hours
  setInterval(async () => {
    try {
      const cleanedArchives = await services.archiveService.cleanupExpiredArchives();
      if (cleanedArchives > 0) {
        console.log(`Cleaned up ${cleanedArchives} expired archives`);
      }
    } catch (error) {
      console.error('Archive cleanup failed:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

async function main() {
  try {
    console.log('Starting File Service...');

    // Connect to database
    const models = await connectDatabase();
    
    // Setup services
    const services = await setupServices(models);
    
    // Create handlers
    const handlers = new FileHandlers(services.fileService, services.archiveService);
    
    // Create and configure server
    const fastify = await createServer();
    await setupRoutes(fastify, handlers);
    
    // Setup cleanup tasks
    setupCleanupTasks(services);
    
    // Start server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`File Service started on port ${config.port}`);
    console.log('Configuration:');
    console.log(`- Storage: ${config.storage.basePath}`);
    console.log(`- Large file threshold: ${config.storage.largeFileThreshold} bytes`);
    console.log(`- Chunk TTL: ${config.storage.chunkTTLHours} hours`);
    console.log(`- Archive expiration: ${config.archive.defaultExpirationDays} days`);

  } catch (error) {
    console.error('Failed to start File Service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down File Service...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down File Service...');
  await mongoose.disconnect();
  process.exit(0);
});

main().catch(console.error);