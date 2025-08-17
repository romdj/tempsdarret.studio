export type UserRole = 'photographer' | 'client' | 'admin';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly invitedShoots: readonly string[];
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
  readonly shootId: string;
  readonly uploadedBy: string;
  readonly resolutions?: {
    readonly original?: string;
    readonly high?: string;
    readonly medium?: string;
    readonly thumb?: string;
  };
  readonly createdAt: Date;
}

export type ShootStatus = 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';

export interface Shoot {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly clientId: string;
  readonly photographerId: string;
  readonly scheduledDate?: Date;
  readonly status: ShootStatus;
  readonly location?: string;
  readonly totalPhotos?: number;
  readonly archiveSize?: number;
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
  readonly shootId: string;
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

// Photography-specific types
export type FileResolution = 'original' | 'high' | 'medium' | 'thumb';

export interface ArchiveRequest {
  readonly id: string;
  readonly shootId: string;
  readonly requestedBy: string;
  readonly type: 'jpeg' | 'raw' | 'complete';
  readonly status: 'queued' | 'generating' | 'ready' | 'expired';
  readonly filename?: string;
  readonly size?: number;
  readonly downloadUrl?: string;
  readonly expiresAt?: Date;
  readonly createdAt: Date;
}

export interface ShootStatistics {
  readonly totalPhotos: number;
  readonly totalSize: number;
  readonly jpegCount: number;
  readonly rawCount: number;
  readonly lastUpload?: Date;
  readonly downloadCount: number;
}

export interface MagicLinkPayload {
  readonly userId: string;
  readonly shootId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly iat: number;
  readonly exp: number;
}

// Constants
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'],
  SUPPORTED_RAW_TYPES: ['image/x-canon-cr2', 'image/x-canon-cr3', 'image/x-nikon-nef', 'image/x-sony-arw'],
  MAX_FILES_PER_UPLOAD: 50,
} as const;

export const MAGIC_LINK_CONFIG = {
  EXPIRES_IN_MINUTES: 15,
  CLEANUP_AFTER_DAYS: 7,
} as const;

export const PORTFOLIO_LIMITS = {
  MAX_ITEMS_PER_CATEGORY: 50,
  MAX_IMAGES_PER_ITEM: 20,
} as const;