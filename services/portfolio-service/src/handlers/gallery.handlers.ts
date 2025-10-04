import { FastifyRequest, FastifyReply } from 'fastify';
import { GalleryService } from '../services/gallery.service.js';
import {
  CreateGalleryRequest,
  GalleryQuery,
  AddGalleryImagesRequest
} from '@tempsdarret/shared/schemas/portfolio.schema.js';
import { ZodError } from 'zod';

export class GalleryHandlers {
  constructor(private readonly galleryService: GalleryService) {}

  async createGallery(
    request: FastifyRequest<{ Body: CreateGalleryRequest }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const gallery = await this.galleryService.createGallery(request.body);

      return reply.code(201).send({
        data: gallery,
        message: 'Gallery created successfully'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          code: 400,
          message: 'Validation error',
          details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }

      // eslint-disable-next-line no-console
      console.error('Failed to create gallery:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to create gallery'
      });
    }
  }

  async getGallery(
    request: FastifyRequest<{ Params: { galleryId: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const gallery = await this.galleryService.getGallery(request.params.galleryId);

      if (gallery === null) {
        return reply.code(404).send({
          code: 404,
          message: 'Gallery not found'
        });
      }

      return reply.send({ data: gallery });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get gallery:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to get gallery'
      });
    }
  }

  async updateGallery(
    request: FastifyRequest<{ Params: { galleryId: string }, Body: Partial<CreateGalleryRequest> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const gallery = await this.galleryService.updateGallery(request.params.galleryId, request.body);

      if (gallery === null) {
        return reply.code(404).send({
          code: 404,
          message: 'Gallery not found'
        });
      }

      return reply.send({
        data: gallery,
        message: 'Gallery updated successfully'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update gallery:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to update gallery'
      });
    }
  }

  async listGalleries(
    request: FastifyRequest<{ Querystring: GalleryQuery }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const { galleries, total } = await this.galleryService.listGalleries(request.query);

      const { page, limit } = request.query;
      const totalPages = Math.ceil(total / (limit ?? 20));

      return reply.send({
        data: galleries,
        meta: {
          page: page ?? 1,
          limit: limit ?? 20,
          total,
          totalPages
        }
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to list galleries:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to list galleries'
      });
    }
  }

  async deleteGallery(
    request: FastifyRequest<{ Params: { galleryId: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const deleted = await this.galleryService.deleteGallery(request.params.galleryId);

      if (!deleted) {
        return reply.code(404).send({
          code: 404,
          message: 'Gallery not found'
        });
      }

      return reply.send({
        data: { deleted: true },
        message: 'Gallery deleted successfully'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete gallery:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to delete gallery'
      });
    }
  }

  async addImagesToGallery(
    request: FastifyRequest<{ Params: { galleryId: string }, Body: AddGalleryImagesRequest }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const images = await this.galleryService.addImagesToGallery(request.params.galleryId, request.body);

      return reply.code(201).send({
        data: images,
        message: 'Images added to gallery successfully'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add images to gallery:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to add images to gallery'
      });
    }
  }

  async getGalleryImages(
    request: FastifyRequest<{ Params: { galleryId: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const images = await this.galleryService.getGalleryImages(request.params.galleryId);

      return reply.send({ data: images });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get gallery images:', error);
      return reply.code(500).send({
        code: 500,
        message: 'Failed to get gallery images'
      });
    }
  }
}
