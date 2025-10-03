import { FastifyInstance } from 'fastify';
import { GalleryHandlers } from './gallery.handlers.js';

export function registerGalleryRoutes(fastify: FastifyInstance, handlers: GalleryHandlers) {
  // Gallery CRUD operations
  fastify.post('/galleries', handlers.createGallery.bind(handlers));
  fastify.get('/galleries', handlers.listGalleries.bind(handlers));
  fastify.get('/galleries/:galleryId', handlers.getGallery.bind(handlers));
  fastify.patch('/galleries/:galleryId', handlers.updateGallery.bind(handlers));
  fastify.delete('/galleries/:galleryId', handlers.deleteGallery.bind(handlers));

  // Gallery images
  fastify.post('/galleries/:galleryId/images', handlers.addImagesToGallery.bind(handlers));
  fastify.get('/galleries/:galleryId/images', handlers.getGalleryImages.bind(handlers));
}
