import { ShootRepository } from '../persistence/shoot.repository.js';

export interface GalleryView {
  shootId: string;
  title: string;
  description?: string;
  coverImage?: GalleryImage;
  images: GalleryImage[];
  metadata: {
    totalImages: number;
    allowDownloads: boolean;
    lastUpdated: Date;
  };
}

export interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  isFeatured: boolean;
  downloadUrl?: string;
}

export class GalleryCompilationService {
  constructor(private readonly shootRepository: ShootRepository) {}

  /**
   * Aggregate media from File Service into organized gallery
   * Steps:
   * 1. Fetch all shoot images from File Service
   * 2. Apply client visibility filters
   * 3. Sort by display order and featured status
   * 4. Include download permissions per file
   */
  async compileShootGallery(shootId: string, includeDownloadUrls: boolean = false): Promise<GalleryView> {
    const shoot = await this.shootRepository.findById(shootId);

    if (!shoot) {
      throw new Error('Shoot not found');
    }

    // TODO: Fetch images from file-service
    // For now, return placeholder structure
    const images: GalleryImage[] = [];

    // Get featured images first
    const featuredImages = shoot.media?.featuredImageIds || [];

    // TODO: Map featured image IDs to actual image data from file-service
    // const featuredGalleryImages = await this.fetchImagesFromFileService(
    //   shootId,
    //   featuredImages,
    //   includeDownloadUrls && shoot.access?.allowDownloads
    // );

    // TODO: Fetch remaining non-featured images
    // const regularImages = await this.fetchRemainingImages(
    //   shootId,
    //   featuredImages,
    //   includeDownloadUrls && shoot.access?.allowDownloads
    // );

    // Sort: featured first, then by upload date
    const sortedImages = [
      // ...featuredGalleryImages,
      // ...regularImages
    ];

    return {
      shootId: shoot.id,
      title: shoot.title,
      description: shoot.description,
      coverImage: shoot.media?.coverImageId
        ? undefined // TODO: fetch from file-service
        : undefined,
      images: sortedImages,
      metadata: {
        totalImages: shoot.media?.totalImages || 0,
        allowDownloads: shoot.access?.allowDownloads || false,
        lastUpdated: shoot.media?.lastUpdated || shoot.updatedAt
      }
    };
  }

  /**
   * Fetch images from file service
   * This is a placeholder - actual implementation would call file-service API
   */
  private async fetchImagesFromFileService(
    shootId: string,
    imageIds: string[],
    includeDownloadUrls: boolean
  ): Promise<GalleryImage[]> {
    // TODO: Implement actual file-service integration
    // Example:
    // const fileService = new FileServiceClient();
    // const images = await fileService.getImagesByIds(shootId, imageIds);
    // return images.map(img => this.mapToGalleryImage(img, includeDownloadUrls));

    return [];
  }

  private mapToGalleryImage(fileData: any, includeDownloadUrl: boolean): GalleryImage {
    return {
      id: fileData.id,
      url: fileData.urls.high,
      thumbnailUrl: fileData.urls.thumb,
      caption: fileData.caption,
      isFeatured: fileData.isFeatured || false,
      downloadUrl: includeDownloadUrl ? fileData.downloadUrl : undefined
    };
  }
}
