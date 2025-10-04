import { PortfolioModel, IPortfolioDocument } from '../shared/contracts/portfolios.mongoose.js';
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioQuery
} from '@tempsdarret/shared/schemas/portfolio.schema.js';
import { generatePortfolioId } from '../shared/utils/id.js';

export class PortfolioRepository {
  async create(portfolioData: CreatePortfolioRequest & { photographerId: string }): Promise<IPortfolioDocument> {
    const portfolioDoc = new PortfolioModel({
      id: generatePortfolioId(),
      ...portfolioData
    });

    return await portfolioDoc.save();
  }

  async findById(portfolioId: string): Promise<IPortfolioDocument | null> {
    return await PortfolioModel.findOne({ id: portfolioId }).exec();
  }

  async findBySlug(urlSlug: string): Promise<IPortfolioDocument | null> {
    return await PortfolioModel.findOne({ urlSlug }).exec();
  }

  async updateById(portfolioId: string, updateData: UpdatePortfolioRequest): Promise<IPortfolioDocument | null> {
    return await PortfolioModel.findOneAndUpdate(
      { id: portfolioId },
      updateData,
      { new: true }
    ).exec();
  }

  async findMany(query: PortfolioQuery): Promise<{ portfolios: IPortfolioDocument[], total: number }> {
    const filter = {
      ...(query.photographerId && { photographerId: query.photographerId }),
      ...(query.visibility && { visibility: query.visibility }),
      ...(query.isFeatured !== undefined && { isFeatured: query.isFeatured })
    };

    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);

    const [portfolios, total] = await Promise.all([
      PortfolioModel.find(filter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit ?? 20)
        .exec(),
      PortfolioModel.countDocuments(filter).exec()
    ]);

    return { portfolios, total };
  }

  async deleteById(portfolioId: string): Promise<boolean> {
    const result = await PortfolioModel.deleteOne({ id: portfolioId }).exec();
    return result.deletedCount > 0;
  }
}
