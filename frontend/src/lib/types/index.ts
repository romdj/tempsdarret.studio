// Core domain types for Temps D'arrêt Studio

export interface User {
	id: string;
	email: string;
	name: string;
	role: 'client' | 'admin';
	createdAt: string;
	updatedAt: string;
}

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

export interface Gallery {
	id: string;
	shootId: string;
	title: string;
	description?: string;
	coverPhoto?: string; // Cover photo URL
	photoCount?: number;
	clientId?: string;
	shootDate?: string;
	createdAt: string;
	publishedAt?: string;
	expiresAt?: string;
	status: 'draft' | 'published' | 'archived';
}

export interface Photo {
	id: string;
	galleryId: string;
	shootId: string;
	filename: string;
	title?: string;
	thumbnailUrl: string;
	mediumUrl: string;
	highUrl: string;
	rawUrl?: string;
	fileSize: number;
	width: number;
	height: number;
	capturedAt?: string;
	uploadedAt: string;
}

export interface Shoot {
	id: string;
	title: string;
	description?: string;
	category: 'wedding' | 'portrait' | 'commercial' | 'landscape' | 'event';
	clientId?: string;
	status: 'created' | 'processing' | 'ready' | 'delivered' | 'archived';
	photoCount: number;
	createdAt: string;
	updatedAt: string;
	publishedAt?: string;
	expiresAt?: string;
}

export interface Invite {
	id: string;
	shootId: string;
	email: string;
	token: string; // 64-char hex (ADR-003)
	status: 'pending' | 'sent' | 'accepted' | 'expired';
	sentAt?: string;
	acceptedAt?: string;
	expiresAt: string; // 48h expiry (ADR-003)
	createdAt: string;
}

export interface MagicLinkToken {
	token: string;
	email: string;
	shootId?: string;
	expiresAt: string;
}

// Kafka event types for admin message flow visualization
export interface KafkaEvent {
	id: string;
	topic: string;
	eventType: string;
	timestamp: string;
	payload: Record<string, unknown>;
	correlationId?: string;
}

export interface EventFlow {
	id: string;
	name: string;
	description: string;
	events: KafkaEvent[];
	startTime: string;
	endTime?: string;
	status: 'running' | 'completed' | 'failed';
}

// API Response types
export interface ApiResponse<T> {
	data: T;
	message?: string;
	success: boolean;
}

export interface ApiError {
	message: string;
	statusCode: number;
	errors?: Record<string, string[]>;
}

// Pagination
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page?: number;
	pageSize?: number;
	totalPages?: number;
}

// Archive types (for large file downloads)
export interface Archive {
	id: string;
	shootId: string;
	type: 'jpeg' | 'raw' | 'complete';
	filename: string;
	fileSize: number;
	status: 'requested' | 'generating' | 'ready' | 'failed';
	downloadUrl?: string;
	expiresAt?: string;
	createdAt: string;
	completedAt?: string;
}

// Portfolio types (public showcase)
export interface PortfolioItem {
	id: string;
	title: string;
	description: string;
	category: 'wedding' | 'portrait' | 'commercial' | 'landscape' | 'event';
	coverImageUrl: string;
	images: {
		url: string;
		thumbnailUrl: string;
		alt: string;
	}[];
	featured: boolean;
	publishedAt: string;
}
