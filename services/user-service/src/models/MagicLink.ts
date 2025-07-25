import mongoose, { Schema, Document } from 'mongoose';

export interface IMagicLink extends Document {
  email: string;
  token: string;
  shootId?: string;
  userId?: string;
  isUsed: boolean;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MagicLinkSchema = new Schema<IMagicLink>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    length: 64, // 32 bytes as hex
  },
  shootId: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || v.startsWith('shoot_');
      },
      message: 'Invalid shoot ID format'
    }
  },
  userId: {
    type: String,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
MagicLinkSchema.index({ token: 1 });
MagicLinkSchema.index({ email: 1 });
MagicLinkSchema.index({ expiresAt: 1 });
MagicLinkSchema.index({ isUsed: 1 });

// Compound index for efficient cleanup
MagicLinkSchema.index({ expiresAt: 1, isUsed: 1 });

// Virtual for checking if expired
MagicLinkSchema.virtual('isExpired').get(function(this: IMagicLink) {
  return new Date() > this.expiresAt;
});

// Transform output
MagicLinkSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.token; // Never expose token in JSON
    return ret;
  }
});

export const MagicLink = mongoose.model<IMagicLink>('MagicLink', MagicLinkSchema);