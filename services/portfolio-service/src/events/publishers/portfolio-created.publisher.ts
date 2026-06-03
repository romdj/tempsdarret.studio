import { EventPublisher } from '../../shared/messaging';
import {
  PortfolioCreatedPayload,
  PORTFOLIO_EVENT_TYPES
} from '../../shared/contracts/portfolios.events';
import { generateEventId } from '../../shared/utils/id';
import type { Portfolio } from '@tempsdarret/shared/schemas/portfolio.schema';

export class PortfolioCreatedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(portfolio: Portfolio): Promise<void> {
    const event: PortfolioCreatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: PORTFOLIO_EVENT_TYPES.CREATED,
      data: {
        portfolioId: portfolio.id,
        photographerId: portfolio.photographerId,
        urlSlug: portfolio.urlSlug,
        createdAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('portfolios', event as unknown as Record<string, unknown>, portfolio.id);
  }
}
