<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	// Redirect if not authenticated
	$: if (!$auth.isLoading && !$auth.isAuthenticated) {
		goto('/');
	}
</script>

<div class="min-h-screen bg-base-100">
	<!-- Client Portal Navigation -->
	<nav class="navbar bg-base-200 shadow-lg">
		<div class="container mx-auto">
			<div class="flex-1">
				<a href="/client/galleries" class="btn btn-ghost text-xl">My Galleries</a>
			</div>
			<div class="flex-none">
				<ul class="menu menu-horizontal px-1">
					<li><a href="/client/galleries">Galleries</a></li>
					<li><a href="/">Public Site</a></li>
					<li>
						<button on:click={() => auth.logout()} class="btn btn-ghost btn-sm">Logout</button>
					</li>
				</ul>
			</div>
		</div>
	</nav>

	<!-- Page Content -->
	<main class="container mx-auto px-4 py-8">
		{#if $auth.isLoading}
			<div class="flex justify-center items-center min-h-screen">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if $auth.isAuthenticated}
			<slot />
		{:else}
			<div class="alert alert-error">
				<span>You must be logged in to access this page.</span>
			</div>
		{/if}
	</main>
</div>
