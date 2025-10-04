import { PortfolioRepository } from '../persistence/portfolio.repository.js';
import { EventPublisher } from '../shared/messaging/event-publisher.js';
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioQuery,
  Portfolio
} from '@tempsdarret/shared/schemas/portfolio.schema.js';

export class PortfolioService {
  constructor(
    private readonly portfolioRepository: PortfolioRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createPortfolio(photographerId: string, portfolioData: CreatePortfolioRequest): Promise<Portfolio> {
    // Check if slug is already taken
    const existing = await this.portfolioRepository.findBySlug(portfolioData.urlSlug);
    if (existing) {
      throw new Error('Portfolio URL slug already exists');
    }

    // Save to database
    const savedPortfolio = await this.portfolioRepository.create({
      ...portfolioData,
      photographerId
    });

    // Publish event
    await this.eventPublisher.publish('portfolios', {
      eventType: 'portfolio.created',
      portfolioId: savedPortfolio.id,
      photographerId,
      urlSlug: savedPortfolio.urlSlug,
      timestamp: new Date().toISOString()
    }, savedPortfolio.id);

    return savedPortfolio.toJSON() as Portfolio;
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
    // If slug is being updated, check if it's available
    if (updateData.urlSlug) {
      const existing = await this.portfolioRepository.findBySlug(updateData.urlSlug);
      if (existing !== null && existing.id !== portfolioId) {
        throw new Error('Portfolio URL slug already exists');
      }
    }

    const updatedPortfolio = await this.portfolioRepository.updateById(portfolioId, updateData);

    if (updatedPortfolio !== null) {
      await this.eventPublisher.publish('portfolios', {
        eventType: 'portfolio.updated',
        portfolioId,
        changes: updateData,
        timestamp: new Date().toISOString()
      }, portfolioId);
    }

    return updatedPortfolio !== null ? updatedPortfolio.toJSON() as Portfolio : null;
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
      await this.eventPublisher.publish('portfolios', {
        eventType: 'portfolio.deleted',
        portfolioId,
        timestamp: new Date().toISOString()
      }, portfolioId);
    }

    return deleted;
  }
}
