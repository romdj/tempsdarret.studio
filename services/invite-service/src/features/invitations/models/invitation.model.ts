import mongoose from 'mongoose';
import { InvitationStatusSchema } from '@tempsdarret/shared/schemas/invite.schema';

const invitationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shootId: { type: String, required: true, index: true },
  clientEmail: { 
    type: String, 
    required: true,
    lowercase: true,
    index: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'sent', 'viewed', 'accepted', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  magicLinkToken: { type: String, required: true, unique: true },
  sentAt: { type: Date },
  viewedAt: { type: Date },
  acceptedAt: { type: Date },
  message: { 
    type: String,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
  updatedAt: { type: Date, required: true, default: Date.now }
});

// Compound indexes for common queries
invitationSchema.index({ shootId: 1, clientEmail: 1 });
invitationSchema.index({ status: 1, createdAt: -1 });
invitationSchema.index({ clientEmail: 1, status: 1 });

// Update the updatedAt field before saving
invitationSchema.pre('save', function() {
  this.updatedAt = new Date();
});

invitationSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export const InvitationModel = mongoose.model('Invitation', invitationSchema);