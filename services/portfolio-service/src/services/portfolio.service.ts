import { PortfolioRepository } from '../persistence/portfolio.repository.js';
import {
  PortfolioCreatedPublisher,
  PortfolioUpdatedPublisher,
  PortfolioDeletedPublisher
} from '../events/publishers/index.js';
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioQuery,
  Portfolio
} from '@tempsdarret/shared/schemas/portfolio.schema';

export class PortfolioService {
  constructor(
    private readonly portfolioRepository: PortfolioRepository,
    private readonly portfolioCreatedPublisher: PortfolioCreatedPublisher,
    private readonly portfolioUpdatedPublisher: PortfolioUpdatedPublisher,
    private readonly portfolioDeletedPublisher: PortfolioDeletedPublisher
  ) {}

  async createPortfolio(photographerId: string, portfolioData: CreatePortfolioRequest): Promise<Portfolio> {
    const existing = await this.portfolioRepository.findBySlug(portfolioData.urlSlug);
    if (existing) {
      throw new Error('Portfolio URL slug already exists');
    }

    const savedPortfolio = await this.portfolioRepository.create({
      ...portfolioData,
      photographerId
    });

    const portfolio = savedPortfolio.toJSON() as Portfolio;
    await this.portfolioCreatedPublisher.publish(portfolio);

    return portfolio;
  }

  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    const portfolio = await this.portfolioRepository.findById(portfolioId);
    return portfolio ? portfolio.toJSON() as Portfolio : null;
  }

  async getPortfolioBySlug(urlSlug: string): Promise<Portfolio | null> {
    const portfolio = await this.portfolioRepository.findBySlug(urlSlug);
    return portfolio ? portfolio.toJSON() as Portfolio : null;
  }

  async updatePortfolio(portfolioId: string, updateData: UpdatePortfolioRequest): Promise<Portfolio | null> {
    if (updateData.urlSlug) {
      const existing = await this.portfolioRepository.findBySlug(updateData.urlSlug);
      if (existing && existing.id !== portfolioId) {
        throw new Error('Portfolio URL slug already exists');
      }
    }

    const updatedPortfolio = await this.portfolioRepository.updateById(portfolioId, updateData);

    if (updatedPortfolio) {
      await this.portfolioUpdatedPublisher.publish(portfolioId, updateData);
    }

    return updatedPortfolio ? updatedPortfolio.toJSON() as Portfolio : null;
  }

  async listPortfolios(query: PortfolioQuery): Promise<{ portfolios: Portfolio[], total: number }> {
    const { portfolios, total } = await this.portfolioRepository.findMany(query);

    return {
      portfolios: portfolios.map(p => p.toJSON() as Portfolio),
      total
    };
  }

  async deletePortfolio(portfolioId: string): Promise<boolean> {
    const deleted = await this.portfolioRepository.deleteById(portfolioId);

    if (deleted) {
      await this.portfolioDeletedPublisher.publish(portfolioId);
    }

    return deleted;
  }
}
