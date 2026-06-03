import { EventPublisher } from '../../shared/messaging';
import {
  GalleryCreatedPayload,
  GALLERY_EVENT_TYPES
} from '../../shared/contracts/galleries.events';
import { generateEventId } from '../../shared/utils/id';
import type { Gallery } from '@tempsdarret/shared/schemas/portfolio.schema';

export class GalleryCreatedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(gallery: Gallery): Promise<void> {
    const event: GalleryCreatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: GALLERY_EVENT_TYPES.CREATED,
      data: {
        galleryId: gallery.id,
        portfolioId: gallery.portfolioId,
        ...(gallery.shootId ? { shootId: gallery.shootId } : {}),
        type: gallery.type,
        createdAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('galleries', event as unknown as Record<string, unknown>, gallery.id);
  }
}
