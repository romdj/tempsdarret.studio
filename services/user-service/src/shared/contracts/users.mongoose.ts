import { Schema, model, Document } from 'mongoose';
import { User } from './users.dto';

// Mongoose document interface
export interface UserDocument extends Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User mongoose schema
const userSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['photographer', 'client', 'guest'],
    required: true,
    default: 'client'
  },
  profilePictureUrl: {
    type: String,
    validate: {
      validator: function(v: string): boolean {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Profile picture URL must be a valid URL'
    }
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret): Record<string, unknown> {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1, role: 1 }); // Composite index for common queries
userSchema.index({ name: 'text', email: 'text' }); // Text search index

export const UserModel = model<UserDocument>('User', userSchema);