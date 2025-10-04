import mongoose, { Schema, Document } from 'mongoose';
import { Gallery, GalleryType } from '@tempsdarret/shared/schemas/portfolio.schema.js';

export interface IGalleryDocument extends Omit<Gallery, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const GallerySchema = new Schema<IGalleryDocument>(
  {
    id: { type: String, required: true, unique: true },
    portfolioId: { type: String, required: true, index: true },
    shootId: { type: String, index: true },
    type: {
      type: String,
      required: true,
      enum: ['client_gallery', 'portfolio_showcase', 'featured_work'] as GalleryType[],
      index: true
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    coverImageUrl: { type: String },
    displayOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    password: { type: String },
    expiresAt: { type: Date },
    allowDownloads: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const GalleryModel = mongoose.model<IGalleryDocument>('Gallery', GallerySchema);

export interface IGalleryImageDocument extends Document {
  id: string;
  galleryId: string;
  fileId: string;
  displayOrder: number;
  caption?: string;
  isFeatured: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryImageSchema = new Schema<IGalleryImageDocument>(
  {
    id: { type: String, required: true, unique: true },
    galleryId: { type: String, required: true, index: true },
    fileId: { type: String, required: true, index: true },
    displayOrder: { type: Number, default: 0 },
    caption: { type: String, maxlength: 500 },
    isFeatured: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const GalleryImageModel = mongoose.model<IGalleryImageDocument>('GalleryImage', GalleryImageSchema);
