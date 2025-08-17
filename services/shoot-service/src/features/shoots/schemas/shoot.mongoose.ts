import { Schema, model, Document } from 'mongoose';
import { Shoot, ShootStatus } from '@tempsdarret/shared/schemas/shoot.schema';

// Mongoose document interface that extends our Zod schema type
export interface IShootDocument extends Document, Omit<Shoot, 'id'> {
  _id: string;
}

const shootSchema = new Schema<IShootDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
    match: /^shoot_[a-f0-9]{32}$/,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true
  },
  photographerId: {
    type: String,
    required: true,
    index: true
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'delivered', 'archived'] as ShootStatus[],
    default: 'planned',
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret.id;
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for common queries
shootSchema.index({ photographerId: 1, status: 1 });
shootSchema.index({ clientEmail: 1, status: 1 });
shootSchema.index({ createdAt: -1 });
shootSchema.index({ scheduledDate: 1 });

// Middleware to ensure the ID is set before saving
shootSchema.pre('save', function(next) {
  if (this.isNew && !this.id) {
    // This should not happen as ID is generated in the model, but safety check
    const crypto = require('crypto');
    this.id = `shoot_${crypto.randomBytes(16).toString('hex')}`;
  }
  next();
});

export const ShootModel = model<IShootDocument>('Shoot', shootSchema);