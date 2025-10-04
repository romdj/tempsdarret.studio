import {
  GalleryModel,
  IGalleryDocument,
  GalleryImageModel,
  IGalleryImageDocument
} from '../shared/contracts/galleries.mongoose.js';
import {
  CreateGalleryRequest,
  GalleryQuery,
  AddGalleryImagesRequest
} from '@tempsdarret/shared/schemas/portfolio.schema.js';
import { generateGalleryId, generateGalleryImageId } from '../shared/utils/id.js';

export class GalleryRepository {
  async create(galleryData: CreateGalleryRequest): Promise<IGalleryDocument> {
    const galleryDoc = new GalleryModel({
      id: generateGalleryId(),
      ...galleryData
    });

    return await galleryDoc.save();
  }

  async findById(galleryId: string): Promise<IGalleryDocument | null> {
    return await GalleryModel.findOne({ id: galleryId }).exec();
  }

  async updateById(galleryId: string, updateData: Partial<CreateGalleryRequest>): Promise<IGalleryDocument | null> {
    return await GalleryModel.findOneAndUpdate(
      { id: galleryId },
      updateData,
      { new: true }
    ).exec();
  }

  async findMany(query: GalleryQuery): Promise<{ galleries: IGalleryDocument[], total: number }> {
    const filter: Record<string, unknown> = {};
    if (query.portfolioId) {
      filter.portfolioId = query.portfolioId;
    }
    if (query.shootId) {
      filter.shootId = query.shootId;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.isPublished !== undefined) {filter.isPublished = query.isPublished;}

    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);

    const [galleries, total] = await Promise.all([
      GalleryModel.find(filter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit ?? 20)
        .exec(),
      GalleryModel.countDocuments(filter).exec()
    ]);

    return { galleries, total };
  }

  async deleteById(galleryId: string): Promise<boolean> {
    const result = await GalleryModel.deleteOne({ id: galleryId }).exec();
    return result.deletedCount > 0;
  }

  // Gallery Images
  async addImages(galleryId: string, request: AddGalleryImagesRequest): Promise<IGalleryImageDocument[]> {
    const startOrder = request.startOrder ?? 0;

    const imageDocs = request.fileIds.map((fileId, index) => ({
      id: generateGalleryImageId(),
      galleryId,
      fileId,
      displayOrder: startOrder + index,
      isFeatured: false
    }));

    return await GalleryImageModel.insertMany(imageDocs);
  }

  async getImages(galleryId: string): Promise<IGalleryImageDocument[]> {
    return await GalleryImageModel.find({ galleryId })
      .sort({ displayOrder: 1 })
      .exec();
  }

  async deleteImage(imageId: string): Promise<boolean> {
    const result = await GalleryImageModel.deleteOne({ id: imageId }).exec();
    return result.deletedCount > 0;
  }
}
