<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface KafkaEvent {
		id: string;
		topic: string;
		eventType: string;
		timestamp: number;
		data: Record<string, unknown>;
		status: 'success' | 'processing' | 'error';
	}

	let events: KafkaEvent[] = [];
	let filteredEvents: KafkaEvent[] = [];
	let selectedTopic = 'all';
	let selectedEventType = 'all';
	let autoScroll = true;
	let isPaused = false;
	let eventSource: EventSource | null = null;

	const topics = ['all', 'shoots', 'users', 'invites', 'notifications'];
	const eventTypes = [
		'all',
		'shoot.created',
		'user.created',
		'user.verified',
		'invite.created',
		'invite.sent'
	];

	// Color coding for different event types
	const eventColors: Record<string, string> = {
		'shoot.created': 'badge-primary',
		'user.created': 'badge-secondary',
		'user.verified': 'badge-accent',
		'invite.created': 'badge-info',
		'invite.sent': 'badge-success',
		'error': 'badge-error'
	};

	onMount(() => {
		// Connect to Server-Sent Events endpoint for real-time updates
		// In production, this would be: http://localhost:8000/api/admin/events/stream
		connectToEventStream();

		// Add some mock events for demonstration
		addMockEvents();
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	function connectToEventStream() {
		// TODO: Implement real SSE connection to backend
		// eventSource = new EventSource('http://localhost:8000/api/admin/events/stream');
		//
		// eventSource.onmessage = (event) => {
		//   const kafkaEvent = JSON.parse(event.data);
		//   addEvent(kafkaEvent);
		// };
		//
		// eventSource.onerror = () => {
		//   console.error('EventSource failed');
		// };
	}

	function addEvent(event: KafkaEvent) {
		if (!isPaused) {
			events = [event, ...events].slice(0, 100); // Keep last 100 events
			filterEvents();
		}
	}

	function addMockEvents() {
		// Simulate the event flow from sequence diagram
		const mockEvents: Omit<KafkaEvent, 'id' | 'timestamp'>[] = [
			{
				topic: 'shoots',
				eventType: 'shoot.created',
				data: {
					shootId: 'shoot_001',
					title: 'Wedding Photography',
					clientEmail: 'client@example.com',
					photographerId: 'photographer_123'
				},
				status: 'success'
			},
			{
				topic: 'users',
				eventType: 'user.created',
				data: {
					userId: 'user_456',
					email: 'client@example.com',
					shootId: 'shoot_001',
					role: 'client'
				},
				status: 'success'
			},
			{
				topic: 'invites',
				eventType: 'invite.created',
				data: {
					inviteId: 'invite_789',
					email: 'client@example.com',
					shootId: 'shoot_001',
					token: 'a1b2c3d4...', // 64-char hex (truncated for display)
					expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
				},
				status: 'success'
			},
			{
				topic: 'notifications',
				eventType: 'invite.sent',
				data: {
					inviteId: 'invite_789',
					email: 'client@example.com',
					status: 'sent',
					sentAt: new Date().toISOString()
				},
				status: 'success'
			}
		];

		// Add mock events with staggered timing
		mockEvents.forEach((event, index) => {
			setTimeout(
				() => {
					addEvent({
						...event,
						id: `event_${Date.now()}_${index}`,
						timestamp: Date.now() - (mockEvents.length - index) * 1000
					});
				},
				index * 500
			);
		});
	}

	function filterEvents() {
		filteredEvents = events.filter((event) => {
			const topicMatch = selectedTopic === 'all' || event.topic === selectedTopic;
			const typeMatch = selectedEventType === 'all' || event.eventType === selectedEventType;
			return topicMatch && typeMatch;
		});
	}

	function clearEvents() {
		events = [];
		filteredEvents = [];
	}

	function togglePause() {
		isPaused = !isPaused;
	}

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
	}

	function getEventBadgeClass(eventType: string): string {
		return eventColors[eventType] || 'badge-neutral';
	}

	// Reactive filter
	$: {
		selectedTopic;
		selectedEventType;
		filterEvents();
	}
</script>

<div>
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold">Message Flow Visualization</h1>
		<div class="flex gap-2">
			<button on:click={togglePause} class="btn btn-sm {isPaused ? 'btn-warning' : 'btn-primary'}">
				{isPaused ? '▶ Resume' : '⏸ Pause'}
			</button>
			<button on:click={clearEvents} class="btn btn-sm btn-outline">Clear</button>
			<button on:click={addMockEvents} class="btn btn-sm btn-accent">Simulate Flow</button>
		</div>
	</div>

	<!-- Event Flow Diagram -->
	<div class="card bg-base-200 shadow-xl mb-6">
		<div class="card-body">
			<h2 class="card-title">Event-Driven Architecture Flow</h2>
			<div class="flex items-center justify-between gap-4 p-4 overflow-x-auto">
				<div class="flex flex-col items-center">
					<div class="badge badge-primary badge-lg">Shoot Service</div>
					<div class="text-xs mt-2">shoot.created</div>
				</div>
				<div class="text-2xl">→</div>
				<div class="flex flex-col items-center">
					<div class="badge badge-secondary badge-lg">User Service</div>
					<div class="text-xs mt-2">user.created/verified</div>
				</div>
				<div class="text-2xl">→</div>
				<div class="flex flex-col items-center">
					<div class="badge badge-info badge-lg">Invite Service</div>
					<div class="text-xs mt-2">invite.created</div>
				</div>
				<div class="text-2xl">→</div>
				<div class="flex flex-col items-center">
					<div class="badge badge-success badge-lg">Notification Service</div>
					<div class="text-xs mt-2">invite.sent</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex gap-4 mb-6">
		<div class="form-control">
			<label class="label" for="topic-filter">
				<span class="label-text">Topic</span>
			</label>
			<select id="topic-filter" class="select select-bordered" bind:value={selectedTopic}>
				{#each topics as topic}
					<option value={topic}>{topic}</option>
				{/each}
			</select>
		</div>

		<div class="form-control">
			<label class="label" for="event-type-filter">
				<span class="label-text">Event Type</span>
			</label>
			<select id="event-type-filter" class="select select-bordered" bind:value={selectedEventType}>
				{#each eventTypes as eventType}
					<option value={eventType}>{eventType}</option>
				{/each}
			</select>
		</div>

		<div class="form-control">
			<label class="label">
				<span class="label-text">Auto-scroll</span>
			</label>
			<input type="checkbox" class="toggle toggle-primary" bind:checked={autoScroll} />
		</div>

		<div class="flex-1"></div>

		<div class="form-control">
			<label class="label">
				<span class="label-text">Total Events</span>
			</label>
			<div class="stat-value text-2xl">{filteredEvents.length}</div>
		</div>
	</div>

	<!-- Event Stream -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-0">
			<div class="overflow-x-auto max-h-[600px] overflow-y-auto">
				<table class="table table-zebra table-pin-rows">
					<thead>
						<tr>
							<th>Time</th>
							<th>Topic</th>
							<th>Event Type</th>
							<th>Data</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredEvents.length === 0}
							<tr>
								<td colspan="5" class="text-center py-8">
									<div class="flex flex-col items-center gap-2">
										<span class="text-base-content/50">No events to display</span>
										<button on:click={addMockEvents} class="btn btn-sm btn-primary">
											Simulate Event Flow
										</button>
									</div>
								</td>
							</tr>
						{:else}
							{#each filteredEvents as event (event.id)}
								<tr class="hover">
									<td class="font-mono text-xs">{formatTimestamp(event.timestamp)}</td>
									<td>
										<span class="badge badge-outline">{event.topic}</span>
									</td>
									<td>
										<span class="badge {getEventBadgeClass(event.eventType)}">
											{event.eventType}
										</span>
									</td>
									<td>
										<details class="collapse collapse-arrow bg-base-200">
											<summary class="collapse-title text-xs cursor-pointer">
												View payload
											</summary>
											<div class="collapse-content">
												<pre class="text-xs overflow-x-auto">{JSON.stringify(
														event.data,
														null,
														2
													)}</pre>
											</div>
										</details>
									</td>
									<td>
										{#if event.status === 'success'}
											<span class="badge badge-success badge-sm">✓</span>
										{:else if event.status === 'processing'}
											<span class="badge badge-warning badge-sm">⏳</span>
										{:else}
											<span class="badge badge-error badge-sm">✗</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Instructions -->
	<div class="alert alert-info mt-6">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			class="stroke-current shrink-0 w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			></path>
		</svg>
		<div>
			<h3 class="font-bold">How it works</h3>
			<div class="text-sm">
				This page shows real-time Kafka events flowing through the microservices architecture. Click
				"Simulate Flow" to see the complete event-driven workflow from shoot creation to email
				notification.
			</div>
		</div>
	</div>
</div>
