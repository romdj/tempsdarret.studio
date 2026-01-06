<script lang="ts">
	// Portfolio showcase page
	const categories = [
		{ name: 'Weddings', count: 24, image: '/placeholder-wedding.jpg' },
		{ name: 'Portraits', count: 18, image: '/placeholder-portrait.jpg' },
		{ name: 'Landscapes', count: 32, image: '/placeholder-landscape.jpg' },
		{ name: 'Events', count: 15, image: '/placeholder-event.jpg' }
	];
</script>

<div class="container mx-auto px-4 py-16">
	<h1 class="text-4xl font-bold text-center mb-12">Portfolio</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		{#each categories as category}
			<div class="card card-compact bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
				<figure class="aspect-video bg-base-300">
					<!-- Placeholder for portfolio images -->
					<div class="w-full h-full flex items-center justify-center">
						<span class="text-base-content/50">{category.name}</span>
					</div>
				</figure>
				<div class="card-body">
					<h2 class="card-title">{category.name}</h2>
					<p>{category.count} galleries</p>
					<div class="card-actions justify-end">
						<button class="btn btn-primary btn-sm">View Gallery</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
