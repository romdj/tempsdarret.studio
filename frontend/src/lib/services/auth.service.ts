import { ApiClient } from './api.service';
import type { User } from '$lib/types';

export interface ValidateMagicLinkResponse {
	user: User;
	token: string;
	expiresAt: string;
}

export interface AuthSession {
	user: User;
	token: string;
	expiresAt: string;
}

export const AuthService = {
	/**
	 * Validate magic link token (64-char hex, 48h expiry per ADR-003)
	 */
	async validateMagicLink(token: string): Promise<ValidateMagicLinkResponse> {
		const response = await ApiClient.post<ValidateMagicLinkResponse>(
			'/auth/magic-link/validate',
			{ token }
		);

		if (response.success && response.data.token) {
			ApiClient.setAuthToken(response.data.token);
		}

		return response.data;
	},

	/**
	 * Get current user session
	 */
	async getCurrentUser(): Promise<User> {
		const response = await ApiClient.get<User>('/auth/me');
		return response.data;
	},

	/**
	 * Logout current user
	 */
	async logout(): Promise<void> {
		try {
			await ApiClient.post('/auth/logout');
		} finally {
			ApiClient.clearAuthToken();
		}
	},

	/**
	 * Request a new magic link (for contact form / invite flow)
	 */
	async requestMagicLink(email: string, shootId?: string): Promise<void> {
		await ApiClient.post('/auth/magic-link/request', { email, shootId });
	},

	/**
	 * Check if user session is valid
	 */
	async verifySession(): Promise<boolean> {
		try {
			await this.getCurrentUser();
			return true;
		} catch {
			ApiClient.clearAuthToken();
			return false;
		}
	}
};
