import mongoose, { Schema, Document } from 'mongoose';
import { Portfolio, PortfolioVisibility } from '@tempsdarret/shared/schemas/portfolio.schema.js';

export interface IPortfolioDocument extends Omit<Portfolio, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolioDocument>(
  {
    id: { type: String, required: true, unique: true },
    photographerId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    visibility: {
      type: String,
      required: true,
      enum: ['public', 'private', 'unlisted'] as PortfolioVisibility[],
      index: true
    },
    urlSlug: { type: String, required: true, unique: true, index: true },
    coverImageUrl: { type: String },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const PortfolioModel = mongoose.model<IPortfolioDocument>('Portfolio', PortfolioSchema);
