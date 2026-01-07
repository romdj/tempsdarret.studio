<script lang="ts">
	// Private photography services overview
</script>

<svelte:head>
	<title>Private Photography - Temps D'arrêt Studio</title>
	<meta name="description" content="Exclusive photography services for private events and special occasions." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Private Photography Services</h1>
		<p class="text-xl text-base-content/70">
			Exclusive photography for your most intimate and special moments.
		</p>
	</div>

	<!-- Services Grid -->
	<div class="grid md:grid-cols-2 gap-8 mb-12">
		<a href="/private/events" class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
			<div class="card-body">
				<h2 class="card-title text-2xl font-serif">Private Events</h2>
				<p class="text-base-content/70">
					Intimate gatherings, celebrations, and milestone moments captured with discretion and artistry.
				</p>
				<div class="card-actions justify-end">
					<span class="text-primary">Learn More →</span>
				</div>
			</div>
		</a>

		<a href="/private/video-aftermovie" class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
			<div class="card-body">
				<h2 class="card-title text-2xl font-serif">Video & Aftermovie</h2>
				<p class="text-base-content/70">
					Cinematic video production and aftermovies that tell your story in motion.
				</p>
				<div class="card-actions justify-end">
					<span class="text-primary">Learn More →</span>
				</div>
			</div>
		</a>
	</div>

	<!-- Call to Action -->
	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">
			Discuss Your Private Event
		</a>
	</div>
</section>
