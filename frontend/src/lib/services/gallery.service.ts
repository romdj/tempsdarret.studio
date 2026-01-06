import { ApiClient } from './api.service';
import type { Gallery, Photo, Shoot, Archive, PaginatedResponse } from '$lib/types';

export interface GalleryFilters {
	status?: 'draft' | 'published' | 'archived';
	category?: string;
	page?: number;
	pageSize?: number;
}

export const GalleryService = {
	/**
	 * Get all galleries for current user (client or admin)
	 */
	async getGalleries(filters?: GalleryFilters): Promise<PaginatedResponse<Gallery>> {
		const params = new URLSearchParams();
		if (filters?.status) {
			params.append('status', filters.status);
		}
		if (filters?.category) {
			params.append('category', filters.category);
		}
		if (filters?.page) {
			params.append('page', filters.page.toString());
		}
		if (filters?.pageSize) {
			params.append('pageSize', filters.pageSize.toString());
		}

		const query = params.toString() ? `?${params.toString()}` : '';
		const response = await ApiClient.get<PaginatedResponse<Gallery>>(`/galleries${query}`);
		return response.data;
	},

	/**
	 * Get single gallery by ID
	 */
	async getGallery(id: string): Promise<Gallery> {
		const response = await ApiClient.get<Gallery>(`/galleries/${id}`);
		return response.data;
	},

	/**
	 * Get photos for a specific gallery
	 */
	async getGalleryPhotos(galleryId: string): Promise<Photo[]> {
		const response = await ApiClient.get<Photo[]>(`/galleries/${galleryId}/photos`);
		return response.data;
	},

	/**
	 * Get shoot details
	 */
	async getShoot(shootId: string): Promise<Shoot> {
		const response = await ApiClient.get<Shoot>(`/shoots/${shootId}`);
		return response.data;
	},

	/**
	 * Request archive generation (JPEG, RAW, or complete)
	 */
	async requestArchive(
		shootId: string,
		type: 'jpeg' | 'raw' | 'complete'
	): Promise<Archive> {
		const response = await ApiClient.post<Archive>(`/shoots/${shootId}/archives`, { type });
		return response.data;
	},

	/**
	 * Get archive status
	 */
	async getArchive(archiveId: string): Promise<Archive> {
		const response = await ApiClient.get<Archive>(`/archives/${archiveId}`);
		return response.data;
	},

	/**
	 * Download single photo
	 */
	getPhotoDownloadUrl(photoId: string, resolution: 'thumbnail' | 'medium' | 'high' | 'raw'): string {
		return `http://localhost:8000/api/photos/${photoId}/download?resolution=${resolution}`;
	}
};
