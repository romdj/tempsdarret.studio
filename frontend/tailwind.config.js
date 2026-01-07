import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Futura', 'Avenir Next', 'Montserrat', 'system-ui', 'sans-serif'],
				serif: ['Playfair Display', 'Georgia', 'serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				tempsdarret: {
					primary: '#EE6640',
					'primary-content': '#ffffff',
					secondary: '#F7B563',
					'secondary-content': '#1A1715',
					accent: '#F18B44',
					'accent-content': '#ffffff',
					neutral: '#1A1715',
					'neutral-content': '#F7F5F2',
					'base-100': '#F7F5F2',
					'base-200': '#EFEAE5',
					'base-300': '#E3DDD6',
					'base-content': '#1A1715',
					info: '#5b8db8',
					success: '#6b9b6e',
					warning: '#F18B44',
					error: '#D94D2C'
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
