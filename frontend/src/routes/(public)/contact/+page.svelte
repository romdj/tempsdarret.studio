<script lang="ts">
	import { AuthService } from '$lib/services/auth.service';

	let email = '';
	let message = '';
	let loading = false;
	let success = false;
	let error = '';

	async function handleSubmit() {
		loading = true;
		error = '';
		success = false;

		try {
			await AuthService.requestMagicLink(email);
			success = true;
			email = '';
			message = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send message';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-16">
	<div class="max-w-2xl mx-auto">
		<h1 class="text-4xl font-bold mb-8">Get in Touch</h1>

		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				{#if success}
					<div class="alert alert-success">
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
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>Thank you! We'll send you a magic link to access your inquiry.</span>
					</div>
				{:else}
					<form on:submit|preventDefault={handleSubmit}>
						<div class="form-control">
							<label class="label" for="email">
								<span class="label-text">Email</span>
							</label>
							<input
								id="email"
								type="email"
								placeholder="your@email.com"
								class="input input-bordered"
								bind:value={email}
								required
							/>
						</div>

						<div class="form-control mt-4">
							<label class="label" for="message">
								<span class="label-text">Message</span>
							</label>
							<textarea
								id="message"
								class="textarea textarea-bordered h-32"
								placeholder="Tell us about your photography needs..."
								bind:value={message}
								required
							></textarea>
						</div>

						{#if error}
							<div class="alert alert-error mt-4">
								<span>{error}</span>
							</div>
						{/if}

						<div class="form-control mt-6">
							<button type="submit" class="btn btn-primary" disabled={loading}>
								{loading ? 'Sending...' : 'Send Magic Link'}
							</button>
						</div>

						<p class="text-sm text-base-content/70 mt-4">
							We'll send you a secure magic link to access your inquiry and photos.
						</p>
					</form>
				{/if}
			</div>
		</div>

		<div class="mt-12">
			<h2 class="text-2xl font-bold mb-4">Other Ways to Reach Us</h2>
			<div class="space-y-2">
				<p>
					<strong>Email:</strong>
					<a href="mailto:hello@tempsdarret.studio" class="link link-primary"
						>hello@tempsdarret.studio</a
					>
				</p>
				<p><strong>Phone:</strong> +1 (555) 123-4567</p>
				<p><strong>Location:</strong> Paris, France</p>
			</div>
		</div>
	</div>
</div>
