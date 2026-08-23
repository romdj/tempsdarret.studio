# Homepage Assembly: Hero, Sommaire, Mosaic, Atelier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four homepage sections from the validated "L'instant retenu" design — `Hero` (the capture animation), `SommaireIndex`, `MosaicGallery`, `AtelierBand` — using real curated photographs, and replace the placeholder `(public)/+page.svelte` with them.

**Architecture:** Each section is a self-contained component that takes its content as typed props (defined once in a shared `types.ts`) rather than hardcoding copy internally — `(public)/+page.svelte` owns the actual curated content and passes it down. This keeps the components testable with small fixtures instead of coupling tests to production copy, and is a deliberate small step toward `DESIGN.md`'s eventual "content-driven from `src/content/`" goal without building a full content-collection system now (that's separate, larger, future work). All motion (the hero capture, scroll reveals) reuses Phase 1's `reveal` action and is scoped inside each component's own `<style>` block — no further global CSS changes needed beyond what Phases 1–3 already added.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Phase 1's `Mark`/`reveal`/tokens, real portfolio JPEGs (existing + newly curated via `sips`).

This is **Phase 4 of 4** implementing `frontend/DESIGN.md`. Depends on Phase 1 (tokens, `Mark`, `reveal`) and Phase 3 (`Header`/`SiteFooter`, already wired into `(public)/+layout.svelte`) being merged.

## Global Constraints

- Content (Sommaire/Mosaic entries, Hero/Atelier copy) is **hardcoded in `(public)/+page.svelte`** for this phase — not pulled from `src/content/`. This is a deliberate, explicit simplification (see Architecture above), not an oversight.
- Sommaire entries for categories without a dedicated route yet (Automobile, Événements, Commercial) link to `/portfolio` (the overview) rather than an invented URL — only Mariages (`/portfolio/weddings`) and Portraits (`/portfolio/portraits`) have real dedicated pages today. Building the missing category pages is separate, future work.
- Images are optimized once via `sips` (resized + JPEG quality) to reasonable web sizes. A full responsive `srcset`/AVIF pipeline (`DESIGN.md` §7) is explicitly **not** built in this phase — one right-sized JPEG per image is the interim approach.
- All package installs and scripts run with **pnpm**.
- TDD: write the failing test before the implementation for every component in this plan. Motion/animation itself isn't meaningfully assertable in jsdom — component tests verify structure and content (image `src`/`alt`, text, links), not computed CSS or animation timing.

---

### Task 1: Curate and optimize the homepage images

**Files:**
- Create: `frontend/static/images/portfolio/automobile/20250316-DSC_1306.jpg`
- Create: `frontend/static/images/portfolio/reportage/20240101-DSC_0066.jpg`
- Create: `frontend/static/images/portfolio/weddings/20250522-DSC_1588.jpg`
- Create: `frontend/static/images/portfolio/commercial/20241018-DSC_0858.jpg`
- Create: `frontend/static/images/portfolio/commercial/20241211-DSC_1168.jpg`
- Modify: `frontend/static/images/portfolio/portraits/20250330-DSC_1347.jpg` (re-optimize in place)
- Modify: `frontend/static/images/portfolio/portraits/20250522-DSC_1762.jpg` (re-optimize in place)
- Modify: `frontend/static/images/portfolio/commercial/20240827-DSC_0499.jpg` (re-optimize in place)

**Interfaces:**
- Produces: the exact static image paths Tasks 3–7 (and `+page.svelte`) reference.

- [ ] **Step 1: Bring in the additional curated categories (run on a machine with access to the Photos folder)**

```bash
cd frontend/static/images/portfolio
mkdir -p automobile reportage weddings

CURATED="$HOME/Pictures/Nikon Transfer 2/Portfolio Temps d'Arret Studio - Romain Lussier"

# Automobile — Alfa Romeo GT
sips -s format jpeg -s formatOptions 78 -Z 1600 "$CURATED/20250316-DSC_1306.jpg" \
	--out automobile/20250316-DSC_1306.jpg

# Reportage — Lisbonne street scene
sips -s format jpeg -s formatOptions 78 -Z 1600 "$CURATED/20240101-DSC_0066.jpg" \
	--out reportage/20240101-DSC_0066.jpg

# Weddings — couple with bouquet
sips -s format jpeg -s formatOptions 78 -Z 1600 "$CURATED/20250522-DSC_1588.jpg" \
	--out weddings/20250522-DSC_1588.jpg

# Commercial — L'Artisan (bike shop)
sips -s format jpeg -s formatOptions 78 -Z 1600 "$CURATED/20241018-DSC_0858.jpg" \
	--out commercial/20241018-DSC_0858.jpg

# Commercial — flatten the "Motion Rehab" studio shot out of its subfolder
# (avoids a literal space in the URL path)
cp "commercial/Motion Rehab/20241211-DSC_1168.jpg" commercial/20241211-DSC_1168.jpg

cd ../../../../..
```

- [ ] **Step 2: Re-optimize the three already-committed images this page reuses**

```bash
cd frontend/static/images/portfolio
sips -s format jpeg -s formatOptions 80 -Z 1900 portraits/20250330-DSC_1347.jpg \
	--out portraits/20250330-DSC_1347.jpg
sips -s format jpeg -s formatOptions 78 -Z 1200 portraits/20250522-DSC_1762.jpg \
	--out portraits/20250522-DSC_1762.jpg
sips -s format jpeg -s formatOptions 78 -Z 1200 commercial/20240827-DSC_0499.jpg \
	--out commercial/20240827-DSC_0499.jpg
cd ../../../../..
```

- [ ] **Step 3: Verify**

Run:

```bash
file frontend/static/images/portfolio/automobile/20250316-DSC_1306.jpg \
	frontend/static/images/portfolio/reportage/20240101-DSC_0066.jpg \
	frontend/static/images/portfolio/weddings/20250522-DSC_1588.jpg \
	frontend/static/images/portfolio/commercial/20241018-DSC_0858.jpg \
	frontend/static/images/portfolio/commercial/20241211-DSC_1168.jpg
```

Expected: all report `JPEG image data`.

- [ ] **Step 4: Commit**

```bash
git add frontend/static/images/portfolio
git commit -m "feat(frontend): add curated homepage images (automobile, reportage, weddings)"
```

---

### Task 2: Shared content types

**Files:**
- Create: `frontend/src/lib/components/gallery/types.ts`

**Interfaces:**
- Produces: `SommaireItem`, `MosaicItem` — consumed by Tasks 4–5 and `+page.svelte` (Task 7).

- [ ] **Step 1: Create the file**

```ts
// frontend/src/lib/components/gallery/types.ts
export interface SommaireItem {
	num: string;
	title: string;
	time: string;
	meta: string;
	href: string;
	thumbnail: string;
	thumbnailAlt: string;
}

export interface MosaicItem {
	src: string;
	alt: string;
	caption: string;
	meta: string;
	spanClass: string;
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && pnpm run check`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/components/gallery/types.ts
git commit -m "feat(frontend): add shared gallery content types"
```

---

### Task 3: `Hero` component

**Files:**
- Create: `frontend/src/lib/components/gallery/Hero.svelte`
- Test: `frontend/src/lib/components/gallery/Hero.test.ts`

**Interfaces:**
- Consumes: `Mark` (Phase 1).
- Produces: `Hero` — props `{ image: { src: string; alt: string }; kicker: string; titleLine1: string; titleLine2: string; tags: string[] }`. Consumed by `+page.svelte` (Task 7).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/gallery/Hero.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Hero from './Hero.svelte';

const props = {
	image: { src: '/images/portfolio/portraits/20250330-DSC_1347.jpg', alt: 'Portrait test' },
	kicker: 'Photographe · Lausanne',
	titleLine1: 'Un instant,',
	titleLine2: 'retenu.',
	tags: ['Mariages', 'Portraits', 'Événements']
};

describe('Hero', () => {
	it('renders the hero image with its alt text', () => {
		render(Hero, { props });

		const img = screen.getByAltText('Portrait test');
		expect(img).toHaveAttribute('src', props.image.src);
	});

	it('renders both title lines', () => {
		render(Hero, { props });

		expect(screen.getByText('Un instant,')).toBeInTheDocument();
		expect(screen.getByText('retenu.')).toBeInTheDocument();
	});

	it('renders every tag', () => {
		render(Hero, { props });

		for (const tag of props.tags) {
			expect(screen.getByText(tag)).toBeInTheDocument();
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/Hero.test.ts`
Expected: FAIL — `Failed to resolve import "./Hero.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/gallery/Hero.svelte -->
<script lang="ts">
	import Mark from '$lib/components/brand/Mark.svelte';

	interface Props {
		image: { src: string; alt: string };
		kicker: string;
		titleLine1: string;
		titleLine2: string;
		tags: string[];
	}

	let { image, kicker, titleLine1, titleLine2, tags }: Props = $props();
</script>

<header class="td-hero">
	<img class="td-hero-bg" src={image.src} alt={image.alt} />
	<div class="td-hero-content">
		<div class="td-wrap">
			<div class="td-hero-kicker">
				<Mark size={26} />
				<span>{kicker}</span>
			</div>
			<h1 class="td-hero-title">
				<span class="td-hero-line td-hero-line-1"><i>{titleLine1}</i></span>
				<span class="td-hero-line td-hero-line-2"><i>{titleLine2}</i></span>
			</h1>
			<div class="td-hero-timeline"></div>
			<div class="td-hero-tags">
				{#each tags as tag, i (tag)}
					{#if i > 0}<span class="td-hero-dot">&mdash;</span>{/if}
					<span>{tag}</span>
				{/each}
			</div>
		</div>
	</div>
	<div class="td-hero-scrollcue">
		<span>Défiler</span>
		<span class="td-hero-scrollcue-line"></span>
	</div>
</header>

<style>
	.td-hero {
		position: relative;
		height: 100svh;
		min-height: 640px;
		overflow: hidden;
		background: #0a0a08;
	}

	.td-hero-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 22%;
		animation: td-hero-capture 1.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}

	@keyframes td-hero-capture {
		from {
			filter: blur(18px) grayscale(0.55) contrast(1.06);
			transform: scale(1.09);
		}
		to {
			filter: blur(0) grayscale(0.12) contrast(1.03);
			transform: scale(1);
		}
	}

	.td-hero::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(8, 7, 5, 0.42) 0%,
			rgba(8, 7, 5, 0.05) 26%,
			rgba(8, 7, 5, 0.22) 55%,
			rgba(8, 7, 5, 0.66) 82%,
			rgba(8, 7, 5, 0.9) 100%
		);
	}

	.td-hero-content {
		position: absolute;
		left: 0;
		right: 0;
		bottom: clamp(3rem, 9vh, 6rem);
		z-index: 3;
		color: var(--td-paper);
	}

	.td-hero-kicker {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin-bottom: 1.3rem;
		opacity: 0;
		animation: td-hero-fade 0.8s 1.05s ease forwards;
		text-transform: uppercase;
		letter-spacing: 0.34em;
		font-size: 0.66rem;
		font-weight: 500;
	}

	.td-hero-title {
		font-weight: 300;
		font-size: clamp(3rem, 10vw, 8.5rem);
		line-height: 0.94;
		letter-spacing: 0.005em;
		margin: 0;
	}

	.td-hero-line {
		display: block;
		overflow: hidden;
	}

	.td-hero-line i {
		display: block;
		font-style: normal;
		transform: translateY(112%);
		animation: td-hero-rise 1s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
	}

	.td-hero-line-1 i {
		animation-delay: 0.35s;
	}

	.td-hero-line-2 i {
		animation-delay: 0.5s;
		font-weight: 400;
	}

	.td-hero-timeline {
		height: 1px;
		width: min(340px, 58vw);
		background: var(--td-paper);
		transform-origin: left;
		margin: 1.6rem 0 1.2rem;
		transform: scaleX(0);
		animation: td-hero-fill 1.9s 0.7s cubic-bezier(0.5, 0, 0.15, 1) forwards;
	}

	.td-hero-tags {
		display: flex;
		gap: 1.2rem;
		flex-wrap: wrap;
		align-items: center;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-weight: 500;
		opacity: 0;
		animation: td-hero-fade 0.8s 1.25s ease forwards;
	}

	.td-hero-dot {
		opacity: 0.5;
	}

	.td-hero-scrollcue {
		position: absolute;
		bottom: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		color: var(--td-paper);
		font-size: 0.56rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		opacity: 0;
		animation: td-hero-fade 1s 1.6s ease forwards;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.td-hero-scrollcue-line {
		width: 1px;
		height: 28px;
		background: linear-gradient(var(--td-paper), transparent);
		animation: td-hero-cue 2.4s ease-in-out infinite;
	}

	@keyframes td-hero-rise {
		to {
			transform: none;
		}
	}

	@keyframes td-hero-fade {
		to {
			opacity: 1;
		}
	}

	@keyframes td-hero-fill {
		to {
			transform: scaleX(1);
		}
	}

	@keyframes td-hero-cue {
		0%,
		100% {
			opacity: 0.25;
			transform: scaleY(0.6);
		}
		50% {
			opacity: 1;
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.td-hero-bg,
		.td-hero-line i,
		.td-hero-timeline,
		.td-hero-kicker,
		.td-hero-tags,
		.td-hero-scrollcue,
		.td-hero-scrollcue-line {
			animation: none !important;
		}

		.td-hero-bg {
			filter: none;
			transform: none;
		}

		.td-hero-line i {
			transform: none;
		}

		.td-hero-timeline {
			transform: scaleX(1);
		}

		.td-hero-kicker,
		.td-hero-tags,
		.td-hero-scrollcue {
			opacity: 1;
		}
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/Hero.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/gallery/Hero.svelte frontend/src/lib/components/gallery/Hero.test.ts
git commit -m "feat(frontend): add the Hero capture-animation component"
```

---

### Task 4: `SommaireIndex` component

**Files:**
- Create: `frontend/src/lib/components/gallery/SommaireIndex.svelte`
- Test: `frontend/src/lib/components/gallery/SommaireIndex.test.ts`

**Interfaces:**
- Consumes: `reveal` (Phase 1), `SommaireItem` (Task 2).
- Produces: `SommaireIndex` — props `{ items: SommaireItem[] }`. Consumed by `+page.svelte` (Task 7).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/gallery/SommaireIndex.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SommaireIndex from './SommaireIndex.svelte';
import type { SommaireItem } from './types';

const items: SommaireItem[] = [
	{
		num: '01',
		title: 'Mariages',
		time: '18:42',
		meta: 'Reportage',
		href: '/portfolio/weddings',
		thumbnail: '/images/portfolio/weddings/test.jpg',
		thumbnailAlt: 'Mariage test'
	},
	{
		num: '02',
		title: 'Portraits',
		time: '11:07',
		meta: 'Studio & extérieur',
		href: '/portfolio/portraits',
		thumbnail: '/images/portfolio/portraits/test.jpg',
		thumbnailAlt: 'Portrait test'
	}
];

describe('SommaireIndex', () => {
	it('renders one link per item, pointing at the right href', () => {
		render(SommaireIndex, { props: { items } });

		expect(screen.getByRole('link', { name: /Mariages/ })).toHaveAttribute(
			'href',
			'/portfolio/weddings'
		);
		expect(screen.getByRole('link', { name: /Portraits/ })).toHaveAttribute(
			'href',
			'/portfolio/portraits'
		);
	});

	it('renders the numbering and timestamp for each item', () => {
		render(SommaireIndex, { props: { items } });

		expect(screen.getByText('01')).toBeInTheDocument();
		expect(screen.getByText('18:42')).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/SommaireIndex.test.ts`
Expected: FAIL — `Failed to resolve import "./SommaireIndex.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/gallery/SommaireIndex.svelte -->
<script lang="ts">
	import { reveal } from '$lib/utils/reveal';
	import type { SommaireItem } from './types';

	interface Props {
		items: SommaireItem[];
	}

	let { items }: Props = $props();
</script>

<section class="td-surf-1 td-sommaire">
	<div class="td-wrap">
		<div class="td-section-head td-reveal" use:reveal>
			<h2>Sommaire</h2>
			<span class="td-eyebrow">Sélection 2025</span>
		</div>
		<ul class="td-index">
			{#each items as item (item.href + item.num)}
				<li class="td-reveal" use:reveal>
					<a href={item.href}>
						<span class="td-index-num">{item.num}</span>
						<span class="td-index-title">{item.title}</span>
						<span class="td-index-time">{item.time}</span>
						<span class="td-index-meta">{item.meta}</span>
					</a>
					<img
						class="td-index-thumb"
						src={item.thumbnail}
						alt={item.thumbnailAlt}
						loading="lazy"
					/>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.td-sommaire {
		padding: clamp(4.5rem, 10vw, 8rem) 0 clamp(2rem, 5vw, 3.5rem);
	}

	.td-section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid var(--td-t1-line);
		padding-top: 1.4rem;
		margin-bottom: 2.6rem;
	}

	.td-section-head h2 {
		font-weight: 300;
		font-size: clamp(1.5rem, 3vw, 2.3rem);
		margin: 0;
	}

	.td-index {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.td-index li {
		position: relative;
		border-bottom: 1px solid var(--td-t1-line);
	}

	.td-index a {
		display: grid;
		grid-template-columns: 3.2rem 1fr auto auto;
		align-items: center;
		gap: 1.4rem;
		padding: clamp(1rem, 2.4vw, 1.8rem) 0;
		text-decoration: none;
		color: inherit;
		transition: padding-left 0.35s ease;
	}

	.td-index-num {
		font-size: 0.72rem;
		color: var(--td-t1-muted);
		letter-spacing: 0.14em;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.td-index-title {
		font-weight: 300;
		font-size: clamp(1.7rem, 4.2vw, 2.9rem);
		line-height: 1.05;
	}

	.td-index-time {
		font-size: 0.66rem;
		color: var(--td-t1-muted);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.td-index-meta {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--td-t1-muted);
		font-weight: 500;
	}

	.td-index a:hover {
		padding-left: 1.1rem;
	}

	.td-index a:hover .td-index-title {
		text-decoration: underline;
		text-underline-offset: 0.35em;
		text-decoration-thickness: 1px;
	}

	.td-index-thumb {
		position: absolute;
		right: 9rem;
		top: 50%;
		width: 210px;
		height: 142px;
		object-fit: cover;
		transform: translateY(-50%) scale(0.96);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.35s,
			transform 0.35s;
		z-index: 4;
		filter: grayscale(0.15);
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
	}

	.td-index li:hover .td-index-thumb {
		opacity: 1;
		transform: translateY(-50%) scale(1);
	}

	@media (max-width: 900px) {
		.td-index-thumb {
			display: none;
		}

		.td-index a {
			grid-template-columns: 2rem 1fr auto;
			gap: 1rem;
		}

		.td-index-meta {
			display: none;
		}
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/SommaireIndex.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/gallery/SommaireIndex.svelte frontend/src/lib/components/gallery/SommaireIndex.test.ts
git commit -m "feat(frontend): add SommaireIndex"
```

---

### Task 5: `MosaicGallery` component

**Files:**
- Create: `frontend/src/lib/components/gallery/MosaicGallery.svelte`
- Test: `frontend/src/lib/components/gallery/MosaicGallery.test.ts`

**Interfaces:**
- Consumes: `reveal` (Phase 1), `MosaicItem` (Task 2).
- Produces: `MosaicGallery` — props `{ items: MosaicItem[] }`. Consumed by `+page.svelte` (Task 7).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/gallery/MosaicGallery.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import MosaicGallery from './MosaicGallery.svelte';
import type { MosaicItem } from './types';

const items: MosaicItem[] = [
	{
		src: '/images/portfolio/automobile/test.jpg',
		alt: 'Alfa Romeo test',
		caption: 'Automobile',
		meta: 'Lausanne',
		spanClass: 'c4 wide'
	},
	{
		src: '/images/portfolio/commercial/test2.jpg',
		alt: 'Artisan test',
		caption: 'Commercial',
		meta: '09:48',
		spanClass: 'c2 r2 tall'
	}
];

describe('MosaicGallery', () => {
	it('renders one figure per item with its image and caption', () => {
		render(MosaicGallery, { props: { items } });

		const img = screen.getByAltText('Alfa Romeo test');
		expect(img).toHaveAttribute('src', items[0].src);
		expect(img).toHaveAttribute('loading', 'lazy');
		expect(screen.getByText('Automobile')).toBeInTheDocument();
	});

	it('applies each item span class to its figure', () => {
		const { container } = render(MosaicGallery, { props: { items } });
		const figures = container.querySelectorAll('figure');

		expect(figures[0].className).toContain('c4');
		expect(figures[1].className).toContain('r2');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/MosaicGallery.test.ts`
Expected: FAIL — `Failed to resolve import "./MosaicGallery.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/gallery/MosaicGallery.svelte -->
<script lang="ts">
	import { reveal } from '$lib/utils/reveal';
	import type { MosaicItem } from './types';

	interface Props {
		items: MosaicItem[];
	}

	let { items }: Props = $props();
</script>

<section class="td-surf-1 td-mosaic-section">
	<div class="td-wrap td-reveal" use:reveal aria-label="Galerie">
		<div class="td-mosaic">
			{#each items as item (item.src)}
				<figure class={item.spanClass}>
					<img src={item.src} alt={item.alt} loading="lazy" />
					<figcaption>
						<span>{item.caption}</span>
						<span class="td-mosaic-meta">{item.meta}</span>
					</figcaption>
				</figure>
			{/each}
		</div>
	</div>
</section>

<style>
	.td-mosaic-section {
		padding: clamp(3rem, 6vw, 5.5rem) 0;
	}

	.td-mosaic {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: clamp(0.55rem, 1.3vw, 1rem);
	}

	.td-mosaic figure {
		margin: 0;
		position: relative;
		overflow: hidden;
		background: var(--td-t1-bg);
	}

	.td-mosaic img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(0.12);
		transition:
			transform 1.1s cubic-bezier(0.2, 0.7, 0.2, 1),
			filter 0.6s;
	}

	.td-mosaic figure:hover img {
		transform: scale(1.05);
		filter: grayscale(0);
	}

	.td-mosaic figcaption {
		position: absolute;
		left: 1rem;
		right: 1rem;
		bottom: 0.85rem;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		font-size: 0.62rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-weight: 500;
		color: #efe9df;
		opacity: 0;
		transform: translateY(6px);
		transition:
			opacity 0.35s,
			transform 0.35s;
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
	}

	.td-mosaic figure:hover figcaption {
		opacity: 1;
		transform: none;
	}

	.td-mosaic-meta {
		opacity: 0.7;
	}

	:global(.td-mosaic .c4) {
		grid-column: span 4;
	}

	:global(.td-mosaic .c3) {
		grid-column: span 3;
	}

	:global(.td-mosaic .c2) {
		grid-column: span 2;
	}

	:global(.td-mosaic .r2) {
		grid-row: span 2;
	}

	:global(.td-mosaic .tall) {
		aspect-ratio: 3 / 4;
	}

	:global(.td-mosaic .wide) {
		aspect-ratio: 16 / 10;
	}

	:global(.td-mosaic .sq) {
		aspect-ratio: 1 / 1;
	}

	@media (max-width: 900px) {
		.td-mosaic {
			grid-template-columns: repeat(2, 1fr);
		}

		:global(.td-mosaic .c4),
		:global(.td-mosaic .c3),
		:global(.td-mosaic .c2) {
			grid-column: span 1;
		}

		:global(.td-mosaic .wide) {
			aspect-ratio: 4 / 5;
		}
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/MosaicGallery.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/gallery/MosaicGallery.svelte frontend/src/lib/components/gallery/MosaicGallery.test.ts
git commit -m "feat(frontend): add MosaicGallery"
```

---

### Task 6: `AtelierBand` component

**Files:**
- Create: `frontend/src/lib/components/gallery/AtelierBand.svelte`
- Test: `frontend/src/lib/components/gallery/AtelierBand.test.ts`

**Interfaces:**
- Consumes: `reveal`, `Mark` (Phase 1).
- Produces: `AtelierBand` — props `{ image: { src: string; alt: string }; heading: string; body: string; ctaLabel: string; ctaHref: string }`. Consumed by `+page.svelte` (Task 7).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/gallery/AtelierBand.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AtelierBand from './AtelierBand.svelte';

const props = {
	image: { src: '/images/portfolio/portraits/test.jpg', alt: 'Portrait en extérieur' },
	heading: 'Un temps d’arrêt, c’est arracher un instant au temps.',
	body: 'Romain Lussier photographie les gens tels qu’ils sont.',
	ctaLabel: 'Découvrir la démarche',
	ctaHref: '/about'
};

describe('AtelierBand', () => {
	it('renders the photo, heading, body, and CTA link', () => {
		render(AtelierBand, { props });

		expect(screen.getByAltText('Portrait en extérieur')).toHaveAttribute(
			'src',
			props.image.src
		);
		expect(screen.getByText(props.heading)).toBeInTheDocument();
		expect(screen.getByText(props.body)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: props.ctaLabel })).toHaveAttribute(
			'href',
			'/about'
		);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/AtelierBand.test.ts`
Expected: FAIL — `Failed to resolve import "./AtelierBand.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/gallery/AtelierBand.svelte -->
<script lang="ts">
	import { reveal } from '$lib/utils/reveal';
	import Mark from '$lib/components/brand/Mark.svelte';

	interface Props {
		image: { src: string; alt: string };
		heading: string;
		body: string;
		ctaLabel: string;
		ctaHref: string;
	}

	let { image, heading, body, ctaLabel, ctaHref }: Props = $props();
</script>

<section class="td-surf-2 td-atelier-band">
	<div class="td-wrap td-atelier td-reveal" use:reveal>
		<div class="td-atelier-photo">
			<img src={image.src} alt={image.alt} loading="lazy" />
		</div>
		<div>
			<Mark size={38} />
			<span class="td-eyebrow">L&rsquo;Atelier</span>
			<h3>{heading}</h3>
			<p>{body}</p>
			<a class="td-atelier-cta" href={ctaHref}>{ctaLabel}</a>
		</div>
	</div>
</section>

<style>
	.td-atelier-band {
		padding: clamp(4rem, 9vw, 7rem) 0;
	}

	.td-atelier {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(2rem, 5vw, 5rem);
		align-items: center;
	}

	.td-atelier-photo {
		aspect-ratio: 4 / 5;
		overflow: hidden;
	}

	.td-atelier-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(0.06);
	}

	.td-atelier :global(.td-mark) {
		margin-bottom: 1.2rem;
	}

	.td-atelier .td-eyebrow {
		display: block;
		margin-bottom: 0.4rem;
	}

	.td-atelier h3 {
		font-weight: 300;
		font-size: clamp(1.7rem, 3.6vw, 2.7rem);
		margin: 0 0 1.2rem;
		line-height: 1.15;
		text-wrap: balance;
	}

	.td-atelier p {
		font-weight: 400;
		font-size: 1rem;
		line-height: 1.8;
		opacity: 0.85;
		max-width: 44ch;
	}

	.td-atelier-cta {
		display: inline-block;
		margin-top: 1.9rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		font-weight: 500;
		border-bottom: 1px solid currentColor;
		padding-bottom: 0.4rem;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.3s;
	}

	.td-atelier-cta:hover {
		opacity: 0.6;
	}

	@media (max-width: 900px) {
		.td-atelier {
			grid-template-columns: 1fr;
		}
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/gallery/AtelierBand.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/gallery/AtelierBand.svelte frontend/src/lib/components/gallery/AtelierBand.test.ts
git commit -m "feat(frontend): add AtelierBand"
```

---

### Task 7: Wire the homepage together and retire the last legacy theme leftover

**Files:**
- Modify: `frontend/src/routes/(public)/+page.svelte`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: `Hero` (Task 3), `SommaireIndex` (Task 4), `MosaicGallery` (Task 5), `AtelierBand` (Task 6), `SommaireItem`/`MosaicItem` (Task 2).

- [ ] **Step 1: Replace `frontend/src/routes/(public)/+page.svelte` entirely**

```svelte
<script lang="ts">
	import Hero from '$lib/components/gallery/Hero.svelte';
	import SommaireIndex from '$lib/components/gallery/SommaireIndex.svelte';
	import MosaicGallery from '$lib/components/gallery/MosaicGallery.svelte';
	import AtelierBand from '$lib/components/gallery/AtelierBand.svelte';
	import type { SommaireItem, MosaicItem } from '$lib/components/gallery/types';

	const sommaireItems: SommaireItem[] = [
		{
			num: '01',
			title: 'Mariages',
			time: '18:42',
			meta: 'Reportage',
			href: '/portfolio/weddings',
			thumbnail: '/images/portfolio/weddings/20250522-DSC_1588.jpg',
			thumbnailAlt: 'Un couple, bouquet à la main'
		},
		{
			num: '02',
			title: 'Portraits',
			time: '11:07',
			meta: 'Studio & extérieur',
			href: '/portfolio/portraits',
			thumbnail: '/images/portfolio/portraits/20250522-DSC_1762.jpg',
			thumbnailAlt: 'Portrait en extérieur, lumière rasante'
		},
		{
			num: '03',
			title: 'Automobile',
			time: '15:33',
			meta: 'Éditorial',
			href: '/portfolio',
			thumbnail: '/images/portfolio/automobile/20250316-DSC_1306.jpg',
			thumbnailAlt: 'Alfa Romeo rouge, portrait automobile'
		},
		{
			num: '04',
			title: 'Événements',
			time: '21:15',
			meta: 'Privé & corporate',
			href: '/portfolio',
			thumbnail: '/images/portfolio/commercial/20240827-DSC_0499.jpg',
			thumbnailAlt: 'Portrait d’un artisan en cuisine'
		},
		{
			num: '05',
			title: 'Commercial',
			time: '09:48',
			meta: 'Marques & lieux',
			href: '/portfolio',
			thumbnail: '/images/portfolio/commercial/20241211-DSC_1168.jpg',
			thumbnailAlt: 'Espace intérieur, signalétique MO+RE'
		}
	];

	const mosaicItems: MosaicItem[] = [
		{
			src: '/images/portfolio/automobile/20250316-DSC_1306.jpg',
			alt: 'Alfa Romeo rouge, portrait automobile',
			caption: 'Automobile',
			meta: 'Alfa Romeo GT',
			spanClass: 'c4 wide'
		},
		{
			src: '/images/portfolio/commercial/20241018-DSC_0858.jpg',
			alt: 'Artisan devant son atelier de cycles',
			caption: 'Commercial',
			meta: 'L’Artisan',
			spanClass: 'c2 r2 tall'
		},
		{
			src: '/images/portfolio/weddings/20250522-DSC_1588.jpg',
			alt: 'Un couple, bouquet à la main',
			caption: 'Mariage',
			meta: 'Lausanne',
			spanClass: 'c2 sq'
		},
		{
			src: '/images/portfolio/commercial/20240827-DSC_0499.jpg',
			alt: 'Portrait d’un artisan en cuisine',
			caption: 'Portrait',
			meta: 'Métiers',
			spanClass: 'c2 sq'
		},
		{
			src: '/images/portfolio/commercial/20241211-DSC_1168.jpg',
			alt: 'Espace intérieur, signalétique MO+RE',
			caption: 'Commercial',
			meta: 'Espace',
			spanClass: 'c3 wide'
		},
		{
			src: '/images/portfolio/reportage/20240101-DSC_0066.jpg',
			alt: 'Rue pavée en noir et blanc',
			caption: 'Reportage',
			meta: 'Lisbonne',
			spanClass: 'c3 wide'
		}
	];
</script>

<svelte:head>
	<title>Temps d’Arrêt Studio — Photographie à Lausanne</title>
	<meta
		name="description"
		content="Temps d’Arrêt Studio, photographie de mariages, portraits et événements à Lausanne, par Romain Lussier."
	/>
</svelte:head>

<Hero
	image={{
		src: '/images/portfolio/portraits/20250330-DSC_1347.jpg',
		alt: 'Portrait d’une femme en lumière naturelle'
	}}
	kicker="Photographe · Lausanne"
	titleLine1="Un instant,"
	titleLine2="retenu."
	tags={['Mariages', 'Portraits', 'Événements']}
/>

<SommaireIndex items={sommaireItems} />

<MosaicGallery items={mosaicItems} />

<AtelierBand
	image={{
		src: '/images/portfolio/portraits/20250522-DSC_1762.jpg',
		alt: 'Portrait en extérieur, lumière rasante'
	}}
	heading="Un temps d’arrêt, c’est arracher un instant au temps."
	body="Romain Lussier photographie les gens tels qu’ils sont — un geste, un regard, la lumière d’un instant qui ne reviendra pas. Du mariage au portrait d’entreprise, la même exigence : retenir ce qui compte."
	ctaLabel="Découvrir la démarche"
	ctaHref="/about"
/>
```

- [ ] **Step 2: Confirm nothing else still uses `font-serif`**

Run: `grep -rn "font-serif" frontend/src`
Expected: no matches (Phase 3 already rewrote `(public)/+layout.svelte`; this step just rewrote `+page.svelte`).

If there ARE matches (e.g. `(admin)`/`(client)` pages you haven't touched), **stop** — leave the `serif` key in `tailwind.config.js` and skip Step 3, since removing it would break those out-of-scope pages.

- [ ] **Step 3: Remove the now-unused `serif` font family (only if Step 2 found no matches)**

```diff
 			fontFamily: {
 				sans: ['Montserrat', 'system-ui', '-apple-system', 'Arial', 'sans-serif'],
-				serif: ['Playfair Display', 'Georgia', 'serif']
 			}
```

- [ ] **Step 4: Verify everything**

Run: `cd frontend && pnpm run check && pnpm exec vitest run && pnpm run build`
Expected: all three succeed — type-check, the full test suite (Phases 1–4), and the static production build.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/routes/(public)/+page.svelte" frontend/tailwind.config.js
git commit -m "feat(frontend): assemble the homepage from Hero, Sommaire, Mosaic, and Atelier"
```

---

## Self-Review Notes

- **Spec coverage:** §9 `Hero`, `SommaireIndex`, `MosaicGallery`, `AtelierBand` → Tasks 3–6. §6 motion (hero capture, timeline fill, hover) → Task 3, 5. §7 imagery (curated, desaturate→color hover, timestamp motif, lazy-loading) → Tasks 1, 3–5. Final assembly → Task 7.
- **Placeholder scan:** none — every step has complete, real code and exact, previously-verified `sips` commands (source paths confirmed to exist on this machine earlier in this session).
- **Type consistency:** `SommaireItem`/`MosaicItem` field names are identical across `types.ts`, each component's props, each component's test, and `+page.svelte`'s literal data. `Hero`'s `image`/`tags` prop shape matches between its own test and `+page.svelte`'s usage. `AtelierBand`'s prop names match between its test and `+page.svelte`.
- **Known gap, explicitly out of scope:** Sommaire entries for Automobile/Événements/Commercial link to `/portfolio` rather than dedicated category pages, since those routes don't exist yet — noted in Global Constraints, not silently swept under the rug.
