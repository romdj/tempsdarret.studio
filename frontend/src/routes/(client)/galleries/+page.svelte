<script lang="ts">
	import { onMount } from 'svelte';
	import { GalleryService } from '$lib/services/gallery.service';
	import type { Gallery } from '$lib/types';

	let galleries: Gallery[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await GalleryService.getGalleries({ status: 'published' });
			galleries = response.items;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load galleries';
		} finally {
			loading = false;
		}
	});
</script>

<div>
	<h1 class="text-3xl font-bold mb-8">Your Galleries</h1>

	{#if loading}
		<div class="flex justify-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{:else if galleries.length === 0}
		<div class="alert alert-info">
			<span>No galleries available yet. Check back soon!</span>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each galleries as gallery}
				<a href="/client/galleries/{gallery.id}" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
					<figure class="aspect-video bg-base-300">
						{#if gallery.coverPhoto}
							<img src={gallery.coverPhoto} alt={gallery.title} class="w-full h-full object-cover" />
						{:else}
							<div class="flex items-center justify-center w-full h-full">
								<span class="text-base-content/50">No preview</span>
							</div>
						{/if}
					</figure>
					<div class="card-body">
						<h2 class="card-title">{gallery.title}</h2>
						<p class="text-sm text-base-content/70">{gallery.photoCount || 0} photos</p>
						{#if gallery.shootDate}
							<p class="text-xs text-base-content/60">
								{new Date(gallery.shootDate).toLocaleDateString()}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
