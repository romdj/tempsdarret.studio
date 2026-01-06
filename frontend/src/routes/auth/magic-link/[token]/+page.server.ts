import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
	const { token } = params;

	try {
		// Validate magic link token with backend
		const response = await fetch('http://localhost:8000/api/auth/magic-link/validate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token })
		});

		if (!response.ok) {
			return {
				error: 'Invalid or expired magic link'
			};
		}

		const data = await response.json();

		// Set auth cookie
		cookies.set('auth_token', data.token, {
			path: '/',
			httpOnly: true,
			secure: true, // Always use secure in production
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		// Redirect to client galleries
		throw redirect(302, '/client/galleries');
	} catch (error) {
		if (error instanceof Response) {
			throw error; // Re-throw redirect
		}

		return {
			error: 'Failed to validate magic link'
		};
	}
};
