/**
 * Portfolio Service Event Contracts
 * Consolidated from portfolio-service TypeScript contracts.
 *
 * KEEP IN SYNC with:
 *   - services/portfolio-service/src/shared/contracts/portfolios.events.ts
 *   - packages/events/scripts/generate-from-typescript.js (channels + schemas)
 */

import type { BaseEvent } from './shoots.events.js';

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

export const PORTFOLIO_EVENT_TYPES = {
  CREATED: 'portfolio.created',
  UPDATED: 'portfolio.updated',
  DELETED: 'portfolio.deleted',
} as const;

export type PortfolioEventType =
  typeof PORTFOLIO_EVENT_TYPES[keyof typeof PORTFOLIO_EVENT_TYPES];
