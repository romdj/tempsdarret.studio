import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	if (!authToken) {
		throw redirect(302, '/');
	}

	// In production, validate token with backend
	// For now, just check it exists
	return {
		authenticated: true
	};
};
