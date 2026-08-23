# Design Foundation: Tokens & Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Temps d'Arrêt design token system (palette, tonal-role theming, Montserrat type) and the shared brand primitives (`Mark`, `Wordmark`, theme toggle, scroll-reveal) that every later phase builds on.

**Architecture:** Palette + tonal roles live as CSS custom properties in `frontend/src/app.css`, namespaced `--td-*` to avoid colliding with any other global custom property. A new `data-color-mode` attribute drives the light/dark override — deliberately **not** `data-theme`, which daisyUI already owns for the legacy admin/client portal theme (kept untouched). New public-site components read the tokens through small `.td-*` utility classes, never the raw hex values. `Mark`/`Wordmark`/`ThemeToggle`/`reveal` are the first real components, driving the jsdom + Testing Library setup this repo doesn't have yet.

**Tech Stack:** SvelteKit 2 (Svelte 5, runes), Tailwind CSS 3, `@fontsource/montserrat`, Vitest 3 + `@testing-library/svelte` + jsdom, pnpm workspace.

This is **Phase 1 of 4** implementing `frontend/DESIGN.md`. Later phases: Phase 2 (i18n), Phase 3 (Header/Footer), Phase 4 (homepage).

## Global Constraints

- Palette (exact hex, from `frontend/DESIGN.md` §2): espresso `#17130d`, cream `#efe7d7`, paper `#efe9df`, ink `#1d180f`, muted-dark `#9a9184`, muted-cream `#7c7364`, line-dark `rgba(239,233,223,.15)`, line-cream `rgba(29,24,15,.16)`.
- Theme override attribute is `data-color-mode` (`"dark"` | `"light"`) on `<html>` — **not** `data-theme` (owned by legacy daisyUI, untouched).
- Montserrat weights 300/400/500/600, self-hosted via `@fontsource/montserrat` (no CDN).
- Breakpoint `900px`. Max content width `1280px`, gutter `clamp(1.25rem, 4vw, 3rem)`.
- All motion gated on `prefers-reduced-motion: reduce`.
- Mark recolors via `currentColor` (CSS `mask-image`), min rendered size 24px.
- All package installs and scripts run with **pnpm** (`pnpm add`, `pnpm --filter frontend ...`) — this monorepo enforces pnpm-only.
- New components use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`), not legacy `export let`/`<slot>`.
- Every new piece of logic (stores, actions, non-trivial components) gets a Vitest test written **before** the implementation (TDD), per project convention. Pure CSS/token changes are verified by `pnpm --filter frontend run check` and `pnpm --filter frontend run build` instead — there's no meaningful red/green cycle for a hex value.
- Do not modify `frontend/src/routes/(admin)/`, `frontend/src/routes/(client)/`, or any daisyUI theme values — explicitly out of scope, must keep working unchanged.

---

### Task 1: Component-testing infrastructure (jsdom + Testing Library)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.json`
- Create: `frontend/vitest-setup-client.ts`

**Interfaces:**
- Produces: a working `pnpm --filter frontend exec vitest run <file>` pipeline (jsdom environment, `@testing-library/svelte` + `@testing-library/jest-dom` matchers available) that every later task in this plan (and Phases 2–4) relies on.

- [ ] **Step 1: Install the testing dependencies**

```bash
cd frontend
pnpm add -D @testing-library/svelte@^5.4.2 @testing-library/jest-dom@^7.0.0 jsdom@^30.0.1
cd ..
```

- [ ] **Step 2: Rewrite `frontend/vite.config.ts` to add the Testing Library plugin and a Vitest block**

Replace the entire file:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
```

(`svelteTesting()` adds automatic component cleanup between tests and resolves Svelte's browser build in the test environment; switching `defineConfig` to `vitest/config` is required so the `test` field type-checks — it still produces a fully valid Vite config for `dev`/`build`.)

- [ ] **Step 3: Create `frontend/vitest-setup-client.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Register the jest-dom matcher types in `frontend/tsconfig.json`**

In `compilerOptions`, add a `types` array:

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler",
		"types": ["@testing-library/jest-dom"]
	}
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json pnpm-lock.yaml frontend/vite.config.ts frontend/vitest-setup-client.ts frontend/tsconfig.json
git commit -m "test(frontend): add jsdom + testing-library/svelte component testing setup"
```

(This task has no standalone red/green cycle — Task 4's first real component test is what proves the pipeline works end-to-end.)

---

### Task 2: Design tokens and base styles

**Files:**
- Modify: `frontend/src/app.css`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--td-espresso`, `--td-cream`, `--td-paper`, `--td-ink`, `--td-muted-dark`, `--td-muted-cream`, `--td-line-dark`, `--td-line-cream`, and the tonal-role set `--td-t1-bg/--td-t1-fg/--td-t1-muted/--td-t1-line/--td-t1-brand` (and `--td-t2-*`), resolved via `prefers-color-scheme` and overridable via `[data-color-mode]`. Utility classes `.td-wrap`, `.td-surf-1`, `.td-surf-2`, `.td-eyebrow`. `font-family: sans` now resolves to Montserrat. All later tasks and phases build on these.

- [ ] **Step 1: Add the Montserrat dependency**

```bash
cd frontend
pnpm add @fontsource/montserrat@^5.3.0
cd ..
```

- [ ] **Step 2: Update `frontend/tailwind.config.js` — Montserrat as the sans stack**

Change only the `fontFamily` block (leave the daisyUI `themes` array, including the legacy `tempsdarret` theme, completely untouched — it still serves the unmigrated `(admin)`/`(client)` pages):

```diff
 			fontFamily: {
-				sans: ['Futura', 'Avenir Next', 'Montserrat', 'system-ui', 'sans-serif'],
+				sans: ['Montserrat', 'system-ui', '-apple-system', 'Arial', 'sans-serif'],
 				serif: ['Playfair Display', 'Georgia', 'serif']
 			}
```

(The `serif` key stays for now — it's still referenced by the not-yet-rewritten `(public)/+layout.svelte` and `(public)/+page.svelte`. Phase 4 removes it once those files are rewritten and nothing references `font-serif` anymore.)

- [ ] **Step 3: Rewrite `frontend/src/app.css`**

Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '@fontsource/montserrat/300.css';
@import '@fontsource/montserrat/400.css';
@import '@fontsource/montserrat/500.css';
@import '@fontsource/montserrat/600.css';

/* --- Temps d'Arrêt design tokens — see frontend/DESIGN.md §2 --- */
:root {
	--td-espresso: #17130d;
	--td-cream: #efe7d7;
	--td-paper: #efe9df;
	--td-ink: #1d180f;
	--td-muted-dark: #9a9184;
	--td-muted-cream: #7c7364;
	--td-line-dark: rgba(239, 233, 223, 0.15);
	--td-line-cream: rgba(29, 24, 15, 0.16);

	/* Tonal roles: T1 = primary ground, T2 = secondary ground. Dark theme = T1 espresso. */
	--td-t1-bg: var(--td-espresso);
	--td-t1-fg: var(--td-paper);
	--td-t1-muted: var(--td-muted-dark);
	--td-t1-line: var(--td-line-dark);
	--td-t1-brand: var(--td-cream);

	--td-t2-bg: var(--td-cream);
	--td-t2-fg: var(--td-ink);
	--td-t2-muted: var(--td-muted-cream);
	--td-t2-line: var(--td-line-cream);
	--td-t2-brand: var(--td-ink);
}

@media (prefers-color-scheme: light) {
	:root {
		--td-t1-bg: var(--td-cream);
		--td-t1-fg: var(--td-ink);
		--td-t1-muted: var(--td-muted-cream);
		--td-t1-line: var(--td-line-cream);
		--td-t1-brand: var(--td-ink);

		--td-t2-bg: var(--td-espresso);
		--td-t2-fg: var(--td-paper);
		--td-t2-muted: var(--td-muted-dark);
		--td-t2-line: var(--td-line-dark);
		--td-t2-brand: var(--td-cream);
	}
}

:root[data-color-mode='dark'] {
	--td-t1-bg: var(--td-espresso);
	--td-t1-fg: var(--td-paper);
	--td-t1-muted: var(--td-muted-dark);
	--td-t1-line: var(--td-line-dark);
	--td-t1-brand: var(--td-cream);

	--td-t2-bg: var(--td-cream);
	--td-t2-fg: var(--td-ink);
	--td-t2-muted: var(--td-muted-cream);
	--td-t2-line: var(--td-line-cream);
	--td-t2-brand: var(--td-ink);
}

:root[data-color-mode='light'] {
	--td-t1-bg: var(--td-cream);
	--td-t1-fg: var(--td-ink);
	--td-t1-muted: var(--td-muted-cream);
	--td-t1-line: var(--td-line-cream);
	--td-t1-brand: var(--td-ink);

	--td-t2-bg: var(--td-espresso);
	--td-t2-fg: var(--td-paper);
	--td-t2-muted: var(--td-muted-dark);
	--td-t2-line: var(--td-line-dark);
	--td-t2-brand: var(--td-cream);
}

@layer base {
	/* Custom base styles (legacy — still used by unmigrated pages) */
	body {
		@apply bg-base-100 text-base-content;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		@apply font-serif;
	}
}

@layer components {
	/* Photography-specific components (legacy, still used by unmigrated pages) */
	.photo-grid {
		@apply grid gap-4;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	}

	.photo-card {
		@apply relative overflow-hidden rounded-lg shadow-md transition-transform duration-300 hover:scale-105;
	}

	.page-container {
		@apply container mx-auto px-4 py-8 max-w-7xl;
	}

	.loading-spinner {
		@apply animate-spin rounded-full border-4;
		border-color: hsl(var(--p) / var(--tw-border-opacity, 1));
		border-top-color: transparent;
	}

	/* --- Temps d'Arrêt public-site design system --- */
	.td-wrap {
		max-width: 1280px;
		margin-left: auto;
		margin-right: auto;
		padding-left: clamp(1.25rem, 4vw, 3rem);
		padding-right: clamp(1.25rem, 4vw, 3rem);
	}

	.td-surf-1 {
		background: var(--td-t1-bg);
		color: var(--td-t1-fg);
	}

	.td-surf-2 {
		background: var(--td-t2-bg);
		color: var(--td-t2-fg);
	}

	.td-eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.3em;
		font-size: 0.68rem;
		font-weight: 500;
	}
}

@layer utilities {
	/* Custom utilities */
	.text-balance {
		text-wrap: balance;
	}
}
```

- [ ] **Step 4: Verify the CSS compiles**

Run: `cd frontend && pnpm run check && pnpm run build`
Expected: both succeed with no errors (warnings from existing/legacy files are fine).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app.css frontend/tailwind.config.js frontend/package.json pnpm-lock.yaml
git commit -m "feat(frontend): add Temps d'Arrêt design tokens and Montserrat type"
```

---

### Task 3: Brand mark asset export

**Files:**
- Create: `frontend/static/brand/mark.png`
- Create: `frontend/static/favicon.png`
- Delete: `frontend/static/favicon.svg`
- Modify: `frontend/src/app.html`

**Interfaces:**
- Produces: `/brand/mark.png` — the source image Task 4's `Mark` component masks with `currentColor`.

- [ ] **Step 1: Export the mark from the brand vector source (run on a machine with access to the Handout folder)**

```bash
SRC="$HOME/Work/Temps d'arret Studio/2025/Brand & Identity/Handout/vector files 9/logo 2.pdf"

mkdir -p frontend/static/brand

# Full lockup, rasterized at high resolution
sips -s format png -Z 2400 "$SRC" --out /tmp/td-logo-full.png

# Crop to the mark only (top ~55%, centered) — same crop used during design validation
sips -c 2000 2100 /tmp/td-logo-full.png --out /tmp/td-mark-crop.png

# Production asset: transparent PNG, 512px is enough for the mark's largest real use
# (~40px on screen) even at high-DPI, without bloating the bundle
sips -s format png -Z 512 /tmp/td-mark-crop.png --out frontend/static/brand/mark.png

# Favicon: same crop
sips -s format png -Z 512 /tmp/td-mark-crop.png --out frontend/static/favicon.png

rm frontend/static/favicon.svg /tmp/td-logo-full.png /tmp/td-mark-crop.png
```

- [ ] **Step 2: Point the favicon link at the new PNG**

In `frontend/src/app.html`:

```diff
-		<link rel="icon" href="%sveltekit.assets%/favicon.svg" />
+		<link rel="icon" type="image/png" href="%sveltekit.assets%/favicon.png" />
```

- [ ] **Step 3: Verify the assets**

Run: `file frontend/static/brand/mark.png frontend/static/favicon.png`
Expected: both report `PNG image data`, with an alpha channel.

- [ ] **Step 4: Commit**

```bash
git add frontend/static/brand/mark.png frontend/static/favicon.png frontend/src/app.html
git rm frontend/static/favicon.svg
git commit -m "feat(frontend): add the Temps d'Arrêt mark asset and favicon"
```

---

### Task 4: `Mark` component

**Files:**
- Create: `frontend/src/lib/components/brand/Mark.svelte`
- Test: `frontend/src/lib/components/brand/Mark.test.ts`

**Interfaces:**
- Consumes: `/brand/mark.png` (Task 3).
- Produces: `Mark` — props `{ size?: number }` (default `28`), renders a `currentColor`-tinted, `aria-hidden` mark. Consumed by `Wordmark` (Task 5) and every later phase's header/footer/hero.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/brand/Mark.test.ts
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Mark from './Mark.svelte';

describe('Mark', () => {
	it('renders with the default size and marks itself decorative', () => {
		const { container } = render(Mark);
		const el = container.querySelector('.td-mark');

		expect(el).not.toBeNull();
		expect(el).toHaveAttribute('aria-hidden', 'true');
		expect(el).toHaveStyle({ width: '28px', height: '28px' });
	});

	it('accepts a custom size', () => {
		const { container } = render(Mark, { props: { size: 48 } });
		const el = container.querySelector('.td-mark');

		expect(el).toHaveStyle({ width: '48px', height: '48px' });
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/Mark.test.ts`
Expected: FAIL — `Failed to resolve import "./Mark.svelte"`.

- [ ] **Step 3: Implement the component**

```svelte
<!-- frontend/src/lib/components/brand/Mark.svelte -->
<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 28 }: Props = $props();
</script>

<span class="td-mark" style:width="{size}px" style:height="{size}px" aria-hidden="true"></span>

<style>
	.td-mark {
		display: inline-block;
		flex-shrink: 0;
		background-color: currentColor;
		-webkit-mask-image: url('/brand/mark.png');
		mask-image: url('/brand/mark.png');
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/Mark.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/brand/Mark.svelte frontend/src/lib/components/brand/Mark.test.ts
git commit -m "feat(frontend): add the recolorable brand Mark component"
```

---

### Task 5: `Wordmark` component

**Files:**
- Create: `frontend/src/lib/components/brand/Wordmark.svelte`
- Test: `frontend/src/lib/components/brand/Wordmark.test.ts`

**Interfaces:**
- Consumes: `Mark` (Task 4).
- Produces: `Wordmark` — props `{ markSize?: number }` (default `28`). Consumed by Phase 3's `Header`/`SiteFooter`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/brand/Wordmark.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Wordmark from './Wordmark.svelte';

describe('Wordmark', () => {
	it('renders the brand name and descriptor', () => {
		render(Wordmark);

		expect(screen.getByText('Temps d’Arrêt')).toBeInTheDocument();
		expect(screen.getByText('Studio')).toBeInTheDocument();
	});

	it('includes the mark', () => {
		const { container } = render(Wordmark);

		expect(container.querySelector('.td-mark')).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/Wordmark.test.ts`
Expected: FAIL — `Failed to resolve import "./Wordmark.svelte"`.

- [ ] **Step 3: Implement the component**

```svelte
<!-- frontend/src/lib/components/brand/Wordmark.svelte -->
<script lang="ts">
	import Mark from './Mark.svelte';

	interface Props {
		markSize?: number;
	}

	let { markSize = 28 }: Props = $props();
</script>

<span class="td-wordmark">
	<Mark size={markSize} />
	<span class="td-wordmark-text">
		<b>Temps d’Arrêt</b>
		<small>Studio</small>
	</span>
</span>

<style>
	.td-wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		color: inherit;
	}

	.td-wordmark-text {
		line-height: 1.05;
	}

	.td-wordmark-text b {
		display: block;
		font-weight: 500;
		font-size: 0.96rem;
		letter-spacing: 0.02em;
	}

	.td-wordmark-text small {
		display: block;
		font-size: 0.54rem;
		letter-spacing: 0.36em;
		text-transform: uppercase;
		opacity: 0.7;
		font-weight: 500;
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/Wordmark.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/brand/Wordmark.svelte frontend/src/lib/components/brand/Wordmark.test.ts
git commit -m "feat(frontend): add the Wordmark component"
```

---

### Task 6: Color-mode store and `ThemeToggle`

**Files:**
- Create: `frontend/src/lib/stores/theme.ts`
- Test: `frontend/src/lib/stores/theme.test.ts`
- Create: `frontend/src/lib/components/brand/ThemeToggle.svelte`
- Test: `frontend/src/lib/components/brand/ThemeToggle.test.ts`

**Interfaces:**
- Produces: `colorMode` store (`$lib/stores/theme`) — `{ subscribe, setMode(mode: 'light'|'dark'), toggle(current: 'light'|'dark'|null), clear() }`, and type `ColorMode = 'light' | 'dark'`. Writes/reads `localStorage['td-color-mode']` and `document.documentElement.dataset.colorMode`. `ThemeToggle` — no props, renders a button. Consumed by Phase 3's `Header`.

- [ ] **Step 1: Write the failing store test**

```ts
// frontend/src/lib/stores/theme.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { colorMode } from './theme';

describe('colorMode store', () => {
	beforeEach(() => {
		colorMode.clear();
	});

	it('clear() resets to no override', () => {
		expect(get(colorMode)).toBeNull();
		expect(document.documentElement.dataset.colorMode).toBeUndefined();
	});

	it('setMode persists the choice and updates the document', () => {
		colorMode.setMode('dark');

		expect(get(colorMode)).toBe('dark');
		expect(document.documentElement.dataset.colorMode).toBe('dark');
		expect(localStorage.getItem('td-color-mode')).toBe('dark');
	});

	it('toggle flips from dark to light', () => {
		colorMode.setMode('dark');
		colorMode.toggle('dark');

		expect(get(colorMode)).toBe('light');
		expect(document.documentElement.dataset.colorMode).toBe('light');
	});

	it('toggle treats no override as light, so it switches to dark', () => {
		colorMode.toggle(null);

		expect(get(colorMode)).toBe('dark');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/stores/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: Implement the store**

```ts
// frontend/src/lib/stores/theme.ts
import { writable } from 'svelte/store';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'td-color-mode';

function readStoredMode(): ColorMode | null {
	if (typeof localStorage === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' || stored === 'dark' ? stored : null;
}

function applyMode(mode: ColorMode | null): void {
	if (typeof document === 'undefined') return;
	if (mode) {
		document.documentElement.dataset.colorMode = mode;
	} else {
		delete document.documentElement.dataset.colorMode;
	}
}

function createColorModeStore() {
	const { subscribe, set } = writable<ColorMode | null>(readStoredMode());

	function setMode(mode: ColorMode): void {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, mode);
		}
		applyMode(mode);
		set(mode);
	}

	return {
		subscribe,
		setMode,
		toggle(current: ColorMode | null): void {
			setMode(current === 'dark' ? 'light' : 'dark');
		},
		clear(): void {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
			applyMode(null);
			set(null);
		}
	};
}

export const colorMode = createColorModeStore();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/stores/theme.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing component test**

```ts
// frontend/src/lib/components/brand/ThemeToggle.test.ts
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { colorMode } from '$lib/stores/theme';
import ThemeToggle from './ThemeToggle.svelte';

describe('ThemeToggle', () => {
	beforeEach(() => {
		colorMode.clear();
	});

	it('labels itself for switching to dark when no override is active', () => {
		render(ThemeToggle);

		expect(screen.getByRole('button', { name: 'Passer en thème sombre' })).toBeInTheDocument();
	});

	it('toggles the color mode when clicked', async () => {
		render(ThemeToggle);
		const button = screen.getByRole('button');

		await fireEvent.click(button);

		expect(document.documentElement.dataset.colorMode).toBe('dark');
	});
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/ThemeToggle.test.ts`
Expected: FAIL — `Failed to resolve import "./ThemeToggle.svelte"`.

- [ ] **Step 7: Implement the component**

```svelte
<!-- frontend/src/lib/components/brand/ThemeToggle.svelte -->
<script lang="ts">
	import { colorMode } from '$lib/stores/theme';
</script>

<button
	type="button"
	class="td-theme-toggle"
	aria-label={$colorMode === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
	onclick={() => colorMode.toggle($colorMode)}
>
	{$colorMode === 'dark' ? 'Clair' : 'Sombre'}
</button>

<style>
	.td-theme-toggle {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.7rem;
		font-weight: 500;
		opacity: 0.8;
	}

	.td-theme-toggle:hover {
		opacity: 1;
	}
</style>
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/ThemeToggle.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/stores/theme.ts frontend/src/lib/stores/theme.test.ts frontend/src/lib/components/brand/ThemeToggle.svelte frontend/src/lib/components/brand/ThemeToggle.test.ts
git commit -m "feat(frontend): add color-mode store and ThemeToggle"
```

---

### Task 7: `reveal` scroll-in action

**Files:**
- Create: `frontend/src/lib/utils/reveal.ts`
- Test: `frontend/src/lib/utils/reveal.test.ts`
- Modify: `frontend/src/app.css`

**Interfaces:**
- Produces: `reveal(node, options?)` Svelte action (`$lib/utils/reveal`), usable as `use:reveal`. Adds `.in` to the node when it intersects the viewport (or immediately if `prefers-reduced-motion: reduce`), then stops observing. CSS classes `.td-reveal` / `.td-reveal.in`. Consumed by Phase 4's homepage sections.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/utils/reveal.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reveal } from './reveal';

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	observed: Element[] = [];

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		MockIntersectionObserver.instances.push(this);
	}

	observe(target: Element): void {
		this.observed.push(target);
	}

	unobserve(target: Element): void {
		this.observed = this.observed.filter((el) => el !== target);
	}

	disconnect(): void {
		this.observed = [];
	}

	trigger(target: Element, isIntersecting: boolean): void {
		this.callback(
			[{ target, isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

function stubMatchMedia(matches: boolean): void {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {}
	}));
}

describe('reveal action', () => {
	beforeEach(() => {
		MockIntersectionObserver.instances = [];
		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
		stubMatchMedia(false);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('adds the "in" class once the element intersects', () => {
		const node = document.createElement('div');
		reveal(node);

		const observer = MockIntersectionObserver.instances[0];
		expect(node.classList.contains('in')).toBe(false);

		observer.trigger(node, true);

		expect(node.classList.contains('in')).toBe(true);
	});

	it('stops observing after the reveal fires', () => {
		const node = document.createElement('div');
		reveal(node);

		const observer = MockIntersectionObserver.instances[0];
		observer.trigger(node, true);

		expect(observer.observed).not.toContain(node);
	});

	it('reveals immediately when prefers-reduced-motion is set', () => {
		stubMatchMedia(true);

		const node = document.createElement('div');
		reveal(node);

		expect(node.classList.contains('in')).toBe(true);
	});

	it('destroy() disconnects the observer', () => {
		const node = document.createElement('div');
		const action = reveal(node);
		const observer = MockIntersectionObserver.instances[0];

		action.destroy();

		expect(observer.observed).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/utils/reveal.test.ts`
Expected: FAIL — `Failed to resolve import "./reveal"`.

- [ ] **Step 3: Implement the action**

```ts
// frontend/src/lib/utils/reveal.ts
export interface RevealOptions {
	threshold?: number;
}

export function reveal(node: HTMLElement, options: RevealOptions = {}): { destroy(): void } {
	const threshold = options.threshold ?? 0.14;
	const reducedMotion =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	if (reducedMotion || typeof IntersectionObserver === 'undefined') {
		node.classList.add('in');
		return { destroy() {} };
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('in');
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/utils/reveal.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the `.td-reveal` CSS to `frontend/src/app.css`**

Append inside the existing `@layer components` block (after `.td-eyebrow`):

```css
	.td-reveal {
		opacity: 0;
		transform: translateY(28px);
		filter: blur(7px);
		transition:
			opacity 0.9s ease,
			transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
			filter 0.9s ease;
	}

	.td-reveal.in {
		opacity: 1;
		transform: none;
		filter: none;
	}
```

And add a new top-level block after `@layer utilities { ... }`:

```css
@media (prefers-reduced-motion: reduce) {
	.td-reveal {
		opacity: 1;
		transform: none;
		filter: none;
		transition: none;
	}
}
```

- [ ] **Step 6: Verify the build still compiles**

Run: `cd frontend && pnpm run check && pnpm run build`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/utils/reveal.ts frontend/src/lib/utils/reveal.test.ts frontend/src/app.css
git commit -m "feat(frontend): add the reveal scroll-in action"
```

---

## Self-Review Notes

- **Spec coverage:** §2 (tokens/tonal roles) → Task 2. §3 (Montserrat) → Task 2. §5 (logo usage) → Tasks 3–5. §6 (motion, reveal half) → Task 7. §9/§10 (`Mark`, `Wordmark`, `ThemeToggle`, `Reveal`, testing infra) → Tasks 1, 4–7. Not covered here by design: §4 layout specifics, §7 imagery, §8 i18n, remaining §9 components — these are Phases 2–4.
- **Placeholder scan:** none found — every step has complete, real code.
- **Type consistency:** `ColorMode` type and `colorMode.{setMode,toggle,clear}` signatures are identical everywhere they're declared and consumed (Task 6 store + its own test + `ThemeToggle`). `Mark`'s `size` prop and `Wordmark`'s `markSize` prop are consistent between Tasks 4–5.
