import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				serif: ['Playfair Display', 'Georgia', 'serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				tempsdarret: {
					primary: '#ed6620',
					'primary-content': '#ffffff',
					secondary: '#762916',
					'secondary-content': '#ffffff',
					accent: '#f6b07a',
					'accent-content': '#40130a',
					neutral: '#3d4451',
					'neutral-content': '#ffffff',
					'base-100': '#ffffff',
					'base-200': '#f9fafb',
					'base-300': '#f3f4f6',
					'base-content': '#1f2937',
					info: '#3b82f6',
					success: '#10b981',
					warning: '#f59e0b',
					error: '#ef4444'
				}
			},
			'light',
			'dark'
		],
		darkTheme: 'dark',
		base: true,
		styled: true,
		utils: true
	}
};
