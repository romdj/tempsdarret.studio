<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';

	// Navigation items for public pages
	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation -->
	<nav class="bg-base-100 border-b border-base-300">
		<div class="page-container">
			<div class="flex justify-between items-center h-16">
				<!-- Logo -->
				<a href="/" class="text-2xl font-serif font-bold text-primary">
					Temps D'arrêt
				</a>

				<!-- Navigation Links -->
				<ul class="flex gap-6">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class="hover:text-primary transition-colors"
								class:text-primary={$page.url.pathname === item.href}
								class:font-semibold={$page.url.pathname === item.href}
							>
								{item.label}
							</a>
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
