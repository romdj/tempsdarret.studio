import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GalleryService } from '../../src/services/gallery.service.js';
import { GalleryRepository } from '../../src/persistence/gallery.repository.js';
import { EventPublisher } from '../../src/shared/messaging/event-publisher.js';
import { CreateGalleryRequest, AddGalleryImagesRequest } from '@tempsdarret/shared/schemas/portfolio.schema.js';

describe('GalleryService', () => {
  let galleryService: GalleryService;
  let mockRepository: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateById: vi.fn(),
      findMany: vi.fn(),
      deleteById: vi.fn(),
      addImages: vi.fn(),
      getImages: vi.fn()
    };

    mockEventPublisher = {
      publish: vi.fn()
    };

    galleryService = new GalleryService(mockRepository, mockEventPublisher);
  });

  describe('createGallery', () => {
    it('should create a gallery successfully', async () => {
      const galleryData: CreateGalleryRequest = {
        portfolioId: 'pf-123',
        shootId: 'shoot-456',
        type: 'client_gallery',
        title: 'Smith Wedding Gallery',
        description: 'Private client gallery',
        allowDownloads: true
      };

      const mockSavedGallery = {
        id: 'gal-abc123',
        ...galleryData,
        displayOrder: 0,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({ id: 'gal-abc123', ...galleryData })
      };

      mockRepository.create.mockResolvedValue(mockSavedGallery);

      const result = await galleryService.createGallery(galleryData);

      expect(mockRepository.create).toHaveBeenCalledWith(galleryData);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'galleries',
        expect.objectContaining({
          eventType: 'gallery.created',
          galleryId: 'gal-abc123',
          portfolioId: 'pf-123',
          shootId: 'shoot-456',
          type: 'client_gallery'
        }),
        'gal-abc123'
      );
      expect(result).toEqual({ id: 'gal-abc123', ...galleryData });
    });
  });

  describe('updateGallery', () => {
    it('should update gallery and publish event', async () => {
      const galleryId = 'gal-abc123';
      const updateData = {
        title: 'Updated Gallery Title',
        isPublished: true
      };

      const mockUpdatedGallery = {
        id: galleryId,
        ...updateData,
        toJSON: () => ({ id: galleryId, ...updateData })
      };

      mockRepository.updateById.mockResolvedValue(mockUpdatedGallery);

      const result = await galleryService.updateGallery(galleryId, updateData);

      expect(mockRepository.updateById).toHaveBeenCalledWith(galleryId, updateData);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'galleries',
        expect.objectContaining({
          eventType: 'gallery.updated',
          galleryId
        }),
        galleryId
      );
      expect(result).toEqual({ id: galleryId, ...updateData });
    });

    it('should return null if gallery not found', async () => {
      mockRepository.updateById.mockResolvedValue(null);

      const result = await galleryService.updateGallery('non-existent', { title: 'Test' });

      expect(result).toBeNull();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('getGallery', () => {
    it('should retrieve gallery by ID', async () => {
      const galleryId = 'gal-abc123';
      const mockGallery = {
        id: galleryId,
        title: 'Test Gallery',
        toJSON: () => ({ id: galleryId, title: 'Test Gallery' })
      };

      mockRepository.findById.mockResolvedValue(mockGallery);

      const result = await galleryService.getGallery(galleryId);

      expect(mockRepository.findById).toHaveBeenCalledWith(galleryId);
      expect(result).toEqual({ id: galleryId, title: 'Test Gallery' });
    });
  });

  describe('listGalleries', () => {
    it('should list galleries with filters', async () => {
      const query = {
        portfolioId: 'pf-123',
        type: 'portfolio_showcase' as const,
        isPublished: true,
        page: 1,
        limit: 20
      };

      const mockGalleries = [
        { id: 'gal-1', toJSON: () => ({ id: 'gal-1' }) },
        { id: 'gal-2', toJSON: () => ({ id: 'gal-2' }) }
      ];

      mockRepository.findMany.mockResolvedValue({
        galleries: mockGalleries,
        total: 2
      });

      const result = await galleryService.listGalleries(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith(query);
      expect(result.galleries).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('deleteGallery', () => {
    it('should delete gallery and publish event', async () => {
      const galleryId = 'gal-abc123';
      mockRepository.deleteById.mockResolvedValue(true);

      const result = await galleryService.deleteGallery(galleryId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(galleryId);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'galleries',
        expect.objectContaining({
          eventType: 'gallery.deleted',
          galleryId
        }),
        galleryId
      );
      expect(result).toBe(true);
    });
  });

  describe('addImagesToGallery', () => {
    it('should add images to gallery', async () => {
      const galleryId = 'gal-abc123';
      const request: AddGalleryImagesRequest = {
        fileIds: ['file-1', 'file-2', 'file-3'],
        startOrder: 0
      };

      const mockImages = [
        { id: 'img-1', galleryId, fileId: 'file-1', toJSON: () => ({ id: 'img-1' }) },
        { id: 'img-2', galleryId, fileId: 'file-2', toJSON: () => ({ id: 'img-2' }) },
        { id: 'img-3', galleryId, fileId: 'file-3', toJSON: () => ({ id: 'img-3' }) }
      ];

      mockRepository.addImages.mockResolvedValue(mockImages);

      const result = await galleryService.addImagesToGallery(galleryId, request);

      expect(mockRepository.addImages).toHaveBeenCalledWith(galleryId, request);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'galleries',
        expect.objectContaining({
          eventType: 'gallery.images-added',
          galleryId,
          imageCount: 3,
          fileIds: ['file-1', 'file-2', 'file-3']
        }),
        galleryId
      );
      expect(result).toHaveLength(3);
    });
  });

  describe('getGalleryImages', () => {
    it('should retrieve gallery images sorted by order', async () => {
      const galleryId = 'gal-abc123';
      const mockImages = [
        { id: 'img-1', displayOrder: 0, toJSON: () => ({ id: 'img-1' }) },
        { id: 'img-2', displayOrder: 1, toJSON: () => ({ id: 'img-2' }) }
      ];

      mockRepository.getImages.mockResolvedValue(mockImages);

      const result = await galleryService.getGalleryImages(galleryId);

      expect(mockRepository.getImages).toHaveBeenCalledWith(galleryId);
      expect(result).toHaveLength(2);
    });
  });
});
