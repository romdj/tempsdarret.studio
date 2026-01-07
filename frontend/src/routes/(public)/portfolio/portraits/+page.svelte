<script lang="ts">
	// Portrait portfolio page
</script>

<svelte:head>
	<title>Portrait Photography - Temps D'arrêt Studio</title>
	<meta name="description" content="Professional portraits that bring out your unique personality and style. Portrait photography by Temps D'arrêt Studio." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Portrait Photography</h1>
		<p class="text-xl text-base-content/70 mb-4">
			Professional portraits that capture your essence, personality, and unique story.
		</p>
		<p class="text-lg text-base-content/60">
			Whether for personal branding, family memories, or artistic expression, every portrait is crafted with care and attention to detail.
		</p>
	</div>

	<!-- Portfolio Grid -->
	<div class="photo-grid mb-12">
		{#each Array(12) as _, i}
			<div class="photo-card">
				<div class="aspect-[3/4] bg-base-300 flex items-center justify-center">
					<p class="text-base-content/50">Portrait {i + 1}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Portrait Types -->
	<div class="bg-base-200 rounded-lg p-8 max-w-4xl mx-auto mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6">Portrait Sessions</h2>
		<div class="grid md:grid-cols-3 gap-6">
			<div>
				<h3 class="font-semibold text-lg mb-2">Individual Portraits</h3>
				<p class="text-base-content/70">Professional headshots and personal branding photos.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Family Portraits</h3>
				<p class="text-base-content/70">Timeless family memories to treasure for generations.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Creative Portraits</h3>
				<p class="text-base-content/70">Artistic and conceptual portrait photography.</p>
			</div>
		</div>
	</div>

	<!-- Call to Action -->
	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">
			Book a Portrait Session
		</a>
	</div>
</section>
