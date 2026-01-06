import type { ApiResponse, ApiError } from '$lib/types';

/**
 * Base API client for Kong Gateway communication
 * All requests go through http://localhost:8000/api/...
 */

const API_BASE_URL = 'http://localhost:8000/api';

export const ApiClient = {
	getAuthToken(): string | null {
		if (typeof window === 'undefined') {
			return null;
		}
		return localStorage.getItem('auth_token');
	},

	getHeaders(includeAuth = true): HeadersInit {
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		};

		if (includeAuth) {
			const token = this.getAuthToken();
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}
		}

		return headers;
	},

	async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		const url = `${API_BASE_URL}${endpoint}`;
		const config: RequestInit = {
			...options,
			headers: {
				...this.getHeaders(options.headers?.['Authorization'] !== 'skip'),
				...options.headers
			}
		};

		try {
			const response = await fetch(url, config);

			// Handle non-JSON responses
			const contentType = response.headers.get('content-type');
			if (!contentType?.includes('application/json')) {
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				return {
					data: (await response.text()) as T,
					success: true
				};
			}

			const data = await response.json();

			if (!response.ok) {
				const error: ApiError = {
					message: data.message ?? 'Request failed',
					statusCode: response.status,
					errors: data.errors
				};
				throw error;
			}

			return {
				data: data.data ?? data,
				message: data.message,
				success: true
			};
		} catch (error) {
			if ((error as ApiError).statusCode) {
				throw error;
			}

			throw {
				message: error instanceof Error ? error.message : 'Network error',
				statusCode: 0
			} as ApiError;
		}
	},

	async get<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'GET' });
	},

	async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: body ? JSON.stringify(body) : undefined
		});
	},

	async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: body ? JSON.stringify(body) : undefined
		});
	},

	async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: body ? JSON.stringify(body) : undefined
		});
	},

	async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	},

	setAuthToken(token: string): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem('auth_token', token);
		}
	},

	clearAuthToken(): void {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('auth_token');
		}
	}
};
