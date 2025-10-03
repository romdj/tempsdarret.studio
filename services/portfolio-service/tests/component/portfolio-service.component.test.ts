import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PortfolioServiceApp } from '../../src/main.js';

/**
 * Component tests verify complete portfolio service workflows
 * including service layer, repositories, and event publishing
 */
describe('Portfolio Service Component Tests', () => {
  let app: PortfolioServiceApp;
  let server: any;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/tempsdarret-portfolios-component-test';
    process.env.KAFKA_BROKERS = 'localhost:9092';

    app = new PortfolioServiceApp();
    await app.start();
    server = app.getServer();
  });

  afterAll(async () => {
    await app.stop();
  });

  describe('Portfolio Lifecycle Workflow', () => {
    it('should handle complete portfolio creation to deletion workflow', async () => {
      const photographerId = 'photographer-lifecycle-test';

      // 1. Create portfolio
      const createResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Lifecycle Test Portfolio',
          description: 'Testing complete lifecycle',
          visibility: 'private',
          urlSlug: 'lifecycle-test-portfolio'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const { id: portfolioId } = JSON.parse(createResponse.body).data;

      // 2. Retrieve by ID
      const getResponse = await server.inject({
        method: 'GET',
        url: `/portfolios/${portfolioId}`
      });

      expect(getResponse.statusCode).toBe(200);
      expect(JSON.parse(getResponse.body).data.title).toBe('Lifecycle Test Portfolio');

      // 3. Retrieve by slug
      const slugResponse = await server.inject({
        method: 'GET',
        url: '/portfolios/slug/lifecycle-test-portfolio'
      });

      expect(slugResponse.statusCode).toBe(200);

      // 4. Update portfolio
      const updateResponse = await server.inject({
        method: 'PATCH',
        url: `/portfolios/${portfolioId}`,
        payload: {
          title: 'Updated Lifecycle Portfolio',
          isFeatured: true,
          visibility: 'public'
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = JSON.parse(updateResponse.body).data;
      expect(updated.title).toBe('Updated Lifecycle Portfolio');
      expect(updated.isFeatured).toBe(true);
      expect(updated.visibility).toBe('public');

      // 5. List portfolios (should include updated portfolio)
      const listResponse = await server.inject({
        method: 'GET',
        url: `/portfolios?photographerId=${photographerId}&visibility=public`
      });

      expect(listResponse.statusCode).toBe(200);
      const list = JSON.parse(listResponse.body);
      const found = list.data.find((p: any) => p.id === portfolioId);
      expect(found).toBeDefined();
      expect(found.isFeatured).toBe(true);

      // 6. Delete portfolio
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: `/portfolios/${portfolioId}`
      });

      expect(deleteResponse.statusCode).toBe(200);

      // 7. Verify deletion
      const verifyResponse = await server.inject({
        method: 'GET',
        url: `/portfolios/${portfolioId}`
      });

      expect(verifyResponse.statusCode).toBe(404);
    });
  });

  describe('Gallery with Images Workflow', () => {
    it('should handle complete gallery creation with images', async () => {
      // Create portfolio first
      const portfolioResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId: 'test-photographer',
          title: 'Gallery Workflow Portfolio',
          visibility: 'public',
          urlSlug: 'gallery-workflow-portfolio'
        }
      });

      const { id: portfolioId } = JSON.parse(portfolioResponse.body).data;

      // 1. Create gallery
      const galleryResponse = await server.inject({
        method: 'POST',
        url: '/galleries',
        payload: {
          portfolioId,
          shootId: 'shoot-workflow-123',
          type: 'client_gallery',
          title: 'Workflow Test Gallery',
          allowDownloads: true
        }
      });

      expect(galleryResponse.statusCode).toBe(201);
      const { id: galleryId } = JSON.parse(galleryResponse.body).data;

      // 2. Add images to gallery
      const addImagesResponse = await server.inject({
        method: 'POST',
        url: `/galleries/${galleryId}/images`,
        payload: {
          fileIds: ['file-1', 'file-2', 'file-3', 'file-4', 'file-5'],
          startOrder: 0
        }
      });

      expect(addImagesResponse.statusCode).toBe(201);
      const images = JSON.parse(addImagesResponse.body).data;
      expect(images).toHaveLength(5);

      // 3. Verify images are ordered correctly
      expect(images[0].displayOrder).toBe(0);
      expect(images[1].displayOrder).toBe(1);
      expect(images[4].displayOrder).toBe(4);

      // 4. Retrieve gallery images
      const getImagesResponse = await server.inject({
        method: 'GET',
        url: `/galleries/${galleryId}/images`
      });

      expect(getImagesResponse.statusCode).toBe(200);
      const retrievedImages = JSON.parse(getImagesResponse.body).data;
      expect(retrievedImages).toHaveLength(5);

      // 5. Update gallery to published
      const publishResponse = await server.inject({
        method: 'PATCH',
        url: `/galleries/${galleryId}`,
        payload: {
          isPublished: true
        }
      });

      expect(publishResponse.statusCode).toBe(200);
      expect(JSON.parse(publishResponse.body).data.isPublished).toBe(true);

      // 6. List published galleries
      const listResponse = await server.inject({
        method: 'GET',
        url: `/galleries?portfolioId=${portfolioId}&isPublished=true`
      });

      const publishedGalleries = JSON.parse(listResponse.body).data;
      expect(publishedGalleries.some((g: any) => g.id === galleryId)).toBe(true);
    });
  });

  describe('Multi-Portfolio Management', () => {
    it('should handle multiple portfolios with different visibility', async () => {
      const photographerId = 'multi-portfolio-test';

      // Create public portfolio
      const publicResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Public Portfolio',
          visibility: 'public',
          urlSlug: 'public-portfolio-test',
          isFeatured: true
        }
      });

      expect(publicResponse.statusCode).toBe(201);

      // Create private portfolio
      const privateResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Private Portfolio',
          visibility: 'private',
          urlSlug: 'private-portfolio-test'
        }
      });

      expect(privateResponse.statusCode).toBe(201);

      // Create unlisted portfolio
      const unlistedResponse = await server.inject({
        method: 'POST',
        url: '/portfolios',
        payload: {
          photographerId,
          title: 'Unlisted Portfolio',
          visibility: 'unlisted',
          urlSlug: 'unlisted-portfolio-test'
        }
      });

      expect(unlistedResponse.statusCode).toBe(201);

      // Query public only
      const publicListResponse = await server.inject({
        method: 'GET',
        url: `/portfolios?photographerId=${photographerId}&visibility=public`
      });

      const publicList = JSON.parse(publicListResponse.body).data;
      expect(publicList).toHaveLength(1);
      expect(publicList[0].visibility).toBe('public');

      // Query all for photographer
      const allResponse = await server.inject({
        method: 'GET',
        url: `/portfolios?photographerId=${photographerId}`
      });

      const allList = JSON.parse(allResponse.body).data;
      expect(allList.length).toBeGreaterThanOrEqual(3);

      // Query featured only
      const featuredResponse = await server.inject({
        method: 'GET',
        url: `/portfolios?isFeatured=true&photographerId=${photographerId}`
      });

      const featuredList = JSON.parse(featuredResponse.body).data;
      expect(featuredList.every((p: any) => p.isFeatured)).toBe(true);
    });
  });
});
