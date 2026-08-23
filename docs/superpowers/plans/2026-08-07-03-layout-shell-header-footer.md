# Layout Shell: Header & Footer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared `Header` and `SiteFooter` for the public marketing pages, and replace the old ad-hoc nav/footer markup in `(public)/+layout.svelte` with them.

**Architecture:** `Header` is a fixed bar that starts transparent over the hero and condenses to a solid `.td-surf-1` bar past ~82% of the viewport height (plain scroll-position CSS + a Svelte `$effect`, no library). This is **not just a marketing site** — photographers and clients both log in — so `Header`'s call-to-action must reflect real auth state using the existing `$lib/stores/auth` store: logged out → "Espace client"; authenticated client → "Mes galeries"; authenticated admin → "Tableau de bord". That decision logic is extracted into a pure, independently-tested function (`getAuthCta`) rather than buried in the component. `SiteFooter` is a plain `.td-surf-1` band with the wordmark, nav, and location line.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), the existing `$lib/stores/auth` store, `$lib/components/brand/*` from Phases 1–2.

This is **Phase 3 of 4** implementing `frontend/DESIGN.md`. Depends on Phase 1 (`Mark`, `Wordmark`, `ThemeToggle`, tokens) and Phase 2 (`LangSwitch`) being merged.

## Global Constraints

- Header nav is **flat** (top-level links only: Portfolio, Privé, Services, À propos, Contact) — a deliberate simplification from the old dropdown mega-menu, matching the validated editorial mockup. Subpages (e.g. `/portfolio/weddings`) stay reachable one level in, from their parent landing page.
- Breakpoint `900px` — nav collapses below it (mobile nav trigger is out of scope for this phase; DESIGN.md doesn't specify one yet).
- `Header` reads auth state from the **existing** `$lib/stores/auth` store — do not create a second auth store or duplicate its `User`/`AuthState` types (`$lib/types`).
- Do not modify `(admin)/+layout.svelte` or `(client)/+layout.svelte` — out of scope, keep their current legacy styling and behavior.
- All package installs and scripts run with **pnpm**.
- TDD: write the failing test before the implementation for every component and utility in this plan.

---

### Task 1: `getAuthCta` — pure auth-state-to-CTA logic

**Files:**
- Create: `frontend/src/lib/utils/authCta.ts`
- Test: `frontend/src/lib/utils/authCta.test.ts`

**Interfaces:**
- Consumes: `AuthState` from `$lib/types` (existing: `{ user: User | null; isAuthenticated: boolean; isLoading: boolean; error: string | null }`, `User.role: 'client' | 'admin'`).
- Produces: `getAuthCta(auth: AuthState): { label: string; href: string }`. Consumed by `Header` (Task 3).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/utils/authCta.test.ts
import { describe, expect, it } from 'vitest';
import { getAuthCta } from './authCta';
import type { AuthState } from '$lib/types';

const loggedOut: AuthState = { user: null, isAuthenticated: false, isLoading: false, error: null };

describe('getAuthCta', () => {
	it('offers "Espace client" when logged out', () => {
		expect(getAuthCta(loggedOut)).toEqual({ label: 'Espace client', href: '/auth/magic-link' });
	});

	it('links to the dashboard for an admin', () => {
		const state: AuthState = {
			...loggedOut,
			isAuthenticated: true,
			user: {
				id: '1',
				email: 'a@b.com',
				name: 'Admin',
				role: 'admin',
				createdAt: '',
				updatedAt: ''
			}
		};

		expect(getAuthCta(state)).toEqual({ label: 'Tableau de bord', href: '/dashboard' });
	});

	it('links to galleries for a client', () => {
		const state: AuthState = {
			...loggedOut,
			isAuthenticated: true,
			user: {
				id: '2',
				email: 'c@b.com',
				name: 'Client',
				role: 'client',
				createdAt: '',
				updatedAt: ''
			}
		};

		expect(getAuthCta(state)).toEqual({ label: 'Mes galeries', href: '/galleries' });
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/utils/authCta.test.ts`
Expected: FAIL — `Failed to resolve import "./authCta"`.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/utils/authCta.ts
import type { AuthState } from '$lib/types';

export interface AuthCta {
	label: string;
	href: string;
}

export function getAuthCta(auth: AuthState): AuthCta {
	if (!auth.isAuthenticated) {
		return { label: 'Espace client', href: '/auth/magic-link' };
	}
	if (auth.user?.role === 'admin') {
		return { label: 'Tableau de bord', href: '/dashboard' };
	}
	return { label: 'Mes galeries', href: '/galleries' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/utils/authCta.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/utils/authCta.ts frontend/src/lib/utils/authCta.test.ts
git commit -m "feat(frontend): add auth-aware header CTA logic"
```

---

### Task 2: `SiteFooter` component

**Files:**
- Create: `frontend/src/lib/components/layout/SiteFooter.svelte`
- Test: `frontend/src/lib/components/layout/SiteFooter.test.ts`

**Interfaces:**
- Consumes: `Wordmark` (Phase 1).
- Produces: `SiteFooter` — no props. Consumed by `(public)/+layout.svelte` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/layout/SiteFooter.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SiteFooter from './SiteFooter.svelte';

describe('SiteFooter', () => {
	it('renders the brand, a nav link, and current-year copyright', () => {
		render(SiteFooter);

		expect(screen.getByText('Studio')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');

		const year = new Date().getFullYear();
		expect(screen.getByText(new RegExp(`© ${year} Temps d’Arrêt Studio`))).toBeInTheDocument();
	});

	it('states the Lausanne location', () => {
		render(SiteFooter);

		expect(screen.getByText(/Lausanne/)).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/layout/SiteFooter.test.ts`
Expected: FAIL — `Failed to resolve import "./SiteFooter.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/layout/SiteFooter.svelte -->
<script lang="ts">
	import Wordmark from '$lib/components/brand/Wordmark.svelte';

	const navItems = [
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/professional-services', label: 'Services' },
		{ href: '/about', label: 'À propos' },
		{ href: '/contact', label: 'Contact' },
		{ href: '/auth/magic-link', label: 'Espace client' }
	];

	const year = new Date().getFullYear();
</script>

<footer class="td-surf-1 td-footer">
	<div class="td-wrap">
		<div class="td-footer-top">
			<Wordmark markSize={36} />
			<nav class="td-footer-nav" aria-label="Navigation de pied de page">
				{#each navItems as item (item.href)}
					<a href={item.href}>{item.label}</a>
				{/each}
			</nav>
		</div>
		<div class="td-footer-base">
			<span>&copy; {year} Temps d&rsquo;Arr&ecirc;t Studio &mdash; Romain Lussier</span>
			<span>Lausanne &middot; Sur rendez-vous</span>
		</div>
	</div>
</footer>

<style>
	.td-footer {
		padding: clamp(3rem, 6vw, 4.5rem) 0 3rem;
	}

	.td-footer-top {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: center;
	}

	.td-footer-nav {
		display: flex;
		gap: 1.8rem;
		flex-wrap: wrap;
	}

	.td-footer-nav a {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-weight: 500;
		color: var(--td-t1-muted);
		text-decoration: none;
	}

	.td-footer-nav a:hover {
		color: var(--td-t1-fg);
	}

	.td-footer-base {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--td-t1-line);
		font-size: 0.64rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--td-t1-muted);
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/layout/SiteFooter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/layout/SiteFooter.svelte frontend/src/lib/components/layout/SiteFooter.test.ts
git commit -m "feat(frontend): add SiteFooter"
```

---

### Task 3: `Header` component

**Files:**
- Create: `frontend/src/lib/components/layout/Header.svelte`
- Test: `frontend/src/lib/components/layout/Header.test.ts`

**Interfaces:**
- Consumes: `Wordmark` (Phase 1), `LangSwitch`, `ThemeToggle` (Phase 1/2), `auth` store (`$lib/stores/auth`, existing), `getAuthCta` (Task 1), `page` from `$app/state`.
- Produces: `Header` — no props. Consumed by `(public)/+layout.svelte` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/layout/Header.test.ts
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({
	page: { url: new URL('https://tempsdarret.studio/portfolio') }
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

vi.mock('$lib/paraglide/runtime', () => ({
	locales: ['fr', 'en'],
	getLocale: () => 'fr',
	localizeHref: (path: string) => path
}));

import Header from './Header.svelte';
import { auth } from '$lib/stores/auth';
import { colorMode } from '$lib/stores/theme';

describe('Header', () => {
	beforeEach(() => {
		auth.set({ user: null, isAuthenticated: false, isLoading: false, error: null });
		colorMode.clear();
	});

	it('shows the client-space CTA when logged out', () => {
		render(Header);

		expect(screen.getByRole('link', { name: 'Espace client' })).toHaveAttribute(
			'href',
			'/auth/magic-link'
		);
	});

	it('shows "Mes galeries" for an authenticated client', () => {
		auth.set({
			user: {
				id: '1',
				email: 'c@b.com',
				name: 'C',
				role: 'client',
				createdAt: '',
				updatedAt: ''
			},
			isAuthenticated: true,
			isLoading: false,
			error: null
		});

		render(Header);

		expect(screen.getByRole('link', { name: 'Mes galeries' })).toHaveAttribute(
			'href',
			'/galleries'
		);
	});

	it('marks the current page as active in the nav', () => {
		render(Header);

		expect(screen.getByRole('link', { name: 'Portfolio' }).className).toContain(
			'td-nav-active'
		);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/layout/Header.test.ts`
Expected: FAIL — `Failed to resolve import "./Header.svelte"`.

- [ ] **Step 3: Implement**

```svelte
<!-- frontend/src/lib/components/layout/Header.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth';
	import Wordmark from '$lib/components/brand/Wordmark.svelte';
	import LangSwitch from '$lib/components/brand/LangSwitch.svelte';
	import ThemeToggle from '$lib/components/brand/ThemeToggle.svelte';
	import { getAuthCta } from '$lib/utils/authCta';

	const navItems = [
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/private', label: 'Privé' },
		{ href: '/professional-services', label: 'Services' },
		{ href: '/about', label: 'À propos' },
		{ href: '/contact', label: 'Contact' }
	];

	let stuck = $state(false);

	function onScroll(): void {
		stuck = window.scrollY > window.innerHeight * 0.82;
	}

	$effect(() => {
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	const cta = $derived(getAuthCta($auth));
</script>

<header class="td-header" class:td-header-stuck={stuck}>
	<div class="td-wrap td-header-bar">
		<a href="/" class="td-header-brand">
			<Wordmark markSize={26} />
		</a>
		<div class="td-header-right">
			<nav class="td-header-nav" aria-label="Navigation principale">
				{#each navItems as item (item.href)}
					<a href={item.href} class:td-nav-active={page.url.pathname === item.href}>
						{item.label}
					</a>
				{/each}
				<a href={cta.href} class="td-nav-cta">{cta.label}</a>
			</nav>
			<LangSwitch />
			<ThemeToggle />
		</div>
	</div>
</header>

<style>
	.td-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		color: var(--td-paper);
		transition:
			background 0.4s,
			color 0.4s,
			padding 0.4s;
	}

	.td-header-stuck {
		background: var(--td-t1-bg);
		color: var(--td-t1-fg);
		border-bottom: 1px solid var(--td-t1-line);
	}

	.td-header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.3rem;
		padding-bottom: 1.3rem;
	}

	.td-header-stuck .td-header-bar {
		padding-top: 0.95rem;
		padding-bottom: 0.95rem;
	}

	.td-header-brand {
		text-decoration: none;
		color: inherit;
	}

	.td-header-right {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.td-header-nav {
		display: flex;
		gap: 1.85rem;
	}

	.td-header-nav a {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-weight: 500;
		opacity: 0.82;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.25s;
	}

	.td-header-nav a:hover,
	.td-header-nav a.td-nav-active {
		opacity: 1;
	}

	.td-nav-cta {
		color: var(--td-cream) !important;
		opacity: 1 !important;
	}

	@media (max-width: 900px) {
		.td-header-nav {
			display: none;
		}
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/layout/Header.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/layout/Header.svelte frontend/src/lib/components/layout/Header.test.ts
git commit -m "feat(frontend): add the auth-aware Header"
```

---

### Task 4: Wire `Header`/`SiteFooter` into the public layout

**Files:**
- Modify: `frontend/src/routes/(public)/+layout.svelte`

**Interfaces:**
- Consumes: `Header` (Task 3), `SiteFooter` (Task 2).

- [ ] **Step 1: Replace the entire file**

```svelte
<!-- frontend/src/routes/(public)/+layout.svelte -->
<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';

	let { children } = $props();
</script>

<div class="td-site">
	<Header />
	<main>
		{@render children()}
	</main>
	<SiteFooter />
</div>

<style>
	.td-site {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
	}
</style>
```

(This uses Svelte 5's `children` snippet prop instead of the old `<slot />`, and drops the inline nav-array/footer markup — that responsibility now lives in `Header`/`SiteFooter`.)

- [ ] **Step 2: Verify**

Run: `cd frontend && pnpm run check && pnpm exec vitest run`
Expected: `check` succeeds; the full Vitest suite (Phases 1–3 so far) passes.

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/routes/(public)/+layout.svelte"
git commit -m "feat(frontend): wire Header and SiteFooter into the public layout"
```

---

## Self-Review Notes

- **Spec coverage:** §9 `Header` (with the auth-aware addition from `DESIGN.md`'s scope note) → Tasks 1, 3. §9 `SiteFooter` → Task 2. Wiring into the actual route tree → Task 4.
- **Placeholder scan:** none — every step has complete, real code.
- **Type consistency:** `getAuthCta`'s `AuthCta` return shape (`{label, href}`) is identical in its own module, its test, and how `Header` consumes it (`cta.href`, `cta.label`). `Header`'s mocked `$app/state`/`$app/paths`/`$lib/paraglide/runtime` module shapes match `LangSwitch`'s (Phase 2) exactly, since `Header` renders a real `LangSwitch` internally.
- Verified against the actual current `(public)/+layout.svelte` and `$lib/stores/auth.ts` (read from the repo, not assumed) — the nav route paths and `AuthState`/`User` shapes used above match what already exists.
