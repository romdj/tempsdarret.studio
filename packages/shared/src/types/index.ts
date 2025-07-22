export type UserRole = 'admin' | 'client';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly role: UserRole;
  readonly invitedEvents: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type PortfolioCategory = 'weddings' | 'portraits' | 'landscapes' | 'private-events';

export interface PortfolioItem {
  readonly id: string;
  readonly title: string;
  readonly category: PortfolioCategory;
  readonly description?: string;
  readonly images: readonly {
    readonly url: string;
    readonly altText?: string;
    readonly width?: number;
    readonly height?: number;
  }[];
  readonly featured: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProfessionalService {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly images: readonly {
    readonly url: string;
    readonly altText?: string;
  }[];
  readonly pricing?: string;
  readonly duration?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type FileType = 'image' | 'raw';

export interface FileMetadata {
  readonly id: string;
  readonly filename: string;
  readonly originalName: string;
  readonly url: string;
  readonly type: FileType;
  readonly size: number;
  readonly mimeType: string;
  readonly eventId: string;
  readonly uploadedBy: string;
  readonly createdAt: Date;
}

export interface Event {
  readonly id: string;
  readonly title: string;
  readonly date: Date;
  readonly clientId: string;
  readonly description?: string;
  readonly files: readonly FileMetadata[];
  readonly inviteCode?: string;
  readonly isPublic: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type InviteStatus = 'pending' | 'sent' | 'accepted' | 'expired';

export interface Invite {
  readonly id: string;
  readonly email: string;
  readonly eventId: string;
  readonly token: string;
  readonly status: InviteStatus;
  readonly sentAt?: Date;
  readonly acceptedAt?: Date;
  readonly expiresAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface KafkaEvent<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly data: T;
  readonly metadata: {
    readonly correlationId?: string;
    readonly userId?: string;
    readonly timestamp: Date;
  };
}

export type ApiResponse<T = unknown> = {
  readonly success: true;
  readonly data: T;
} | {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
};

export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}