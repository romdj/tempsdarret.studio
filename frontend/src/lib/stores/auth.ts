import { writable, type Writable } from 'svelte/store';
import type { User, AuthState } from '$lib/types';
import { AuthService } from '$lib/services/auth.service';

interface AuthStore extends Writable<AuthState> {
	init: () => Promise<void>;
	login: (user: User, _token: string) => void;
	logout: () => Promise<void>;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	updateUser: (user: User) => void;
}

function createAuthStore(): AuthStore {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true,
		error: null
	});

	return {
		subscribe,

		/**
		 * Initialize auth state on app load
		 * Checks if user has valid session
		 */
		async init(): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const isValid = await AuthService.verifySession();

				if (isValid) {
					const user = await AuthService.getCurrentUser();
					set({
						user,
						isAuthenticated: true,
						isLoading: false,
						error: null
					});
				} else {
					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error: null
					});
				}
			} catch (error) {
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Failed to initialize auth'
				});
			}
		},

		/**
		 * Login user after magic link validation
		 */
		login(user: User, _token: string): void {
			set({
				user,
				isAuthenticated: true,
				isLoading: false,
				error: null
			});
		},

		/**
		 * Logout current user
		 */
		async logout(): Promise<void> {
			try {
				await AuthService.logout();
			} finally {
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					error: null
				});
			}
		},

		/**
		 * Set loading state
		 */
		setLoading(isLoading: boolean): void {
			update((state) => ({ ...state, isLoading }));
		},

		/**
		 * Set error state
		 */
		setError(error: string | null): void {
			update((state) => ({ ...state, error, isLoading: false }));
		},

		/**
		 * Update user data
		 */
		updateUser(user: User): void {
			update((state) => ({
				...state,
				user,
				isAuthenticated: true
			}));
		}
	};
}

export const auth = createAuthStore();
