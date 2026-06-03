import { EventPublisher } from '../../shared/messaging';
import {
  GalleryDeletedPayload,
  GALLERY_EVENT_TYPES
} from '../../shared/contracts/galleries.events';
import { generateEventId } from '../../shared/utils/id';

export class GalleryDeletedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(galleryId: string): Promise<void> {
    const event: GalleryDeletedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: GALLERY_EVENT_TYPES.DELETED,
      data: {
        galleryId,
        deletedAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('galleries', event as unknown as Record<string, unknown>, galleryId);
  }
}
