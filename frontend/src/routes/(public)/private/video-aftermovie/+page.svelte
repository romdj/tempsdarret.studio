<script lang="ts">
	// Video and aftermovie services
</script>

<svelte:head>
	<title>Video & Aftermovie Production - Temps D'arrêt Studio</title>
	<meta name="description" content="Cinematic video production and aftermovies for weddings, events, and special occasions." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Video & Aftermovie</h1>
		<p class="text-xl text-base-content/70 mb-4">
			Cinematic storytelling that brings your moments to life.
		</p>
		<p class="text-lg text-base-content/60">
			From highlight reels to full event coverage, I create compelling video narratives that capture the emotion and energy of your special day.
		</p>
	</div>

	<!-- Video Services -->
	<div class="grid md:grid-cols-2 gap-8 mb-12">
		<div class="card bg-base-200">
			<div class="card-body">
				<h3 class="card-title text-xl font-serif">Aftermovie Highlights</h3>
				<p class="text-base-content/70 mb-4">
					3-5 minute cinematic highlight reel set to music, perfect for sharing and reliving the best moments.
				</p>
				<ul class="space-y-2 text-sm">
					<li>✓ Professional color grading</li>
					<li>✓ Licensed music</li>
					<li>✓ Multiple delivery formats</li>
				</ul>
			</div>
		</div>

		<div class="card bg-base-200">
			<div class="card-body">
				<h3 class="card-title text-xl font-serif">Full Event Coverage</h3>
				<p class="text-base-content/70 mb-4">
					Complete video documentation of your event, edited for a polished final product.
				</p>
				<ul class="space-y-2 text-sm">
					<li>✓ Multi-camera setup</li>
					<li>✓ Professional audio</li>
					<li>✓ Extended cut + highlights</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Sample Videos Placeholder -->
	<div class="bg-base-200 rounded-lg p-8 mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6 text-center">Sample Work</h2>
		<div class="grid md:grid-cols-2 gap-6">
			{#each Array(4) as _, i}
				<div class="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
					<p class="text-base-content/50">Video Sample {i + 1}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Process -->
	<div class="max-w-4xl mx-auto mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6">Production Process</h2>
		<div class="space-y-4">
			<div class="flex gap-4">
				<div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">1</div>
				<div>
					<h3 class="font-semibold mb-1">Consultation</h3>
					<p class="text-base-content/70">Discuss your vision, style preferences, and key moments to capture.</p>
				</div>
			</div>
			<div class="flex gap-4">
				<div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">2</div>
				<div>
					<h3 class="font-semibold mb-1">Production</h3>
					<p class="text-base-content/70">Professional filming with high-quality equipment and creative direction.</p>
				</div>
			</div>
			<div class="flex gap-4">
				<div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">3</div>
				<div>
					<h3 class="font-semibold mb-1">Post-Production</h3>
					<p class="text-base-content/70">Editing, color grading, sound design, and final delivery within 4-6 weeks.</p>
				</div>
			</div>
		</div>
	</div>

	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">Request a Quote</a>
	</div>
</section>
