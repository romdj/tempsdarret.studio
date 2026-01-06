<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
	<div class="card bg-base-100 shadow-xl max-w-md">
		<div class="card-body">
			{#if data.error}
				<div class="alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h3 class="font-bold">Magic Link Invalid</h3>
						<div class="text-sm">{data.error}</div>
					</div>
				</div>

				<div class="card-actions justify-center mt-4">
					<a href="/contact" class="btn btn-primary">Request New Link</a>
					<a href="/" class="btn btn-ghost">Go Home</a>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-4">
					<span class="loading loading-spinner loading-lg"></span>
					<p>Validating your magic link...</p>
				</div>
			{/if}
		</div>
	</div>
</div>
