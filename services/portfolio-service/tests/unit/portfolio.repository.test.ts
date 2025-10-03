import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PortfolioRepository } from '../../src/persistence/portfolio.repository.js';
import { PortfolioModel } from '../../src/shared/contracts/portfolios.mongoose.js';
import { CreatePortfolioRequest } from '@tempsdarret/shared/schemas/portfolio.schema.js';

// Mock mongoose
vi.mock('../../src/shared/contracts/portfolios.mongoose.js', () => ({
  PortfolioModel: {
    prototype: {},
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn()
  }
}));

describe('PortfolioRepository', () => {
  let repository: PortfolioRepository;

  beforeEach(() => {
    repository = new PortfolioRepository();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new portfolio document', async () => {
      const portfolioData: CreatePortfolioRequest & { photographerId: string } = {
        photographerId: 'photographer-123',
        title: 'Wedding Portfolio',
        visibility: 'public',
        urlSlug: 'wedding-2024'
      };

      const mockSave = vi.fn().mockResolvedValue({
        id: 'pf-abc123',
        ...portfolioData
      });

      // Mock the PortfolioModel constructor
      (PortfolioModel as any).mockImplementation(() => ({
        save: mockSave
      }));

      const result = await repository.create(portfolioData);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  describe('findById', () => {
    it('should find portfolio by ID', async () => {
      const portfolioId = 'pf-abc123';
      const mockExec = vi.fn().mockResolvedValue({ id: portfolioId });

      (PortfolioModel.findOne as any).mockReturnValue({ exec: mockExec });

      const result = await repository.findById(portfolioId);

      expect(PortfolioModel.findOne).toHaveBeenCalledWith({ id: portfolioId });
      expect(mockExec).toHaveBeenCalled();
      expect(result).toEqual({ id: portfolioId });
    });
  });

  describe('findBySlug', () => {
    it('should find portfolio by URL slug', async () => {
      const urlSlug = 'wedding-2024';
      const mockExec = vi.fn().mockResolvedValue({ urlSlug });

      (PortfolioModel.findOne as any).mockReturnValue({ exec: mockExec });

      const result = await repository.findBySlug(urlSlug);

      expect(PortfolioModel.findOne).toHaveBeenCalledWith({ urlSlug });
      expect(result).toEqual({ urlSlug });
    });
  });

  describe('updateById', () => {
    it('should update portfolio by ID', async () => {
      const portfolioId = 'pf-abc123';
      const updateData = { title: 'Updated Title' };
      const mockExec = vi.fn().mockResolvedValue({ id: portfolioId, ...updateData });

      (PortfolioModel.findOneAndUpdate as any).mockReturnValue({ exec: mockExec });

      const result = await repository.updateById(portfolioId, updateData);

      expect(PortfolioModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: portfolioId },
        updateData,
        { new: true }
      );
      expect(result).toEqual({ id: portfolioId, ...updateData });
    });
  });

  describe('findMany', () => {
    it('should find portfolios with pagination and filters', async () => {
      const query = {
        photographerId: 'photographer-123',
        visibility: 'public' as const,
        isFeatured: true,
        page: 2,
        limit: 10
      };

      const mockPortfolios = [{ id: 'pf-1' }, { id: 'pf-2' }];
      const mockTotal = 25;

      const mockFindExec = vi.fn().mockResolvedValue(mockPortfolios);
      const mockCountExec = vi.fn().mockResolvedValue(mockTotal);

      const mockFindChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: mockFindExec
      };

      (PortfolioModel.find as any).mockReturnValue(mockFindChain);
      (PortfolioModel.countDocuments as any).mockReturnValue({ exec: mockCountExec });

      const result = await repository.findMany(query);

      expect(PortfolioModel.find).toHaveBeenCalledWith({
        photographerId: 'photographer-123',
        visibility: 'public',
        isFeatured: true
      });
      expect(mockFindChain.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
      expect(mockFindChain.limit).toHaveBeenCalledWith(10);
      expect(result.portfolios).toEqual(mockPortfolios);
      expect(result.total).toBe(mockTotal);
    });
  });

  describe('deleteById', () => {
    it('should delete portfolio and return true', async () => {
      const portfolioId = 'pf-abc123';
      const mockExec = vi.fn().mockResolvedValue({ deletedCount: 1 });

      (PortfolioModel.deleteOne as any).mockReturnValue({ exec: mockExec });

      const result = await repository.deleteById(portfolioId);

      expect(PortfolioModel.deleteOne).toHaveBeenCalledWith({ id: portfolioId });
      expect(result).toBe(true);
    });

    it('should return false if portfolio not found', async () => {
      const mockExec = vi.fn().mockResolvedValue({ deletedCount: 0 });

      (PortfolioModel.deleteOne as any).mockReturnValue({ exec: mockExec });

      const result = await repository.deleteById('non-existent');

      expect(result).toBe(false);
    });
  });
});
