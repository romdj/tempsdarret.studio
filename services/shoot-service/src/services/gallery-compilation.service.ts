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
  async compileShootGallery(
    shootId: string,
    _includeDownloadUrls = false
  ): Promise<GalleryView> {
    const shoot = await this.shootRepository.findById(shootId);

    if (!shoot) {
      throw new Error('Shoot not found');
    }

    // TODO: Fetch images from file-service
    // For now, return placeholder structure

    // Get featured images first (currently unused until file-service integration)
    // const featuredImages = shoot.media?.featuredImageIds ?? [];

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
    const sortedImages: GalleryImage[] = [
      // ...featuredGalleryImages,
      // ...regularImages
    ];

    return {
      shootId: shoot.id,
      title: shoot.title,
      // TODO: Add description to Shoot schema when needed
      images: sortedImages,
      metadata: {
        totalImages: 0, // TODO: Integrate with file-service
        allowDownloads: false, // TODO: Add access settings to Shoot schema
        lastUpdated: shoot.updatedAt
      }
    };
  }

  /**
   * Fetch images from file service
   * This is a placeholder - actual implementation would call file-service API
   */
  private async fetchImagesFromFileService(
    _shootId: string,
    _imageIds: string[],
    _includeDownloadUrls: boolean
  ): Promise<GalleryImage[]> {
    // TODO: Implement actual file-service integration
    // Example:
    // const fileService = new FileServiceClient();
    // const images = await fileService.getImagesByIds(shootId, imageIds);
    // return images.map(img => this.mapToGalleryImage(img, includeDownloadUrls));

    return [];
  }

  private mapToGalleryImage(
    fileData: Record<string, unknown>,
    includeDownloadUrl: boolean
  ): GalleryImage {
    const urls = fileData['urls'] as Record<string, unknown> | undefined;
    const caption = fileData['caption'] as string | undefined;
    const downloadUrl = includeDownloadUrl
      ? (fileData['downloadUrl'] as string | undefined)
      : undefined;

    const image: GalleryImage = {
      id: fileData['id'] as string,
      url: urls?.['high'] as string ?? '',
      thumbnailUrl: urls?.['thumb'] as string ?? '',
      isFeatured: (fileData['isFeatured'] as boolean | undefined) ?? false
    };

    if (caption !== undefined) {
      image.caption = caption;
    }
    if (downloadUrl !== undefined) {
      image.downloadUrl = downloadUrl;
    }

    return image;
  }
}
