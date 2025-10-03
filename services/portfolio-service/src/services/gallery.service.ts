import { GalleryRepository } from '../persistence/gallery.repository.js';
import { EventPublisher } from '../shared/messaging/event-publisher.js';
import {
  CreateGalleryRequest,
  GalleryQuery,
  Gallery,
  GalleryImage,
  AddGalleryImagesRequest
} from '@tempsdarret/shared/schemas/portfolio.schema.js';

export class GalleryService {
  constructor(
    private readonly galleryRepository: GalleryRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createGallery(galleryData: CreateGalleryRequest): Promise<Gallery> {
    const savedGallery = await this.galleryRepository.create(galleryData);

    await this.eventPublisher.publish('galleries', {
      eventType: 'gallery.created',
      galleryId: savedGallery.id,
      portfolioId: savedGallery.portfolioId,
      shootId: savedGallery.shootId,
      type: savedGallery.type,
      timestamp: new Date().toISOString()
    }, savedGallery.id);

    return savedGallery.toJSON() as Gallery;
  }

  async getGallery(galleryId: string): Promise<Gallery | null> {
    const gallery = await this.galleryRepository.findById(galleryId);
    return gallery ? gallery.toJSON() as Gallery : null;
  }

  async updateGallery(galleryId: string, updateData: Partial<CreateGalleryRequest>): Promise<Gallery | null> {
    const updatedGallery = await this.galleryRepository.updateById(galleryId, updateData);

    if (updatedGallery) {
      await this.eventPublisher.publish('galleries', {
        eventType: 'gallery.updated',
        galleryId,
        changes: updateData,
        timestamp: new Date().toISOString()
      }, galleryId);
    }

    return updatedGallery ? updatedGallery.toJSON() as Gallery : null;
  }

  async listGalleries(query: GalleryQuery): Promise<{ galleries: Gallery[], total: number }> {
    const { galleries, total } = await this.galleryRepository.findMany(query);

    return {
      galleries: galleries.map(g => g.toJSON() as Gallery),
      total
    };
  }

  async deleteGallery(galleryId: string): Promise<boolean> {
    const deleted = await this.galleryRepository.deleteById(galleryId);

    if (deleted) {
      await this.eventPublisher.publish('galleries', {
        eventType: 'gallery.deleted',
        galleryId,
        timestamp: new Date().toISOString()
      }, galleryId);
    }

    return deleted;
  }

  async addImagesToGallery(galleryId: string, request: AddGalleryImagesRequest): Promise<GalleryImage[]> {
    const images = await this.galleryRepository.addImages(galleryId, request);

    await this.eventPublisher.publish('galleries', {
      eventType: 'gallery.images-added',
      galleryId,
      imageCount: images.length,
      fileIds: request.fileIds,
      timestamp: new Date().toISOString()
    }, galleryId);

    return images.map(img => img.toJSON() as GalleryImage);
  }

  async getGalleryImages(galleryId: string): Promise<GalleryImage[]> {
    const images = await this.galleryRepository.getImages(galleryId);
    return images.map(img => img.toJSON() as GalleryImage);
  }
}
