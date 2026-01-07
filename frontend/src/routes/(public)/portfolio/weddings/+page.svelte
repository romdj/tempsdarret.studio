<script lang="ts">
	// Wedding portfolio page
</script>

<svelte:head>
	<title>Wedding Photography - Temps D'arrêt Studio</title>
	<meta name="description" content="Capturing your special day with artistic elegance and emotional depth. Wedding photography services by Temps D'arrêt Studio." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Wedding Photography</h1>
		<p class="text-xl text-base-content/70 mb-4">
			Your wedding day is one of the most important moments of your life. Let me capture every precious detail with artistry and emotion.
		</p>
		<p class="text-lg text-base-content/60">
			From intimate ceremonies to grand celebrations, I document the love, joy, and authentic moments that make your day uniquely yours.
		</p>
	</div>

	<!-- Portfolio Grid -->
	<div class="photo-grid mb-12">
		{#each Array(12) as _, i}
			<div class="photo-card">
				<div class="aspect-[3/2] bg-base-300 flex items-center justify-center">
					<p class="text-base-content/50">Wedding Photo {i + 1}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Services Offered -->
	<div class="bg-base-200 rounded-lg p-8 max-w-4xl mx-auto mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6">What's Included</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div>
				<h3 class="font-semibold text-lg mb-2">Full-Day Coverage</h3>
				<p class="text-base-content/70">From preparation to reception, capturing every moment of your celebration.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Professional Editing</h3>
				<p class="text-base-content/70">Carefully edited photos that enhance the natural beauty of your day.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Online Gallery</h3>
				<p class="text-base-content/70">Secure private gallery for sharing with family and friends.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">High-Resolution Files</h3>
				<p class="text-base-content/70">Full-resolution digital files for printing and archiving.</p>
			</div>
		</div>
	</div>

	<!-- Call to Action -->
	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">
			Inquire About Wedding Photography
		</a>
	</div>
</section>
