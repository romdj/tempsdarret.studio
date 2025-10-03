import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '../../src/services/portfolio.service.js';
import { PortfolioRepository } from '../../src/persistence/portfolio.repository.js';
import { EventPublisher } from '../../src/shared/messaging/event-publisher.js';
import { CreatePortfolioRequest, UpdatePortfolioRequest } from '@tempsdarret/shared/schemas/portfolio.schema.js';

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  let mockRepository: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      updateById: vi.fn(),
      findMany: vi.fn(),
      deleteById: vi.fn()
    };

    mockEventPublisher = {
      publish: vi.fn()
    };

    portfolioService = new PortfolioService(mockRepository, mockEventPublisher);
  });

  describe('createPortfolio', () => {
    it('should create a portfolio successfully', async () => {
      const photographerId = 'photographer-123';
      const portfolioData: CreatePortfolioRequest = {
        title: 'Wedding Photography 2024',
        description: 'Best wedding shots',
        visibility: 'public',
        urlSlug: 'wedding-2024',
        coverImageUrl: 'https://example.com/cover.jpg'
      };

      const mockSavedPortfolio = {
        id: 'pf-abc123',
        photographerId,
        ...portfolioData,
        isFeatured: false,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({ id: 'pf-abc123', ...portfolioData })
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockSavedPortfolio);

      const result = await portfolioService.createPortfolio(photographerId, portfolioData);

      expect(mockRepository.findBySlug).toHaveBeenCalledWith('wedding-2024');
      expect(mockRepository.create).toHaveBeenCalledWith({ ...portfolioData, photographerId });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'portfolios',
        expect.objectContaining({
          eventType: 'portfolio.created',
          portfolioId: 'pf-abc123',
          photographerId,
          urlSlug: 'wedding-2024'
        }),
        'pf-abc123'
      );
      expect(result).toEqual({ id: 'pf-abc123', ...portfolioData });
    });

    it('should throw error if slug already exists', async () => {
      const portfolioData: CreatePortfolioRequest = {
        title: 'Test Portfolio',
        visibility: 'public',
        urlSlug: 'existing-slug'
      };

      mockRepository.findBySlug.mockResolvedValue({ id: 'existing-id' });

      await expect(
        portfolioService.createPortfolio('photographer-123', portfolioData)
      ).rejects.toThrow('Portfolio URL slug already exists');
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio successfully', async () => {
      const portfolioId = 'pf-abc123';
      const updateData: UpdatePortfolioRequest = {
        title: 'Updated Title',
        isFeatured: true
      };

      const mockUpdatedPortfolio = {
        id: portfolioId,
        ...updateData,
        toJSON: () => ({ id: portfolioId, ...updateData })
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.updateById.mockResolvedValue(mockUpdatedPortfolio);

      const result = await portfolioService.updatePortfolio(portfolioId, updateData);

      expect(mockRepository.updateById).toHaveBeenCalledWith(portfolioId, updateData);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'portfolios',
        expect.objectContaining({
          eventType: 'portfolio.updated',
          portfolioId
        }),
        portfolioId
      );
      expect(result).toEqual({ id: portfolioId, ...updateData });
    });

    it('should validate slug uniqueness when updating', async () => {
      const portfolioId = 'pf-abc123';
      const updateData: UpdatePortfolioRequest = {
        urlSlug: 'new-slug'
      };

      mockRepository.findBySlug.mockResolvedValue({ id: 'different-id' });

      await expect(
        portfolioService.updatePortfolio(portfolioId, updateData)
      ).rejects.toThrow('Portfolio URL slug already exists');
    });

    it('should allow same portfolio to keep its slug', async () => {
      const portfolioId = 'pf-abc123';
      const updateData: UpdatePortfolioRequest = {
        urlSlug: 'same-slug',
        title: 'Updated Title'
      };

      const existingPortfolio = { id: portfolioId };
      mockRepository.findBySlug.mockResolvedValue(existingPortfolio);
      mockRepository.updateById.mockResolvedValue({ id: portfolioId, toJSON: () => ({}) });

      await expect(
        portfolioService.updatePortfolio(portfolioId, updateData)
      ).resolves.toBeDefined();
    });
  });

  describe('getPortfolio', () => {
    it('should retrieve portfolio by ID', async () => {
      const portfolioId = 'pf-abc123';
      const mockPortfolio = {
        id: portfolioId,
        title: 'Test Portfolio',
        toJSON: () => ({ id: portfolioId, title: 'Test Portfolio' })
      };

      mockRepository.findById.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getPortfolio(portfolioId);

      expect(mockRepository.findById).toHaveBeenCalledWith(portfolioId);
      expect(result).toEqual({ id: portfolioId, title: 'Test Portfolio' });
    });

    it('should return null if portfolio not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await portfolioService.getPortfolio('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getPortfolioBySlug', () => {
    it('should retrieve portfolio by URL slug', async () => {
      const mockPortfolio = {
        id: 'pf-abc123',
        urlSlug: 'wedding-2024',
        toJSON: () => ({ id: 'pf-abc123', urlSlug: 'wedding-2024' })
      };

      mockRepository.findBySlug.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getPortfolioBySlug('wedding-2024');

      expect(mockRepository.findBySlug).toHaveBeenCalledWith('wedding-2024');
      expect(result).toEqual({ id: 'pf-abc123', urlSlug: 'wedding-2024' });
    });
  });

  describe('listPortfolios', () => {
    it('should list portfolios with query filters', async () => {
      const query = {
        photographerId: 'photographer-123',
        visibility: 'public' as const,
        page: 1,
        limit: 20
      };

      const mockPortfolios = [
        { id: 'pf-1', toJSON: () => ({ id: 'pf-1' }) },
        { id: 'pf-2', toJSON: () => ({ id: 'pf-2' }) }
      ];

      mockRepository.findMany.mockResolvedValue({
        portfolios: mockPortfolios,
        total: 2
      });

      const result = await portfolioService.listPortfolios(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith(query);
      expect(result.portfolios).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('deletePortfolio', () => {
    it('should delete portfolio and publish event', async () => {
      const portfolioId = 'pf-abc123';
      mockRepository.deleteById.mockResolvedValue(true);

      const result = await portfolioService.deletePortfolio(portfolioId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(portfolioId);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'portfolios',
        expect.objectContaining({
          eventType: 'portfolio.deleted',
          portfolioId
        }),
        portfolioId
      );
      expect(result).toBe(true);
    });

    it('should return false if portfolio not found', async () => {
      mockRepository.deleteById.mockResolvedValue(false);

      const result = await portfolioService.deletePortfolio('non-existent');

      expect(result).toBe(false);
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
