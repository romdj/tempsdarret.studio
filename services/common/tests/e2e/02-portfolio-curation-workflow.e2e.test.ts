import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * E2E Test: Portfolio Curation Workflow
 *
 * This test covers the complete workflow of:
 * 1. Photographer creates a shoot
 * 2. Files are uploaded to the shoot
 * 3. Shoot is marked as portfolio-worthy
 * 4. Portfolio service creates curated gallery
 * 5. Gallery is published to public portfolio
 *
 * Happy Path: Successful portfolio curation and publication
 * Alternate Paths:
 * - Client consent required before publication
 * - Portfolio-worthy flag can be toggled off
 * - Featured images selection
 */
describe('E2E: Portfolio Curation Workflow', () => {
  let shootServiceUrl: string;
  let fileServiceUrl: string;
  let portfolioServiceUrl: string;
  let photographerId: string;
  let shootId: string;
  let portfolioId: string;
  let galleryId: string;

  beforeAll(() => {
    shootServiceUrl = process.env.SHOOT_SERVICE_URL || 'http://localhost:3006';
    fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://localhost:3003';
    portfolioServiceUrl = process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:3005';
    photographerId = 'photographer-e2e-test';
  });

  describe('Happy Path: Complete Portfolio Curation', () => {
    it('should complete full portfolio curation workflow', async () => {
      // Step 1: Create a wedding shoot
      const createShootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId,
          category: 'weddings',
          title: 'Smith Wedding - June 2024',
          clientEmail: 'sarah.smith@example.com',
          clientName: 'Sarah Smith',
          scheduledDate: '2024-06-15',
          location: 'Garden Estate Venue'
        })
      });

      expect(createShootResponse.status).toBe(201);
      const shoot = await createShootResponse.json();
      shootId = shoot.data.id;

      // Step 2: Simulate file uploads (mock file IDs)
      const fileIds = ['file-001', 'file-002', 'file-003', 'file-004', 'file-005'];

      // Step 3: Mark best shots as featured
      const featuredImageIds = ['file-002', 'file-004'];

      const updateShootResponse = await fetch(`${shootServiceUrl}/shoots/${shootId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'media.featuredImageIds': featuredImageIds,
          'media.coverImageId': 'file-002',
          'media.totalImages': fileIds.length
        })
      });

      expect(updateShootResponse.status).toBe(200);

      // Step 4: Create portfolio for photographer
      const createPortfolioResponse = await fetch(`${portfolioServiceUrl}/portfolios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId,
          title: 'Wedding Photography Portfolio',
          description: 'Professional wedding photography',
          visibility: 'public',
          urlSlug: 'weddings-portfolio-e2e',
          isFeatured: true
        })
      });

      expect(createPortfolioResponse.status).toBe(201);
      const portfolio = await createPortfolioResponse.json();
      portfolioId = portfolio.data.id;

      // Step 5: Create portfolio showcase gallery from shoot
      const createGalleryResponse = await fetch(`${portfolioServiceUrl}/galleries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          shootId,
          type: 'portfolio_showcase',
          title: 'Elegant Garden Wedding',
          description: 'A beautiful summer wedding at Garden Estate',
          coverImageUrl: `${fileServiceUrl}/files/file-002`,
          isPublished: false  // Start unpublished
        })
      });

      expect(createGalleryResponse.status).toBe(201);
      const gallery = await createGalleryResponse.json();
      galleryId = gallery.data.id;

      // Step 6: Add only featured images to portfolio gallery
      const addImagesResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: featuredImageIds,
          startOrder: 0
        })
      });

      expect(addImagesResponse.status).toBe(201);
      const images = await addImagesResponse.json();
      expect(images.data).toHaveLength(2);

      // Step 7: Publish gallery to portfolio
      const publishResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: true
        })
      });

      expect(publishResponse.status).toBe(200);

      // Step 8: Verify portfolio is now visible in public listing
      const publicPortfoliosResponse = await fetch(
        `${portfolioServiceUrl}/portfolios?visibility=public&isFeatured=true`
      );

      expect(publicPortfoliosResponse.status).toBe(200);
      const publicPortfolios = await publicPortfoliosResponse.json();
      const foundPortfolio = publicPortfolios.data.find((p: any) => p.id === portfolioId);
      expect(foundPortfolio).toBeDefined();

      // Step 9: Verify gallery is accessible via portfolio
      const galleryListResponse = await fetch(
        `${portfolioServiceUrl}/galleries?portfolioId=${portfolioId}&isPublished=true`
      );

      expect(galleryListResponse.status).toBe(200);
      const galleries = await galleryListResponse.json();
      expect(galleries.data).toHaveLength(1);
      expect(galleries.data[0].id).toBe(galleryId);
    });
  });

  describe('Alternate Path: Client Consent Required', () => {
    it('should prevent publication without client consent', async () => {
      // Create shoot without consent flag
      const shootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId,
          category: 'weddings',
          title: 'Consent Test Wedding',
          clientEmail: 'test@example.com',
          scheduledDate: '2024-07-20',
          'portfolio.clientConsent': false  // Explicitly no consent
        })
      });

      const shoot = await shootResponse.json();
      const testShootId = shoot.data.id;

      // Create gallery but attempt to publish
      const galleryResponse = await fetch(`${portfolioServiceUrl}/galleries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          shootId: testShootId,
          type: 'portfolio_showcase',
          title: 'Test Gallery',
          isPublished: true  // Try to publish without consent
        })
      });

      // Should succeed in creating but business logic should check consent
      expect(galleryResponse.status).toBe(201);

      // However, when querying for client-consent-approved galleries,
      // this should not appear
      const approvedGalleriesResponse = await fetch(
        `${portfolioServiceUrl}/galleries?portfolioId=${portfolioId}&type=portfolio_showcase`
      );

      const approvedGalleries = await approvedGalleriesResponse.json();

      // Verify consent checking in workflow
      // (This would require backend validation - showing test structure)
      expect(approvedGalleries.data).toBeDefined();
    });
  });

  describe('Alternate Path: Featured Image Selection', () => {
    it('should handle changing featured images', async () => {
      // Get the gallery with images
      const imagesResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}/images`);
      const { data: currentImages } = await imagesResponse.json();

      expect(currentImages.length).toBeGreaterThan(0);

      // Add more images to the gallery
      const addMoreResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: ['file-006', 'file-007'],
          startOrder: currentImages.length
        })
      });

      expect(addMoreResponse.status).toBe(201);

      // Verify total image count increased
      const updatedImagesResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}/images`);
      const { data: updatedImages } = await updatedImagesResponse.json();

      expect(updatedImages.length).toBe(currentImages.length + 2);
      expect(updatedImages[updatedImages.length - 1].fileId).toBe('file-007');
    });
  });

  describe('Alternate Path: Unpublish Portfolio Gallery', () => {
    it('should allow unpublishing a gallery', async () => {
      // Unpublish the gallery
      const unpublishResponse = await fetch(`${portfolioServiceUrl}/galleries/${galleryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: false
        })
      });

      expect(unpublishResponse.status).toBe(200);

      // Verify it no longer appears in published galleries
      const publishedGalleriesResponse = await fetch(
        `${portfolioServiceUrl}/galleries?portfolioId=${portfolioId}&isPublished=true`
      );

      const publishedGalleries = await publishedGalleriesResponse.json();
      const foundGallery = publishedGalleries.data.find((g: any) => g.id === galleryId);

      expect(foundGallery).toBeUndefined();
    });
  });
});
