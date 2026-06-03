/**
 * Portfolio Service Event Contracts — `portfolios` channel
 * Direct mapping to AsyncAPI 3.0 portfolio event schemas (ADR-023).
 *
 * Source of truth for portfolio.* events. The corresponding entries in
 * packages/events/src/contracts/portfolios.events.ts and the generator at
 * packages/events/scripts/generate-from-typescript.js must stay aligned.
 */

// Base event structure per ADR-023 AsyncAPI specification.
// Defined locally so portfolio-service has no implicit dependency on shoot-service contracts.
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
}

// Domain payloads -----------------------------------------------------------

export interface PortfolioCreatedData {
  portfolioId: string;
  photographerId: string;
  urlSlug: string;
  createdAt: string;
}

export interface PortfolioUpdatedData {
  portfolioId: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}

export interface PortfolioDeletedData {
  portfolioId: string;
  deletedAt: string;
}

// Envelope payloads ---------------------------------------------------------

export interface PortfolioCreatedPayload extends BaseEvent {
  eventType: 'portfolio.created';
  data: PortfolioCreatedData;
}

export interface PortfolioUpdatedPayload extends BaseEvent {
  eventType: 'portfolio.updated';
  data: PortfolioUpdatedData;
}

export interface PortfolioDeletedPayload extends BaseEvent {
  eventType: 'portfolio.deleted';
  data: PortfolioDeletedData;
}

export type PortfolioEvent =
  | PortfolioCreatedPayload
  | PortfolioUpdatedPayload
  | PortfolioDeletedPayload;

// Event type constants -----------------------------------------------------

export const PORTFOLIO_EVENT_TYPES = {
  CREATED: 'portfolio.created',
  UPDATED: 'portfolio.updated',
  DELETED: 'portfolio.deleted',
} as const;

export type PortfolioEventType =
  typeof PORTFOLIO_EVENT_TYPES[keyof typeof PORTFOLIO_EVENT_TYPES];
