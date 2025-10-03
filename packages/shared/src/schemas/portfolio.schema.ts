import { z } from 'zod';
import { TimestampsSchema } from './base.schema.js';

// Maps to TypeSpec PortfolioVisibility enum
export const PortfolioVisibilitySchema = z.enum(['public', 'private', 'unlisted']);

// Maps to TypeSpec GalleryType enum
export const GalleryTypeSchema = z.enum(['client_gallery', 'portfolio_showcase', 'featured_work']);

// Maps to TypeSpec Portfolio model
export const PortfolioSchema = z.object({
  id: z.string(),
  photographerId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: PortfolioVisibilitySchema,
  urlSlug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50),
  coverImageUrl: z.string().url().optional(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  metadata: z.record(z.any()).optional()
}).merge(TimestampsSchema);

// Maps to TypeSpec Gallery model
export const GallerySchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  shootId: z.string().optional(),
  type: GalleryTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
  password: z.string().optional(),
  expiresAt: z.date().optional(),
  allowDownloads: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
}).merge(TimestampsSchema);

// Maps to TypeSpec GalleryImage model
export const GalleryImageSchema = z.object({
  id: z.string(),
  galleryId: z.string(),
  fileId: z.string(),
  displayOrder: z.number().int().default(0),
  caption: z.string().max(500).optional(),
  isFeatured: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
}).merge(TimestampsSchema);

// Maps to TypeSpec CreatePortfolioRequest
export const CreatePortfolioRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: PortfolioVisibilitySchema,
  urlSlug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50),
  coverImageUrl: z.string().url().optional()
});

// Maps to TypeSpec UpdatePortfolioRequest
export const UpdatePortfolioRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: PortfolioVisibilitySchema.optional(),
  urlSlug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50).optional(),
  coverImageUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().optional()
});

// Maps to TypeSpec CreateGalleryRequest
export const CreateGalleryRequestSchema = z.object({
  portfolioId: z.string(),
  shootId: z.string().optional(),
  type: GalleryTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional(),
  password: z.string().optional(),
  expiresAt: z.date().optional(),
  allowDownloads: z.boolean().optional()
});

// Maps to TypeSpec AddGalleryImagesRequest
export const AddGalleryImagesRequestSchema = z.object({
  fileIds: z.array(z.string()),
  startOrder: z.number().int().optional()
});

// Maps to TypeSpec PortfolioQuery
export const PortfolioQuerySchema = z.object({
  photographerId: z.string().optional(),
  visibility: PortfolioVisibilitySchema.optional(),
  isFeatured: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Maps to TypeSpec GalleryQuery
export const GalleryQuerySchema = z.object({
  portfolioId: z.string().optional(),
  shootId: z.string().optional(),
  type: GalleryTypeSchema.optional(),
  isPublished: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Type exports matching TypeSpec models
export type PortfolioVisibility = z.infer<typeof PortfolioVisibilitySchema>;
export type GalleryType = z.infer<typeof GalleryTypeSchema>;
export type Portfolio = z.infer<typeof PortfolioSchema>;
export type Gallery = z.infer<typeof GallerySchema>;
export type GalleryImage = z.infer<typeof GalleryImageSchema>;
export type CreatePortfolioRequest = z.infer<typeof CreatePortfolioRequestSchema>;
export type UpdatePortfolioRequest = z.infer<typeof UpdatePortfolioRequestSchema>;
export type CreateGalleryRequest = z.infer<typeof CreateGalleryRequestSchema>;
export type AddGalleryImagesRequest = z.infer<typeof AddGalleryImagesRequestSchema>;
export type PortfolioQuery = z.infer<typeof PortfolioQuerySchema>;
export type GalleryQuery = z.infer<typeof GalleryQuerySchema>;
