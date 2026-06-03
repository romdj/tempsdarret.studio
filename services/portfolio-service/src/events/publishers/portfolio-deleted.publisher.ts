import { EventPublisher } from '../../shared/messaging';
import {
  PortfolioDeletedPayload,
  PORTFOLIO_EVENT_TYPES
} from '../../shared/contracts/portfolios.events';
import { generateEventId } from '../../shared/utils/id';

export class PortfolioDeletedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(portfolioId: string): Promise<void> {
    const event: PortfolioDeletedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'portfolio-service',
      eventType: PORTFOLIO_EVENT_TYPES.DELETED,
      data: {
        portfolioId,
        deletedAt: new Date().toISOString()
      }
    };

    await this.eventPublisher.publish('portfolios', event as unknown as Record<string, unknown>, portfolioId);
  }
}
