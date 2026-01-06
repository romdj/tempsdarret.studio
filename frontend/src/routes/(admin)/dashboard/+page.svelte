<script lang="ts">
	import { auth } from '$lib/stores/auth';
</script>

<div>
	<h1 class="text-3xl font-bold mb-8">Admin Dashboard</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Total Shoots</div>
				<div class="stat-value">24</div>
				<div class="stat-desc">↗︎ 4 this month</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Active Clients</div>
				<div class="stat-value">18</div>
				<div class="stat-desc">↗︎ 2 new</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Galleries</div>
				<div class="stat-value">32</div>
				<div class="stat-desc">Published</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Photos</div>
				<div class="stat-value">1,248</div>
				<div class="stat-desc">Total uploaded</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Quick Actions</h2>
				<div class="flex flex-col gap-2">
					<button class="btn btn-primary">Create New Shoot</button>
					<button class="btn btn-outline">Upload Photos</button>
					<a href="/admin/messages" class="btn btn-outline">View Event Flow</a>
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Recent Activity</h2>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<tbody>
							<tr>
								<td>Client invited for Wedding Shoot</td>
								<td class="text-right text-xs">2 hours ago</td>
							</tr>
							<tr>
								<td>Gallery "Summer Portraits" published</td>
								<td class="text-right text-xs">5 hours ago</td>
							</tr>
							<tr>
								<td>32 photos uploaded to "Corporate Event"</td>
								<td class="text-right text-xs">1 day ago</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>

	{#if $auth.user}
		<div class="mt-8 alert alert-info">
			<span>Logged in as: {$auth.user.email} ({$auth.user.role})</span>
		</div>
	{/if}
</div>
