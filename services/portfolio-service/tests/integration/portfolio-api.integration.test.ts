import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PortfolioServiceApp } from '../../src/main.js';
import { CreatePortfolioRequest, UpdatePortfolioRequest } from '@tempsdarret/shared/schemas/portfolio.schema.js';

describe('Portfolio API Integration Tests', () => {
  let app: PortfolioServiceApp;
  let server: any;
  const photographerId = 'photographer-test-123';

  beforeAll(async () => {
    // Use test database
    process.env.MONGODB_URI = 'mongodb://localhost:27017/tempsdarret-portfolios-test';
    process.env.KAFKA_BROKERS = 'localhost:9092';

    app = new PortfolioServiceApp();
    await app.start();
    server = app.getServer();
  });

  afterAll(async () => {
    await app.stop();
  });

  describe('POST /portfolios', () => {
    it('should create a new portfolio', async () => {
      const portfolioData: CreatePortfolioRequest & { photographerId: string } = {
        photographerId,
        title: 'Wedding Photography 2024',
        description: 'Beautiful wedding moments',
        visibility: 'public',
        urlSlug: 'wedding-2024-test',
        coverImageUrl: 'https://example.com/cover.jpg'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: portfolioData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('id');
      expect(body.data.title).toBe('Wedding Photography 2024');
      expect(body.data.urlSlug).toBe('wedding-2024-test');
      expect(body.message).toBe('Portfolio created successfully');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        photographerId,
        title: '', // Empty title should fail validation
        visibility: 'public',
        urlSlug: 'test'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Validation error');
    });

    it('should return 500 for duplicate slug', async () => {
      const portfolioData = {
        photographerId,
        title: 'Duplicate Test',
        visibility: 'public',
        urlSlug: 'duplicate-slug-test'
      };

      // Create first portfolio
      await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: portfolioData
      });

      // Try to create with same slug
      const response = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: portfolioData
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('slug already exists');
    });
  });

  describe('GET /portfolios/:portfolioId', () => {
    it('should retrieve portfolio by ID', async () => {
      // Create a portfolio first
      const createResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Get Test Portfolio',
          visibility: 'public',
          urlSlug: 'get-test-slug'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Retrieve it
      const response = await server.inject({
        method: 'GET',
        url: `/portfolios/${id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(id);
      expect(body.data.title).toBe('Get Test Portfolio');
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/portfolios/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Portfolio not found');
    });
  });

  describe('GET /portfolios/slug/:urlSlug', () => {
    it('should retrieve portfolio by URL slug', async () => {
      const urlSlug = 'slug-retrieval-test';

      await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Slug Test Portfolio',
          visibility: 'public',
          urlSlug
        }
      });

      const response = await server.inject({
        method: 'GET',
        url: `/portfolios/slug/${urlSlug}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.urlSlug).toBe(urlSlug);
    });
  });

  describe('GET /portfolios', () => {
    it('should list portfolios with filters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/portfolios?photographerId=${photographerId}&page=1&limit=10`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toHaveProperty('page', 1);
      expect(body.meta).toHaveProperty('limit', 10);
      expect(body.meta).toHaveProperty('total');
    });

    it('should filter by visibility', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/portfolios?visibility=public'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((portfolio: any) => {
        expect(portfolio.visibility).toBe('public');
      });
    });
  });

  describe('PATCH /portfolios/:portfolioId', () => {
    it('should update portfolio', async () => {
      // Create portfolio
      const createResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Original Title',
          visibility: 'private',
          urlSlug: 'update-test-portfolio'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Update it
      const updateData: UpdatePortfolioRequest = {
        title: 'Updated Title',
        isFeatured: true
      };

      const response = await server.inject({
        method: 'PATCH',
        url: `/portfolios/${id}`,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.isFeatured).toBe(true);
      expect(body.message).toBe('Portfolio updated successfully');
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/portfolios/non-existent',
        payload: { title: 'Test' }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /portfolios/:portfolioId', () => {
    it('should delete portfolio', async () => {
      // Create portfolio
      const createResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Delete Test',
          visibility: 'public',
          urlSlug: 'delete-test-portfolio'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Delete it
      const response = await server.inject({
        method: 'DELETE',
        url: `/portfolios/${id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deleted).toBe(true);
      expect(body.message).toBe('Portfolio deleted successfully');

      // Verify it's gone
      const getResponse = await server.inject({
        method: 'GET',
        url: `/portfolios/${id}`
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
