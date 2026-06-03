import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { PortfolioServiceApp } from '../../src/main.js';
import {
  setupComponentTests,
  teardownComponentTests,
  getComponentTestContext
} from './component-setup.js';

// Component tests boot the assembled service against real MongoDB and Kafka
// containers (per ADR-014). Opt the global mongo-memory-server setup OUT by
// setting USE_TESTCONTAINERS=1 before any module is imported.
process.env['USE_TESTCONTAINERS'] = '1';

describe('Portfolio Service Component Tests', () => {
  let app: PortfolioServiceApp;
  let request: supertest.Agent;

  beforeAll(async () => {
    await setupComponentTests();
    const ctx = getComponentTestContext();

    process.env['MONGO_URI'] = ctx.mongoUri;
    process.env['MONGODB_URI'] = ctx.mongoUri;
    process.env['KAFKA_BROKERS'] = ctx.kafkaBrokers.join(',');
    process.env['PORT'] = '0';

    app = new PortfolioServiceApp();
    await app.start();

    const address = app.getServer().server.address();
    const port = typeof address === 'object' && address ? address.port : 3002;
    request = supertest(`http://localhost:${port}`);
  }, 120000);

  afterAll(async () => {
    await app?.stop();
    await teardownComponentTests();
  });

  describe('Portfolio lifecycle workflow', () => {
    it('handles complete portfolio creation to deletion workflow', async () => {
      const photographerId = 'photographer-lifecycle-test';

      const createRes = await request
        .post('/portfolios')
        .send({
          photographerId,
          title: 'Lifecycle Test Portfolio',
          description: 'Testing complete lifecycle',
          visibility: 'private',
          urlSlug: 'lifecycle-test-portfolio'
        })
        .expect(201);
      const { id: portfolioId } = createRes.body.data;

      await request.get(`/portfolios/${portfolioId}`).expect(200);
      await request.get('/portfolios/slug/lifecycle-test-portfolio').expect(200);

      const updateRes = await request
        .patch(`/portfolios/${portfolioId}`)
        .send({
          title: 'Updated Lifecycle Portfolio',
          isFeatured: true,
          visibility: 'public'
        })
        .expect(200);
      expect(updateRes.body.data.title).toBe('Updated Lifecycle Portfolio');
      expect(updateRes.body.data.isFeatured).toBe(true);

      const listRes = await request
        .get(`/portfolios?photographerId=${photographerId}&visibility=public`)
        .expect(200);
      expect(listRes.body.data.find((p: { id: string }) => p.id === portfolioId)).toBeDefined();

      await request.delete(`/portfolios/${portfolioId}`).expect(200);
      await request.get(`/portfolios/${portfolioId}`).expect(404);
    });
  });

  describe('Gallery with images workflow', () => {
    it('handles complete gallery creation with images', async () => {
      const portfolioRes = await request
        .post('/portfolios')
        .send({
          photographerId: 'test-photographer',
          title: 'Gallery Workflow Portfolio',
          visibility: 'public',
          urlSlug: 'gallery-workflow-portfolio'
        })
        .expect(201);
      const { id: portfolioId } = portfolioRes.body.data;

      const galleryRes = await request
        .post('/galleries')
        .send({
          portfolioId,
          shootId: 'shoot-workflow-123',
          type: 'client_gallery',
          title: 'Workflow Test Gallery',
          allowDownloads: true
        })
        .expect(201);
      const { id: galleryId } = galleryRes.body.data;

      const addImagesRes = await request
        .post(`/galleries/${galleryId}/images`)
        .send({
          fileIds: ['file-1', 'file-2', 'file-3', 'file-4', 'file-5'],
          startOrder: 0
        })
        .expect(201);
      const images = addImagesRes.body.data;
      expect(images).toHaveLength(5);
      expect(images[0].displayOrder).toBe(0);
      expect(images[4].displayOrder).toBe(4);

      const imagesRes = await request.get(`/galleries/${galleryId}/images`).expect(200);
      expect(imagesRes.body.data).toHaveLength(5);

      const publishRes = await request
        .patch(`/galleries/${galleryId}`)
        .send({ isPublished: true })
        .expect(200);
      expect(publishRes.body.data.isPublished).toBe(true);

      const listRes = await request
        .get(`/galleries?portfolioId=${portfolioId}&isPublished=true`)
        .expect(200);
      expect(listRes.body.data.some((g: { id: string }) => g.id === galleryId)).toBe(true);
    });
  });

  describe('Multi-portfolio management', () => {
    it('handles multiple portfolios with different visibility', async () => {
      const photographerId = 'multi-portfolio-test';

      await request
        .post('/portfolios')
        .send({
          photographerId,
          title: 'Public Portfolio',
          visibility: 'public',
          urlSlug: 'public-portfolio-test',
          isFeatured: true
        })
        .expect(201);

      await request
        .post('/portfolios')
        .send({
          photographerId,
          title: 'Private Portfolio',
          visibility: 'private',
          urlSlug: 'private-portfolio-test'
        })
        .expect(201);

      await request
        .post('/portfolios')
        .send({
          photographerId,
          title: 'Unlisted Portfolio',
          visibility: 'unlisted',
          urlSlug: 'unlisted-portfolio-test'
        })
        .expect(201);

      const publicRes = await request
        .get(`/portfolios?photographerId=${photographerId}&visibility=public`)
        .expect(200);
      expect(publicRes.body.data).toHaveLength(1);
      expect(publicRes.body.data[0].visibility).toBe('public');

      const allRes = await request
        .get(`/portfolios?photographerId=${photographerId}`)
        .expect(200);
      expect(allRes.body.data.length).toBeGreaterThanOrEqual(3);

      const featuredRes = await request
        .get(`/portfolios?isFeatured=true&photographerId=${photographerId}`)
        .expect(200);
      expect(featuredRes.body.data.every((p: { isFeatured: boolean }) => p.isFeatured)).toBe(true);
    });
  });
});
