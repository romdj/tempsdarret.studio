import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PortfolioServiceApp } from '../../src/main.js';
import { CreateGalleryRequest, AddGalleryImagesRequest } from '@tempsdarret/shared/schemas/portfolio.schema.js';

describe('Gallery API Integration Tests', () => {
  let app: PortfolioServiceApp;
  let server: any;
  let testPortfolioId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/tempsdarret-portfolios-test';
    process.env.KAFKA_BROKERS = 'localhost:9092';

    app = new PortfolioServiceApp();
    await app.start();
    server = app.getServer();

    // Create a test portfolio
    const portfolioResponse = await server.inject({
      method: 'POST',
      url: '/portfolios',
      payload: {
        photographerId: 'test-photographer',
        title: 'Test Portfolio for Galleries',
        visibility: 'public',
        urlSlug: 'gallery-test-portfolio'
      }
    });

    testPortfolioId = JSON.parse(portfolioResponse.body).data.id;
  });

  afterAll(async () => {
    await app.stop();
  });

  describe('POST /galleries', () => {
    it('should create a new gallery', async () => {
      const galleryData: CreateGalleryRequest = {
        portfolioId: testPortfolioId,
        shootId: 'shoot-123',
        type: 'client_gallery',
        title: 'Smith Wedding Gallery',
        description: 'Beautiful wedding photos',
        allowDownloads: true
      };

      const response = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: galleryData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('id');
      expect(body.data.title).toBe('Smith Wedding Gallery');
      expect(body.data.type).toBe('client_gallery');
      expect(body.message).toBe('Gallery created successfully');
    });

    it('should create portfolio showcase gallery', async () => {
      const galleryData: CreateGalleryRequest = {
        portfolioId: testPortfolioId,
        type: 'portfolio_showcase',
        title: 'Featured Weddings',
        coverImageUrl: 'https://example.com/cover.jpg'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: galleryData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.type).toBe('portfolio_showcase');
    });
  });

  describe('GET /galleries/:galleryId', () => {
    it('should retrieve gallery by ID', async () => {
      // Create gallery
      const createResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId: testPortfolioId,
          type: 'client_gallery',
          title: 'Retrieval Test Gallery'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Retrieve it
      const response = await server.inject({
        method: 'GET',
        url: `/galleries/${id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(id);
      expect(body.data.title).toBe('Retrieval Test Gallery');
    });

    it('should return 404 for non-existent gallery', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/galleries/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /galleries', () => {
    it('should list galleries with filters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/galleries?portfolioId=${testPortfolioId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toHaveProperty('total');

      // All galleries should belong to test portfolio
      body.data.forEach((gallery: any) => {
        expect(gallery.portfolioId).toBe(testPortfolioId);
      });
    });

    it('should filter by gallery type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/galleries?type=client_gallery'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((gallery: any) => {
        expect(gallery.type).toBe('client_gallery');
      });
    });
  });

  describe('PATCH /galleries/:galleryId', () => {
    it('should update gallery', async () => {
      // Create gallery
      const createResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId: testPortfolioId,
          type: 'client_gallery',
          title: 'Original Gallery Title',
          isPublished: false
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Update it
      const response = await server.inject({
        method: 'PATCH',
        url: `/galleries/${id}`,
        payload: {
          title: 'Updated Gallery Title',
          isPublished: true
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Updated Gallery Title');
      expect(body.data.isPublished).toBe(true);
    });
  });

  describe('POST /galleries/:galleryId/images', () => {
    it('should add images to gallery', async () => {
      // Create gallery
      const createResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId: testPortfolioId,
          type: 'portfolio_showcase',
          title: 'Image Test Gallery'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Add images
      const imageRequest: AddGalleryImagesRequest = {
        fileIds: ['file-1', 'file-2', 'file-3'],
        startOrder: 0
      };

      const response = await server.inject({
        method: 'POST',
        url: `/galleries/${id}/images`,
        payload: imageRequest
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(3);
      expect(body.data[0]).toHaveProperty('fileId', 'file-1');
      expect(body.message).toBe('Images added to gallery successfully');
    });
  });

  describe('GET /galleries/:galleryId/images', () => {
    it('should retrieve gallery images', async () => {
      // Create gallery and add images
      const createResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId: testPortfolioId,
          type: 'client_gallery',
          title: 'Image Retrieval Gallery'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      await server.inject({
        method: 'POST',
        url: `/galleries/${id}/images`,
        payload: { fileIds: ['file-a', 'file-b'] }
      });

      // Retrieve images
      const response = await server.inject({
        method: 'GET',
        url: `/galleries/${id}/images`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty('galleryId', id);
    });
  });

  describe('DELETE /galleries/:galleryId', () => {
    it('should delete gallery', async () => {
      // Create gallery
      const createResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId: testPortfolioId,
          type: 'client_gallery',
          title: 'Delete Test Gallery'
        }
      });

      const { id } = JSON.parse(createResponse.body).data;

      // Delete it
      const response = await server.inject({
        method: 'DELETE',
        url: `/galleries/${id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deleted).toBe(true);

      // Verify it's gone
      const getResponse = await server.inject({
        method: 'GET',
        url: `/galleries/${id}`
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
