/**
 * File Service Main Application
 * Implements ADR-026/027 file storage and download requirements
 */

import { fileURLToPath } from 'node:url';
import { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { createServer } from './server.js';
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
  async publish(
    topic: string,
    key: string,
    value: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[EVENT] ${topic}:${key}`, { type: value.eventType, headers });
  }
}

async function connectDatabase(): Promise<{
  fileModel: mongoose.Model<FileDocument>;
  archiveModel: mongoose.Model<ArchiveDocument>;
  chunkModel: mongoose.Model<ChunkDocument>;
}> {
  // Reuse an existing mongoose connection when one is already open (e.g. tests
  // that manage their own in-memory Mongo); at service startup readyState is 0.
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongoUrl);
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB');
  }

  const fileModel =
    (mongoose.models.File as mongoose.Model<FileDocument>) ??
    mongoose.model<FileDocument>('File', fileSchema);
  const archiveModel =
    (mongoose.models.Archive as mongoose.Model<ArchiveDocument>) ??
    mongoose.model<ArchiveDocument>('Archive', archiveSchema);
  const chunkModel =
    (mongoose.models.Chunk as mongoose.Model<ChunkDocument>) ??
    mongoose.model<ChunkDocument>('Chunk', chunkSchema);

  return { fileModel, archiveModel, chunkModel };
}

async function setupServices(models: {
  fileModel: mongoose.Model<FileDocument>;
  archiveModel: mongoose.Model<ArchiveDocument>;
  chunkModel: mongoose.Model<ChunkDocument>;
}): Promise<{
  fileService: FileService;
  archiveService: ArchiveService;
  storageService: StorageService;
  processingService: ProcessingService;
  eventEmitter: EventEmitter;
}> {
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
): Promise<void> {
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
}): Promise<void> {
  // Cleanup expired chunks every hour (ADR-027)
  setInterval(async () => {
    try {
      const cleanedChunks = await services.storageService.cleanupExpiredChunks();
      if (cleanedChunks > 0) {
        // eslint-disable-next-line no-console
        console.log(`Cleaned up ${cleanedChunks} expired chunks`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Chunk cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Cleanup expired archives every 6 hours
  setInterval(async () => {
    try {
      const cleanedArchives = await services.archiveService.cleanupExpiredArchives();
      if (cleanedArchives > 0) {
        // eslint-disable-next-line no-console
        console.log(`Cleaned up ${cleanedArchives} expired archives`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Archive cleanup failed:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

/**
 * Builds the fully-routed file-service app (Mongo connected, services wired,
 * routes mounted) without starting the HTTP listener or the periodic cleanup
 * intervals. Importable by component tests so the real routes can be exercised
 * via `inject()` against an in-memory Mongo + temp storage dirs. The Kafka
 * producer is the in-process `MockEventProducer`, so no broker is needed.
 */
export async function buildApp(): Promise<{
  app: FastifyInstance;
  services: Awaited<ReturnType<typeof setupServices>>;
}> {
  const models = await connectDatabase();
  const services = await setupServices(models);
  const handlers = new FileHandlers(services.fileService, services.archiveService);
  const app = await createServer();
  await setupRoutes(app, handlers);
  return { app, services };
}

async function main(): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log('Starting File Service...');

    const { app: fastify, services } = await buildApp();

    // Setup cleanup tasks
    setupCleanupTasks(services);

    // Start server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    // eslint-disable-next-line no-console
    console.log(`File Service started on port ${config.port}`);
    // eslint-disable-next-line no-console
    console.log('Configuration:');
    // eslint-disable-next-line no-console
    console.log(`- Storage: ${config.storage.basePath}`);
    // eslint-disable-next-line no-console
    console.log(`- Large file threshold: ${config.storage.largeFileThreshold} bytes`);
    // eslint-disable-next-line no-console
    console.log(`- Chunk TTL: ${config.storage.chunkTTLHours} hours`);
    // eslint-disable-next-line no-console
    console.log(`- Archive expiration: ${config.archive.defaultExpirationDays} days`);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start File Service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down File Service...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down File Service...');
  await mongoose.disconnect();
  process.exit(0);
});

// Only boot the service when run as the entrypoint (`node dist/main.js`), not
// when imported by tests for `buildApp`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: Error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}