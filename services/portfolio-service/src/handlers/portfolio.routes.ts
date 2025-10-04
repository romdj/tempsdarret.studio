import { FastifyInstance } from 'fastify';
import { PortfolioHandlers } from './portfolio.handlers.js';

export function registerPortfolioRoutes(fastify: FastifyInstance, handlers: PortfolioHandlers): void {
  // Portfolio CRUD operations
  fastify.post('/portfolios', handlers.createPortfolio.bind(handlers));
  fastify.get('/portfolios', handlers.listPortfolios.bind(handlers));
  fastify.get('/portfolios/:portfolioId', handlers.getPortfolio.bind(handlers));
  fastify.get('/portfolios/slug/:urlSlug', handlers.getPortfolioBySlug.bind(handlers));
  fastify.patch('/portfolios/:portfolioId', handlers.updatePortfolio.bind(handlers));
  fastify.delete('/portfolios/:portfolioId', handlers.deletePortfolio.bind(handlers));
}
