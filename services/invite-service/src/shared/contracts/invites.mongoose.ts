import { Schema, model, Document } from 'mongoose';
import { Invitation, MagicLink, InvitationStatus } from './invites.dto';

// Invitation mongoose interface
export interface InvitationDocument extends Omit<Invitation, 'id' | 'createdAt' | 'updatedAt'>, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Magic link mongoose interface  
export interface MagicLinkDocument extends Omit<MagicLink, 'id' | 'createdAt' | 'updatedAt'>, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invitation schema
const invitationSchema = new Schema<InvitationDocument>({
  shootId: {
    type: String,
    required: true,
    index: true
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'expired', 'completed'],
    default: 'pending',
    required: true
  },
  sentAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Magic link schema
const magicLinkSchema = new Schema<MagicLinkDocument>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shootId: {
    type: String,
    required: true,
    index: true
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  accessCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  usedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
invitationSchema.index({ shootId: 1, clientEmail: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ createdAt: -1 });

magicLinkSchema.index({ clientEmail: 1, createdAt: -1 }); // For rate limiting
magicLinkSchema.index({ isActive: 1, expiresAt: 1 }); // For cleanup queries

export const InvitationModel = model<InvitationDocument>('Invitation', invitationSchema);
export const MagicLinkModel = model<MagicLinkDocument>('MagicLink', magicLinkSchema);