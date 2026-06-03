import { EventPublisher } from '../../shared/messaging';
import {
  PortfolioUpdatedPayload,
  PORTFOLIO_EVENT_TYPES
} from '../../shared/contracts/portfolios.events';
import { generateEventId } from '../../shared/utils/id';
import type { UpdatePortfolioRequest } from '@tempsdarret/shared/schemas/portfolio.schema';

export class PortfolioUpdatedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(portfolioId: string, changes: UpdatePortfolioRequest): Promise<void> {
    const event: PortfolioUpdatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: PORTFOLIO_EVENT_TYPES.UPDATED,
      data: {
        portfolioId,
        changes: changes as unknown as Record<string, unknown>,
        updatedAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('portfolios', event as unknown as Record<string, unknown>, portfolioId);
  }
}
