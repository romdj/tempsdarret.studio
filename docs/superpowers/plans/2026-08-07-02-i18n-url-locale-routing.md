# i18n: URL-Based FR/EN Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bilingual FR/EN routing (Paraglide) and switch the SvelteKit build to static output, since the site's first deployment target is an AWS S3 static website.

**Architecture:** [Paraglide JS 2.x](https://paraglidejs.com/sveltekit) is SvelteKit's official i18n integration — a compiler that turns `messages/{locale}.json` into tree-shaken, type-safe `m.*` functions, plus a `strategy` chain (`url` → `cookie` → `preferredLanguage` → `baseLocale`) that resolves the active locale without hand-written redirect code. French is the **unprefixed** base locale (`/`, `/portfolio`); English is prefixed (`/en`, `/en/portfolio`). Because the target host is S3 (no server), the app switches from `adapter-auto` to `adapter-static` with prerendering on — Paraglide's middleware still runs, just at *build* time (once per discovered locale/route pair) instead of per-request, baking out static HTML per locale. The existing cookie-gated `(admin)`/`(client)` portal can't be prerendered (it depends on a per-request cookie check); those route groups are explicitly excluded from prerendering and fall back to the adapter's SPA shell, unchanged from their current (legacy, out-of-scope) behavior.

**Tech Stack:** `@inlang/paraglide-js` 2.x, `@sveltejs/adapter-static`, SvelteKit 2 hooks (`hooks.server.ts`, `hooks.ts`).

This is **Phase 2 of 4** implementing `frontend/DESIGN.md`. Depends on Phase 1 (tokens/testing infra) being merged. Phase 3 (Header/Footer) consumes `LangSwitch` from this phase.

## Global Constraints

- Base locale **French**, unprefixed. English prefixed at `/en`. Decided in `frontend/DESIGN.md` §8.
- Locale detection order: `url` → `cookie` → `preferredLanguage` → `baseLocale`. No hand-written redirect logic — the strategy chain handles it.
- All package installs and scripts run with **pnpm**.
- Do not modify the *behavior* of `(admin)`/`(client)`/`auth` routes — only add the minimal `prerender = false` needed so the static build doesn't fail on them. No redesign, no auth-flow changes.
- `$lib/paraglide/` is **generated code** (compiled by the Paraglide Vite plugin from `project.inlang/` + `messages/*.json`) — never hand-edit files under it, and it's gitignored.

---

### Task 1: Initialize the inlang project and base messages

**Files:**
- Create: `frontend/project.inlang/settings.json`
- Create: `frontend/messages/fr.json`
- Create: `frontend/messages/en.json`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: the message source files later tasks (and Phases 3–4) extend with real UI copy (nav labels, hero text, etc.) by adding keys to these same two JSON files.

- [ ] **Step 1: Install Paraglide**

```bash
cd frontend
pnpm add -D @inlang/paraglide-js@^2.23.0
cd ..
```

- [ ] **Step 2: Create `frontend/project.inlang/settings.json`**

```json
{
	"$schema": "https://inlang.com/schema/project-settings",
	"baseLocale": "fr",
	"locales": ["fr", "en"],
	"modules": [
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@4.4.0/dist/index.js",
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-m-function-matcher@2.2.6/dist/index.js"
	],
	"plugin.inlang.messageFormat": {
		"pathPattern": "./messages/{locale}.json"
	}
}
```

- [ ] **Step 3: Create `frontend/messages/fr.json`**

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"site_name": "Temps d'Arrêt Studio"
}
```

- [ ] **Step 4: Create `frontend/messages/en.json`**

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"site_name": "Temps d'Arrêt Studio"
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/project.inlang frontend/messages frontend/package.json pnpm-lock.yaml
git commit -m "feat(frontend): initialize the Paraglide inlang project (fr/en)"
```

---

### Task 2: Wire the Paraglide Vite plugin and generate output

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/.gitignore`

**Interfaces:**
- Consumes: `frontend/project.inlang/settings.json`, `frontend/messages/*.json` (Task 1).
- Produces: `frontend/src/lib/paraglide/{messages.js,runtime.js,server.js}` (generated) — `m.*` message functions, `getLocale()`, `setLocale()`, `locales`, `localizeHref()`, `deLocalizeUrl()`, `getTextDirection()`, `paraglideMiddleware()`. Everything from Task 3 onward imports from here.

- [ ] **Step 1: Add the plugin to `frontend/vite.config.ts`**

```diff
 import { sveltekit } from '@sveltejs/kit/vite';
 import { svelteTesting } from '@testing-library/svelte/vite';
+import { paraglideVitePlugin } from '@inlang/paraglide-js';
 import { defineConfig } from 'vitest/config';

 export default defineConfig({
-	plugins: [sveltekit(), svelteTesting()],
+	plugins: [
+		sveltekit(),
+		svelteTesting(),
+		paraglideVitePlugin({
+			project: './project.inlang',
+			outdir: './src/lib/paraglide',
+			emitTsDeclarations: true,
+			strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale']
+		})
+	],
 	test: {
 		environment: 'jsdom',
 		setupFiles: ['./vitest-setup-client.ts'],
 		include: ['src/**/*.{test,spec}.{js,ts}']
 	}
 });
```

- [ ] **Step 2: Gitignore the generated output**

Append to `frontend/.gitignore`:

```
# Paraglide (generated from project.inlang/ + messages/*.json)
/src/lib/paraglide
```

- [ ] **Step 3: Generate the output once**

Run: `cd frontend && pnpm dev`
Wait for the local URL to print, confirm `frontend/src/lib/paraglide/messages.js` now exists, then stop the server (Ctrl+C).

- [ ] **Step 4: Verify**

Run: `cd frontend && pnpm run check`
Expected: succeeds (the generated `.d.ts` files make `$lib/paraglide/*` imports resolve).

- [ ] **Step 5: Commit**

```bash
git add frontend/vite.config.ts frontend/.gitignore
git commit -m "feat(frontend): wire the Paraglide Vite plugin (fr unprefixed, en prefixed)"
```

---

### Task 3: `%lang%` / `%dir%` placeholders and the locale middleware

**Files:**
- Modify: `frontend/src/app.html`
- Create: `frontend/src/hooks.server.ts`
- Create: `frontend/src/hooks.ts`

**Interfaces:**
- Consumes: `$lib/paraglide/server` (`paraglideMiddleware`), `$lib/paraglide/runtime` (`getTextDirection`, `deLocalizeUrl`) — generated by Task 2.
- Produces: every request (and, at build time, every prerendered page) gets the correct `lang`/`dir` on `<html>`, and SvelteKit's router is told the canonical (delocalized) path for each localized URL.

- [ ] **Step 1: Update `frontend/src/app.html`**

```diff
-<html lang="en" data-theme="tempsdarret">
+<html lang="%lang%" dir="%dir%" data-theme="tempsdarret">
```

(`data-theme="tempsdarret"` stays — that's the legacy daisyUI theme, unrelated to locale.)

- [ ] **Step 2: Create `frontend/src/hooks.server.ts`**

```ts
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = paraglideHandle;
```

- [ ] **Step 3: Create `frontend/src/hooks.ts`**

```ts
import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute: Reroute = (request) => {
	return deLocalizeUrl(request.url).pathname;
};
```

(Must be `hooks.ts`, not `hooks.server.ts` — `reroute` is a universal hook.)

- [ ] **Step 4: Verify**

Run: `cd frontend && pnpm run check`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app.html frontend/src/hooks.server.ts frontend/src/hooks.ts
git commit -m "feat(frontend): add locale detection middleware and reroute hook"
```

---

### Task 4: Switch to `adapter-static` (S3-ready build) with the portal excluded from prerendering

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/svelte.config.js`
- Create: `frontend/src/routes/+layout.ts`
- Create: `frontend/src/routes/(admin)/+layout.ts`
- Modify: `frontend/src/routes/(client)/+layout.server.ts`
- Modify: `frontend/src/routes/auth/magic-link/[token]/+page.server.ts`

**Interfaces:**
- Produces: `pnpm --filter frontend run build` emits a static `frontend/build/` directory (plain HTML/CSS/JS, one file per prerendered route × locale) — ready to sync to an S3 bucket. This is the frontend-side prerequisite for S3 hosting; provisioning the actual bucket/CloudFront/DNS is separate infrastructure work, not part of this plan.

- [ ] **Step 1: Swap the adapter dependency**

```bash
cd frontend
pnpm remove @sveltejs/adapter-auto
pnpm add -D @sveltejs/adapter-static@^3.0.10
cd ..
```

- [ ] **Step 2: Update `frontend/svelte.config.js`**

```diff
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-static';
 import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

 /** @type {import('@sveltejs/kit').Config} */
 const config = {
 	preprocess: vitePreprocess(),

 	kit: {
-		adapter: adapter()
+		adapter: adapter({
+			pages: 'build',
+			assets: 'build',
+			fallback: 'index.html',
+			precompress: false,
+			strict: false
+		})
 	}
 };

 export default config;
```

(`fallback: 'index.html'` + `strict: false` lets routes that opt out of prerendering — the auth-gated portal — ship as a client-rendered SPA shell instead of failing the build. `(public)` pages are unaffected; they prerender normally.)

- [ ] **Step 3: Prerender by default — `frontend/src/routes/+layout.ts`**

```ts
export const prerender = true;
```

- [ ] **Step 4: Opt the admin portal out of prerendering — `frontend/src/routes/(admin)/+layout.ts`**

```ts
export const prerender = false;
```

- [ ] **Step 5: Opt the client portal out of prerendering**

In `frontend/src/routes/(client)/+layout.server.ts`, add one line without touching the existing logic:

```diff
 import { redirect } from '@sveltejs/kit';
 import type { LayoutServerLoad } from './$types';

+export const prerender = false;
+
 export const load: LayoutServerLoad = async ({ cookies }) => {
```

- [ ] **Step 6: Opt the magic-link token page out of prerendering**

In `frontend/src/routes/auth/magic-link/[token]/+page.server.ts`, add one line (this route has a dynamic `[token]` param, so it can't be enumerated at build time regardless):

```diff
 import { redirect } from '@sveltejs/kit';
 import type { PageServerLoad } from './$types';

+export const prerender = false;
+
 export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
```

- [ ] **Step 7: Verify the static build succeeds**

Run: `cd frontend && pnpm run build`
Expected: succeeds; `frontend/build/index.html` and `frontend/build/en/index.html` both exist (French unprefixed, English under `/en`).

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json pnpm-lock.yaml frontend/svelte.config.js frontend/src/routes/+layout.ts frontend/src/routes/\(admin\)/+layout.ts frontend/src/routes/\(client\)/+layout.server.ts frontend/src/routes/auth/magic-link/\[token\]/+page.server.ts
git commit -m "build(frontend): switch to adapter-static for S3 hosting"
```

---

### Task 5: `LangSwitch` component

**Files:**
- Create: `frontend/src/lib/components/brand/LangSwitch.svelte`
- Test: `frontend/src/lib/components/brand/LangSwitch.test.ts`

**Interfaces:**
- Consumes: `page` from `$app/state`, `resolve` from `$app/paths`, `locales`/`getLocale`/`localizeHref` from `$lib/paraglide/runtime` (Task 2).
- Produces: `LangSwitch` — no props. Consumed by Phase 3's `Header`. Its links carry `data-sveltekit-reload`, which is what lets SvelteKit's build-time crawler discover and prerender the `/en/...` variant of every page (satisfying Task 4's static build).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/components/brand/LangSwitch.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({
	page: { url: new URL('https://tempsdarret.studio/portfolio') }
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

vi.mock('$lib/paraglide/runtime', () => ({
	locales: ['fr', 'en'],
	getLocale: () => 'fr',
	localizeHref: (path: string, { locale }: { locale: string }) =>
		locale === 'fr' ? path : `/en${path}`
}));

import LangSwitch from './LangSwitch.svelte';

describe('LangSwitch', () => {
	it('renders a link per locale, uppercased', () => {
		render(LangSwitch);

		expect(screen.getByRole('link', { name: 'FR' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'EN' })).toBeInTheDocument();
	});

	it('marks the current locale active and links the other to its localized path', () => {
		render(LangSwitch);

		const fr = screen.getByRole('link', { name: 'FR' });
		const en = screen.getByRole('link', { name: 'EN' });

		expect(fr.className).toContain('td-lang-on');
		expect(en.className).not.toContain('td-lang-on');
		expect(en).toHaveAttribute('href', '/en/portfolio');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/LangSwitch.test.ts`
Expected: FAIL — `Failed to resolve import "./LangSwitch.svelte"`.

- [ ] **Step 3: Implement the component**

```svelte
<!-- frontend/src/lib/components/brand/LangSwitch.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { locales, localizeHref, getLocale } from '$lib/paraglide/runtime';
</script>

<div class="td-lang-switch" role="group" aria-label="Langue">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }))}
			data-sveltekit-reload
			class:td-lang-on={locale === getLocale()}
		>
			{locale.toUpperCase()}
		</a>
	{/each}
</div>

<style>
	.td-lang-switch {
		display: flex;
		gap: 0.55rem;
		font-size: 0.66rem;
		letter-spacing: 0.12em;
		font-weight: 600;
	}

	.td-lang-switch a {
		opacity: 0.45;
		text-decoration: none;
		color: inherit;
	}

	.td-lang-switch a.td-lang-on {
		opacity: 1;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/lib/components/brand/LangSwitch.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/brand/LangSwitch.svelte frontend/src/lib/components/brand/LangSwitch.test.ts
git commit -m "feat(frontend): add the LangSwitch component"
```

---

## Self-Review Notes

- **Spec coverage:** §8 (i18n: URL-based, French unprefixed/English prefixed, strategy-driven detection, `lang`/`dir`, LangSwitch) → Tasks 1, 2, 3, 5. Static/S3 hosting (from the user's stated deployment direction, not in the original `DESIGN.md` — added here since it directly determines the i18n *mechanism*, not just a later infra concern) → Task 4.
- **Placeholder scan:** none — every step has complete, real code or an exact command.
- **Type consistency:** `LangSwitch`'s consumed `locales`/`getLocale`/`localizeHref` signatures match Paraglide's real runtime API (verified against the current `@inlang/paraglide-js` 2.23.0 SvelteKit docs, not assumed). The mocked module shape in `LangSwitch.test.ts` matches exactly what the component imports.
- **Known gap, explicitly out of scope:** the `(admin)`/`(client)` portal's cookie-based auth check doesn't function identically under a pure static/SPA-fallback deployment (no server to validate the cookie at request time) — Task 4 only makes the *build* succeed; making the portal's auth flow fully correct on S3-only hosting (e.g., client-side-only gating, or later adding CloudFront + a small compute layer) is future work, tracked separately from this design-system plan.
