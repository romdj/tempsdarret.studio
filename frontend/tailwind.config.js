import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Custom brand colors for photography portfolio
				primary: {
					50: '#fef6ee',
					100: '#fde9d7',
					200: '#fad0ae',
					300: '#f6b07a',
					400: '#f18644',
					500: '#ed6620',
					600: '#de4d16',
					700: '#b83914',
					800: '#922f18',
					900: '#762916',
					950: '#40130a'
				}
			},
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
