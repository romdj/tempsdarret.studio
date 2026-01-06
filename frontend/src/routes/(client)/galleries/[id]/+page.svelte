<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { GalleryService } from '$lib/services/gallery.service';
	import type { Gallery, Photo } from '$lib/types';

	let gallery: Gallery | null = null;
	let photos: Photo[] = [];
	let loading = true;
	let error = '';

	const galleryId = $page.params.id;

	onMount(async () => {
		try {
			[gallery, photos] = await Promise.all([
				GalleryService.getGallery(galleryId),
				GalleryService.getGalleryPhotos(galleryId)
			]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load gallery';
		} finally {
			loading = false;
		}
	});

	function downloadPhoto(photoId: string, resolution: 'high' | 'raw') {
		const url = GalleryService.getPhotoDownloadUrl(photoId, resolution);
		window.open(url, '_blank');
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{:else if gallery}
		<div class="mb-8">
			<a href="/client/galleries" class="btn btn-ghost btn-sm mb-4">← Back to Galleries</a>
			<h1 class="text-3xl font-bold">{gallery.title}</h1>
			{#if gallery.description}
				<p class="text-base-content/70 mt-2">{gallery.description}</p>
			{/if}
			<div class="flex gap-4 mt-4">
				<span class="badge badge-lg">{photos.length} photos</span>
				{#if gallery.shootDate}
					<span class="badge badge-lg badge-outline">
						{new Date(gallery.shootDate).toLocaleDateString()}
					</span>
				{/if}
			</div>
		</div>

		{#if photos.length === 0}
			<div class="alert alert-info">
				<span>No photos in this gallery yet.</span>
			</div>
		{:else}
			<!-- Photo Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each photos as photo}
					<div class="card card-compact bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
						<figure class="aspect-square bg-base-300">
							<img
								src={photo.mediumUrl || photo.thumbnailUrl}
								alt={photo.title || 'Photo'}
								class="w-full h-full object-cover"
								loading="lazy"
							/>
						</figure>
						<div class="card-body">
							{#if photo.title}
								<h3 class="card-title text-sm">{photo.title}</h3>
							{/if}
							<div class="card-actions justify-end">
								<div class="dropdown dropdown-top dropdown-end">
									<button tabindex="0" class="btn btn-sm btn-primary">Download</button>
									<ul
										tabindex="0"
										class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
									>
										<li>
											<button on:click={() => downloadPhoto(photo.id, 'high')}>
												High Quality JPEG
											</button>
										</li>
										<li>
											<button on:click={() => downloadPhoto(photo.id, 'raw')}>RAW File</button>
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Bulk Download Option -->
			<div class="mt-12 card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Download All</h2>
					<p>Download all photos from this gallery as a ZIP archive.</p>
					<div class="card-actions">
						<button class="btn btn-primary">Download All (JPEG)</button>
						<button class="btn btn-outline">Download All (RAW)</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
