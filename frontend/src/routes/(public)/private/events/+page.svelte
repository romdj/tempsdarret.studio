<script lang="ts">
	// Private events photography
</script>

<svelte:head>
	<title>Private Events Photography - Temps D'arrêt Studio</title>
	<meta name="description" content="Exclusive photography for private events, celebrations, and intimate gatherings." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Private Events</h1>
		<p class="text-xl text-base-content/70 mb-4">
			Capturing the intimacy and elegance of your exclusive gatherings.
		</p>
		<p class="text-lg text-base-content/60">
			From private parties to milestone celebrations, I provide discreet, professional photography that preserves your precious moments.
		</p>
	</div>

	<!-- Event Types -->
	<div class="grid md:grid-cols-3 gap-6 mb-12">
		<div class="card bg-base-200">
			<div class="card-body">
				<h3 class="card-title font-serif">Intimate Celebrations</h3>
				<p class="text-sm text-base-content/70">Birthdays, anniversaries, and family milestones</p>
			</div>
		</div>
		<div class="card bg-base-200">
			<div class="card-body">
				<h3 class="card-title font-serif">Private Parties</h3>
				<p class="text-sm text-base-content/70">Exclusive gatherings and social events</p>
			</div>
		</div>
		<div class="card bg-base-200">
			<div class="card-body">
				<h3 class="card-title font-serif">Special Occasions</h3>
				<p class="text-sm text-base-content/70">Unique moments that deserve documentation</p>
			</div>
		</div>
	</div>

	<!-- Gallery Placeholder -->
	<div class="photo-grid mb-12">
		{#each Array(9) as _, i}
			<div class="photo-card">
				<div class="aspect-[4/3] bg-base-300 flex items-center justify-center">
					<p class="text-base-content/50">Event Photo {i + 1}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Features -->
	<div class="bg-base-200 rounded-lg p-8 max-w-4xl mx-auto mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6">What to Expect</h2>
		<ul class="space-y-3">
			<li class="flex items-start gap-3">
				<span class="text-primary text-xl">✓</span>
				<span>Discreet and professional presence throughout your event</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="text-primary text-xl">✓</span>
				<span>Candid and posed photography as desired</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="text-primary text-xl">✓</span>
				<span>Secure private gallery delivery within 2 weeks</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="text-primary text-xl">✓</span>
				<span>High-resolution files with print rights</span>
			</li>
		</ul>
	</div>

	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">Inquire About Coverage</a>
	</div>
</section>
