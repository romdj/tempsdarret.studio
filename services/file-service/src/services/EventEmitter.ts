/**
 * Event Emitter Service
 * Handles publishing file service events to Kafka/event system
 */

import { 
  FileUploadedData,
  FileProcessedData,
  FileDeletedData,
  ArchiveCreatedData,
  ArchiveReadyData,
  FILE_EVENT_TYPES
} from '../shared/contracts/files.events.js';
import { generateId } from '../shared/utils/id.js';

// Mock Kafka producer interface - replace with actual implementation
interface EventProducer {
  publish(
    topic: string,
    key: string,
    value: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<void>;
}

export class EventEmitter {
  private readonly producer: EventProducer;
  private readonly serviceName = 'file-service';

  constructor(producer: EventProducer) {
    this.producer = producer;
  }

  /**
   * Emit file uploaded event
   */
  async emitFileUploaded(data: FileUploadedData): Promise<void> {
    const event = {
      eventId: generateId(),
      eventType: FILE_EVENT_TYPES.UPLOADED,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: this.serviceName,
      data,
    };

    await this.producer.publish('files', data.fileId, event, {
      'event-type': FILE_EVENT_TYPES.UPLOADED,
      'shoot-id': data.shootId,
    });
  }

  /**
   * Emit file processed event
   */
  async emitFileProcessed(data: FileProcessedData): Promise<void> {
    const event = {
      eventId: generateId(),
      eventType: FILE_EVENT_TYPES.PROCESSED,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: this.serviceName,
      data,
    };

    await this.producer.publish('files', data.fileId, event, {
      'event-type': FILE_EVENT_TYPES.PROCESSED,
      'processing-status': data.processingStatus,
    });
  }

  /**
   * Emit file deleted event
   */
  async emitFileDeleted(data: FileDeletedData): Promise<void> {
    const event = {
      eventId: generateId(),
      eventType: FILE_EVENT_TYPES.DELETED,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: this.serviceName,
      data,
    };

    await this.producer.publish('files', data.fileId, event, {
      'event-type': FILE_EVENT_TYPES.DELETED,
      'shoot-id': data.shootId,
    });
  }

  /**
   * Emit archive created event
   */
  async emitArchiveCreated(data: ArchiveCreatedData): Promise<void> {
    const event = {
      eventId: generateId(),
      eventType: FILE_EVENT_TYPES.ARCHIVE_CREATED,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: this.serviceName,
      data,
    };

    await this.producer.publish('archives', data.archiveId, event, {
      'event-type': FILE_EVENT_TYPES.ARCHIVE_CREATED,
      'shoot-id': data.shootId,
      'archive-type': data.archiveType,
    });
  }

  /**
   * Emit archive ready event
   */
  async emitArchiveReady(data: ArchiveReadyData): Promise<void> {
    const event = {
      eventId: generateId(),
      eventType: FILE_EVENT_TYPES.ARCHIVE_READY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: this.serviceName,
      data,
    };

    await this.producer.publish('archives', data.archiveId, event, {
      'event-type': FILE_EVENT_TYPES.ARCHIVE_READY,
      'shoot-id': data.shootId,
    });
  }
}