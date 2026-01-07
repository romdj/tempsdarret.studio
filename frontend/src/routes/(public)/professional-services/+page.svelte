<script lang="ts">
	const services = [
		{
			name: 'Portrait Sessions',
			href: '/professional-services/portrait-sessions',
			description: 'Professional headshots and personal branding photography for individuals and businesses.'
		},
		{
			name: 'Commercial Photography',
			href: '/professional-services/commercial-photography',
			description: 'Product photography, corporate events, and commercial imagery for brands.'
		},
		{
			name: 'Photo Editing & Retouching',
			href: '/professional-services/photo-editing-retouching',
			description: 'Professional post-production services to enhance and perfect your images.'
		},
		{
			name: 'Team Building Photography',
			href: '/professional-services/teambuilding',
			description: 'Document team building activities and corporate retreats with dynamic imagery.'
		},
		{
			name: 'Photography Workshops',
			href: '/professional-services/workshops',
			description: 'Learn photography techniques through hands-on workshops and training sessions.'
		},
		{
			name: 'Company Events',
			href: '/professional-services/company-events',
			description: 'Complete coverage of corporate events, conferences, and business gatherings.'
		},
		{
			name: 'Fashion Photography',
			href: '/professional-services/fashion-photography',
			description: 'Editorial and commercial fashion photography for designers and brands.'
		},
		{
			name: 'Video Editing',
			href: '/professional-services/video-editing',
			description: 'Professional video editing and post-production for your footage.'
		},
		{
			name: 'Video Aftermovie Production',
			href: '/professional-services/video-aftermovie',
			description: 'Cinematic aftermovies and highlight reels for events and campaigns.'
		}
	];
</script>

<svelte:head>
	<title>Professional Services - Temps D'arrêt Studio</title>
	<meta name="description" content="Professional photography and video services for businesses, brands, and creatives." />
</svelte:head>

<section class="page-container py-16">
	<div class="max-w-4xl mx-auto mb-12 text-center">
		<h1 class="text-5xl font-serif font-bold mb-6">Professional Services</h1>
		<p class="text-xl text-base-content/70">
			Comprehensive photography and video services tailored for businesses, brands, and creative professionals.
		</p>
	</div>

	<!-- Services Grid -->
	<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
		{#each services as service}
			<a href={service.href} class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
				<div class="card-body">
					<h2 class="card-title text-xl font-serif">{service.name}</h2>
					<p class="text-sm text-base-content/70">{service.description}</p>
					<div class="card-actions justify-end mt-2">
						<span class="text-primary text-sm">Learn More →</span>
					</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Why Choose Professional Services -->
	<div class="bg-base-200 rounded-lg p-8 max-w-4xl mx-auto mb-12">
		<h2 class="text-3xl font-serif font-bold mb-6">Why Choose Professional Photography?</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div>
				<h3 class="font-semibold text-lg mb-2">Brand Consistency</h3>
				<p class="text-base-content/70">High-quality visual content that aligns with your brand identity and messaging.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Expertise & Quality</h3>
				<p class="text-base-content/70">Professional equipment, lighting, and post-production for exceptional results.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Time Efficiency</h3>
				<p class="text-base-content/70">Focus on your business while I handle all aspects of visual content creation.</p>
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-2">Flexible Packages</h3>
				<p class="text-base-content/70">Custom solutions tailored to your specific needs and budget.</p>
			</div>
		</div>
	</div>

	<!-- Call to Action -->
	<div class="text-center">
		<a href="/contact" class="btn btn-primary btn-lg">Discuss Your Project</a>
	</div>
</section>
