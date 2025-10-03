import { FastifyRequest, FastifyReply } from 'fastify';
import { PortfolioService } from '../services/portfolio.service.js';
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioQuery
} from '@tempsdarret/shared/schemas/portfolio.schema.js';
import { ZodError } from 'zod';

export class PortfolioHandlers {
  constructor(private readonly portfolioService: PortfolioService) {}

  async createPortfolio(
    request: FastifyRequest<{ Body: CreatePortfolioRequest & { photographerId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { photographerId, ...portfolioData } = request.body;
      const portfolio = await this.portfolioService.createPortfolio(photographerId, portfolioData);

      reply.code(201).send({
        data: portfolio,
        message: 'Portfolio created successfully'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400).send({
          code: 400,
          message: 'Validation error',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }

      console.error('Failed to create portfolio:', error);
      reply.code(500).send({
        code: 500,
        message: error instanceof Error ? error.message : 'Failed to create portfolio'
      });
    }
  }

  async getPortfolio(request: FastifyRequest<{ Params: { portfolioId: string } }>, reply: FastifyReply) {
    try {
      const portfolio = await this.portfolioService.getPortfolio(request.params.portfolioId);

      if (!portfolio) {
        reply.code(404).send({
          code: 404,
          message: 'Portfolio not found'
        });
        return;
      }

      reply.send({ data: portfolio });
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to get portfolio'
      });
    }
  }

  async getPortfolioBySlug(request: FastifyRequest<{ Params: { urlSlug: string } }>, reply: FastifyReply) {
    try {
      const portfolio = await this.portfolioService.getPortfolioBySlug(request.params.urlSlug);

      if (!portfolio) {
        reply.code(404).send({
          code: 404,
          message: 'Portfolio not found'
        });
        return;
      }

      reply.send({ data: portfolio });
    } catch (error) {
      console.error('Failed to get portfolio by slug:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to get portfolio'
      });
    }
  }

  async updatePortfolio(
    request: FastifyRequest<{ Params: { portfolioId: string }, Body: UpdatePortfolioRequest }>,
    reply: FastifyReply
  ) {
    try {
      const portfolio = await this.portfolioService.updatePortfolio(request.params.portfolioId, request.body);

      if (!portfolio) {
        reply.code(404).send({
          code: 404,
          message: 'Portfolio not found'
        });
        return;
      }

      reply.send({
        data: portfolio,
        message: 'Portfolio updated successfully'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400).send({
          code: 400,
          message: 'Validation error',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }

      console.error('Failed to update portfolio:', error);
      reply.code(500).send({
        code: 500,
        message: error instanceof Error ? error.message : 'Failed to update portfolio'
      });
    }
  }

  async listPortfolios(request: FastifyRequest<{ Querystring: PortfolioQuery }>, reply: FastifyReply) {
    try {
      const { portfolios, total } = await this.portfolioService.listPortfolios(request.query);

      const { page, limit } = request.query;
      const totalPages = Math.ceil(total / (limit || 20));

      reply.send({
        data: portfolios,
        meta: {
          page: page || 1,
          limit: limit || 20,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Failed to list portfolios:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to list portfolios'
      });
    }
  }

  async deletePortfolio(request: FastifyRequest<{ Params: { portfolioId: string } }>, reply: FastifyReply) {
    try {
      const deleted = await this.portfolioService.deletePortfolio(request.params.portfolioId);

      if (!deleted) {
        reply.code(404).send({
          code: 404,
          message: 'Portfolio not found'
        });
        return;
      }

      reply.send({
        data: { deleted: true },
        message: 'Portfolio deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete portfolio:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to delete portfolio'
      });
    }
  }
}
