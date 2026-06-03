import { EventPublisher } from '../../shared/messaging';
import {
  GalleryUpdatedPayload,
  GALLERY_EVENT_TYPES
} from '../../shared/contracts/galleries.events';
import { generateEventId } from '../../shared/utils/id';
import type { CreateGalleryRequest } from '@tempsdarret/shared/schemas/portfolio.schema';

export class GalleryUpdatedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(galleryId: string, changes: Partial<CreateGalleryRequest>): Promise<void> {
    const event: GalleryUpdatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: GALLERY_EVENT_TYPES.UPDATED,
      data: {
        galleryId,
        changes: changes as unknown as Record<string, unknown>,
        updatedAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('galleries', event as unknown as Record<string, unknown>, galleryId);
  }
}
