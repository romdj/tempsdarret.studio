import { GalleryRepository } from '../persistence/gallery.repository.js';
import {
  GalleryCreatedPublisher,
  GalleryUpdatedPublisher,
  GalleryDeletedPublisher,
  GalleryImagesAddedPublisher
} from '../events/publishers/index.js';
import {
  CreateGalleryRequest,
  GalleryQuery,
  Gallery,
  GalleryImage,
  AddGalleryImagesRequest
} from '@tempsdarret/shared/schemas/portfolio.schema';

export class GalleryService {
  constructor(
    private readonly galleryRepository: GalleryRepository,
    private readonly galleryCreatedPublisher: GalleryCreatedPublisher,
    private readonly galleryUpdatedPublisher: GalleryUpdatedPublisher,
    private readonly galleryDeletedPublisher: GalleryDeletedPublisher,
    private readonly galleryImagesAddedPublisher: GalleryImagesAddedPublisher
  ) {}

  async createGallery(galleryData: CreateGalleryRequest): Promise<Gallery> {
    const savedGallery = await this.galleryRepository.create(galleryData);
    const gallery = savedGallery.toJSON() as Gallery;

    await this.galleryCreatedPublisher.publish(gallery);

    return gallery;
  }

  async getGallery(galleryId: string): Promise<Gallery | null> {
    const gallery = await this.galleryRepository.findById(galleryId);
    return gallery ? gallery.toJSON() as Gallery : null;
  }

  async updateGallery(galleryId: string, updateData: Partial<CreateGalleryRequest>): Promise<Gallery | null> {
    const updatedGallery = await this.galleryRepository.updateById(galleryId, updateData);

    if (updatedGallery) {
      await this.galleryUpdatedPublisher.publish(galleryId, updateData);
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
      await this.galleryDeletedPublisher.publish(galleryId);
    }

    return deleted;
  }

  async addImagesToGallery(galleryId: string, request: AddGalleryImagesRequest): Promise<GalleryImage[]> {
    const images = await this.galleryRepository.addImages(galleryId, request);

    await this.galleryImagesAddedPublisher.publish(galleryId, request.fileIds, images.length);

    return images.map(img => img.toJSON() as GalleryImage);
  }

  async getGalleryImages(galleryId: string): Promise<GalleryImage[]> {
    const images = await this.galleryRepository.getImages(galleryId);
    return images.map(img => img.toJSON() as GalleryImage);
  }
}
