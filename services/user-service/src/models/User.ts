import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/shared.js';

export interface IUser extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  invitedShoots: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['photographer', 'client', 'admin'],
    default: 'client',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  invitedShoots: [{
    type: String,
    validate: {
      validator: function(v: string): boolean {
        return v.startsWith('shoot_');
      },
      message: 'Invalid shoot ID format'
    }
  }],
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function(this: IUser): string {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName ?? this.email;
});

// Transform output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);