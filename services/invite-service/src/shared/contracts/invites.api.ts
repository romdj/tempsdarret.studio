// API types for invite service - TypeSpec imports
export interface Invitation {
  id: string;
  shootId: string;
  clientEmail: string;
  status: InvitationStatus;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvitationStatus = 'pending' | 'sent' | 'expired' | 'completed';

export interface MagicLink {
  id: string;
  token: string;
  shootId: string;
  clientEmail: string;
  expiresAt: Date;
  isActive: boolean;
  accessCount: number;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationRequest {
  shootId: string;
  clientEmail: string;
  status?: InvitationStatus;
}

export interface CreateMagicLinkRequest {
  token: string;
  shootId: string;
  clientEmail: string;
  expiresAt: Date;
  isActive: boolean;
  accessCount?: number;
}

export interface SendInvitationRequest {
  message?: string;
}

export interface InvitationQuery {
  shootId?: string;
  status?: InvitationStatus;
  clientEmail?: string;
  limit?: number;
}

export interface MagicLinkGenerationRequest {
  shootId: string;
  email: string;
}

export interface MagicLinkValidationRequest {
  token: string;
  shootId?: string;
}

export interface AuthResponse {
  success: boolean;
  clientEmail: string;
  shootId: string;
  accessToken: string;
  expiresIn: number;
}