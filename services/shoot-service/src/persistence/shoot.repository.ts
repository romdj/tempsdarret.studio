import { ShootModel, IShootDocument } from '../shared/contracts/shoots.mongoose';
import { CreateShootRequest, UpdateShootRequest, ShootQuery, Shoot } from '@tempsdarret/shared/schemas/shoot.schema';
import { generateShootId } from '../shared/utils/id';

export class ShootRepository {
  async create(shootData: CreateShootRequest): Promise<IShootDocument> {
    const shootDoc = new ShootModel({
      id: generateShootId(),
      ...shootData,
      status: 'planned'
    });

    return await shootDoc.save();
  }

  async findById(shootId: string): Promise<IShootDocument | null> {
    return await ShootModel.findOne({ id: shootId }).exec();
  }

  async findByReference(reference: string): Promise<IShootDocument | null> {
    return await ShootModel.findOne({ reference }).exec();
  }

  async updateById(shootId: string, updateData: UpdateShootRequest): Promise<IShootDocument | null> {
    return await ShootModel.findOneAndUpdate(
      { id: shootId },
      updateData,
      { new: true }
    ).exec();
  }

  async findMany(query: ShootQuery): Promise<{ shoots: IShootDocument[], total: number }> {
    // Build MongoDB filter
    const filter: any = {};
    if (query.photographerId) filter.photographerId = query.photographerId;
    if (query.clientEmail) filter.clientEmail = query.clientEmail;
    if (query.status) filter.status = query.status;
    if (query.fromDate || query.toDate) {
      filter.scheduledDate = {};
      if (query.fromDate) filter.scheduledDate.$gte = query.fromDate;
      if (query.toDate) filter.scheduledDate.$lte = query.toDate;
    }

    // Calculate pagination
    const skip = ((query.page || 1) - 1) * (query.limit || 20);

    // Execute queries in parallel
    const [shoots, total] = await Promise.all([
      ShootModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit || 20)
        .exec(),
      ShootModel.countDocuments(filter).exec()
    ]);

    return { shoots, total };
  }

  async deleteById(shootId: string): Promise<boolean> {
    const result = await ShootModel.deleteOne({ id: shootId }).exec();
    return result.deletedCount > 0;
  }
}