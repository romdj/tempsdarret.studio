<script lang="ts">
	// Portfolio showcase page
	const categories = [
		{ name: 'Portraits', href: '/portfolio/portraits', count: 8, image: '/images/portfolio/portraits/20250522-DSC_1769.jpg' },
		{ name: 'Commercial', href: '/professional-services/commercial-photography', count: 3, image: '/images/portfolio/commercial/Kaya/20240101-DSC_0103.jpg' }
	];
</script>

<div class="container mx-auto px-4 py-16">
	<h1 class="text-4xl font-bold text-center mb-12">Portfolio</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		{#each categories as category}
			<a href={category.href} class="card card-compact bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
				<figure class="aspect-video bg-base-300 overflow-hidden">
					<img src={category.image} alt={category.name} class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
				</figure>
				<div class="card-body">
					<h2 class="card-title">{category.name}</h2>
					<p>{category.count} photos</p>
					<div class="card-actions justify-end">
						<span class="text-primary text-sm">View Gallery →</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
