import { EventPublisher } from '../../shared/messaging';
import {
  GalleryImagesAddedPayload,
  GALLERY_EVENT_TYPES
} from '../../shared/contracts/galleries.events';
import { generateEventId } from '../../shared/utils/id';

export class GalleryImagesAddedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(galleryId: string, fileIds: string[], imageCount: number): Promise<void> {
    const event: GalleryImagesAddedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: GALLERY_EVENT_TYPES.IMAGES_ADDED,
      data: {
        galleryId,
        imageCount,
        fileIds,
        addedAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('galleries', event as unknown as Record<string, unknown>, galleryId);
  }
}
