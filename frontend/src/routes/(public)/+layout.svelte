<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';

	// Navigation items for public pages
	const navItems = [
		{ href: '/', label: 'Home' },
		{
			label: 'Portfolio',
			items: [
				{ href: '/portfolio', label: 'All Work' },
				{ href: '/portfolio/weddings', label: 'Weddings' },
				{ href: '/portfolio/portraits', label: 'Portraits' }
			]
		},
		{
			label: 'Private',
			items: [
				{ href: '/private', label: 'Overview' },
				{ href: '/private/events', label: 'Private Events' },
				{ href: '/private/video-aftermovie', label: 'Video & Aftermovie' }
			]
		},
		{
			label: 'Professional Services',
			items: [
				{ href: '/professional-services', label: 'All Services' },
				{ href: '/professional-services/portrait-sessions', label: 'Portrait Sessions' },
				{ href: '/professional-services/commercial-photography', label: 'Commercial' },
				{ href: '/professional-services/teambuilding', label: 'Team Building' },
				{ href: '/professional-services/company-events', label: 'Company Events' },
				{ href: '/professional-services/fashion-photography', label: 'Fashion' }
			]
		},
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation -->
	<nav class="bg-base-100 border-b border-base-300">
		<div class="page-container">
			<div class="flex justify-between items-center h-20">
				<!-- Logo -->
				<a href="/" class="flex items-center">
					<img src="/logo.jpg" alt="Temps d'Arrêt Studio" class="h-16" />
				</a>

				<!-- Navigation Links -->
				<ul class="flex gap-6">
					{#each navItems as item}
						<li class="relative group">
							{#if item.items}
								<!-- Dropdown Menu -->
								<button class="hover:text-primary transition-colors">
									{item.label} ▾
								</button>
								<ul class="absolute left-0 mt-2 w-56 bg-base-100 shadow-lg rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-base-300">
									{#each item.items as subItem}
										<li>
											<a
												href={subItem.href}
												class="block px-4 py-2 hover:bg-base-200 hover:text-primary transition-colors rounded"
												class:text-primary={$page.url.pathname === subItem.href}
												class:font-semibold={$page.url.pathname === subItem.href}
											>
												{subItem.label}
											</a>
										</li>
									{/each}
								</ul>
							{:else}
								<!-- Regular Link -->
								<a
									href={item.href}
									class="hover:text-primary transition-colors"
									class:text-primary={$page.url.pathname === item.href}
									class:font-semibold={$page.url.pathname === item.href}
								>
									{item.label}
								</a>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Auth Status -->
				<div>
					{#if $auth.isAuthenticated}
						<a href="/galleries" class="btn btn-primary btn-sm">
							{$auth.user?.role === 'admin' ? 'Dashboard' : 'My Galleries'}
						</a>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-1">
		<slot />
	</main>

	<!-- Footer -->
	<footer class="bg-base-200 border-t border-base-300 py-8">
		<div class="page-container">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div>
					<h3 class="text-lg font-serif font-bold mb-2">Temps D'arrêt Studio</h3>
					<p class="text-sm text-base-content/70">
						Capturing moments that last forever
					</p>
				</div>
				<div>
					<h4 class="font-semibold mb-2">Quick Links</h4>
					<ul class="space-y-1 text-sm">
						{#each navItems as item}
							<li>
								<a href={item.href} class="hover:text-primary transition-colors">
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<h4 class="font-semibold mb-2">Contact</h4>
					<p class="text-sm text-base-content/70">
						Email: hello@tempsdarret.studio
					</p>
				</div>
			</div>
			<div class="mt-8 pt-4 border-t border-base-300 text-center text-sm text-base-content/70">
				&copy; {new Date().getFullYear()} Temps D'arrêt Studio. All rights reserved.
			</div>
		</div>
	</footer>
</div>
