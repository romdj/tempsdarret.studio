<script lang="ts">
	// Home page - Photography portfolio landing
</script>

<svelte:head>
	<title>Temps D'arrêt Studio - Photography Portfolio</title>
	<meta name="description" content="Professional photography services for weddings, portraits, commercial events, and landscapes." />
</svelte:head>

<!-- Hero Section -->
<section class="relative h-[70vh] flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
	<div class="page-container text-center">
		<h1 class="text-6xl font-serif font-bold mb-6 text-balance">
			Capturing Moments That Last Forever
		</h1>
		<p class="text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
			Professional photography services for weddings, portraits, commercial events, and breathtaking landscapes.
		</p>
		<div class="flex gap-4 justify-center">
			<a href="/portfolio" class="btn btn-primary btn-lg">
				View Portfolio
			</a>
			<a href="/contact" class="btn btn-outline btn-lg">
				Get in Touch
			</a>
		</div>
	</div>
</section>

<!-- Services Overview -->
<section class="page-container py-16">
	<h2 class="text-4xl font-serif font-bold text-center mb-12">Services</h2>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title text-2xl font-serif">Weddings</h3>
				<p class="text-base-content/70">
					Capturing your special day with artistic elegance and emotional depth.
				</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title text-2xl font-serif">Portraits</h3>
				<p class="text-base-content/70">
					Professional portraits that bring out your unique personality and style.
				</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title text-2xl font-serif">Commercial</h3>
				<p class="text-base-content/70">
					Corporate events, product photography, and brand imagery.
				</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title text-2xl font-serif">Landscapes</h3>
				<p class="text-base-content/70">
					Stunning natural vistas and architectural photography.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Featured Work Teaser -->
<section class="bg-base-200 py-16">
	<div class="page-container">
		<h2 class="text-4xl font-serif font-bold text-center mb-12">Featured Work</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<!-- Placeholder for featured images -->
			<div class="aspect-[4/3] bg-base-300 rounded-lg flex items-center justify-center">
				<p class="text-base-content/50">Featured Image 1</p>
			</div>
			<div class="aspect-[4/3] bg-base-300 rounded-lg flex items-center justify-center">
				<p class="text-base-content/50">Featured Image 2</p>
			</div>
			<div class="aspect-[4/3] bg-base-300 rounded-lg flex items-center justify-center">
				<p class="text-base-content/50">Featured Image 3</p>
			</div>
		</div>

		<div class="text-center">
			<a href="/portfolio" class="btn btn-primary">
				View Full Portfolio
			</a>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="page-container py-16 text-center">
	<h2 class="text-4xl font-serif font-bold mb-4">Ready to Work Together?</h2>
	<p class="text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
		Let's create something beautiful. Get in touch to discuss your photography needs.
	</p>
	<a href="/contact" class="btn btn-primary btn-lg">
		Contact Me
	</a>
</section>
