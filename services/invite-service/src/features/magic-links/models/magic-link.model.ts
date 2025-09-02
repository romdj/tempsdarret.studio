import mongoose from 'mongoose';

const magicLinkSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[a-f0-9]{64}$/, 'Token must be 64 character hex string']
  },
  shootId: { type: String, required: true, index: true },
  clientEmail: { 
    type: String, 
    required: true,
    lowercase: true,
    index: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  accessCount: { type: Number, default: 0, min: 0 },
  lastAccessedAt: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
  updatedAt: { type: Date, required: true, default: Date.now }
});

// Compound indexes for ADR-003 requirements
magicLinkSchema.index({ clientEmail: 1, createdAt: -1 }); // Rate limiting queries
magicLinkSchema.index({ expiresAt: 1, isActive: 1 }); // Cleanup queries
magicLinkSchema.index({ shootId: 1, clientEmail: 1 }); // Shoot-specific queries

// Update the updatedAt field before saving
magicLinkSchema.pre('save', function() {
  this.updatedAt = new Date();
});

magicLinkSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export const MagicLinkModel = mongoose.model('MagicLink', magicLinkSchema);