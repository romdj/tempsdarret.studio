# Frontend — Agent Guide

SvelteKit + TypeScript app for the Temps D'arrêt portfolio and client portal.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes mode where applicable)
- **TypeScript strict**
- **TailwindCSS** + **DaisyUI 4** (ADR-021)
- **Vitest** + **@testing-library/svelte** for component tests
- Node >=24

## Route groups

```
src/routes/
├── (public)/          # Homepage, portfolio, about, contact, professional-services
├── (client)/          # Authenticated client galleries (+layout.server.ts gates access)
├── (admin)/           # Admin dashboard, messages
└── auth/              # Magic link landing + verification
```

## Brand / theme

Custom DaisyUI theme — do not introduce ad-hoc hex values, use the theme tokens.

- Coral: `#EE6640`
- Gold: `#F7B563`
- Cream: `#F7F5F2`

## Current state (as of Jan 2026 — verify)

- All pages are **placeholders**. None are wired to backend services yet.
- Magic-link auth route exists but is not connected to invite-service end-to-end.
- API gateway is Kong (running locally via `docker-compose.yml`).

## Where things go

- `src/lib/components/` — reusable UI (PascalCase `.svelte`)
- `src/lib/services/` — API client wrappers (one file per backend service)
- `src/lib/stores/` — Svelte stores (auth, session, etc.)
- `src/lib/types/` — shared TS types (prefer generating from TypeSpec when available)
- `src/lib/utils/` — pure helpers

## API wiring conventions

When connecting a page to a backend service:

1. Add/extend a client in `src/lib/services/<service>.client.ts`. It calls the Kong gateway URL from env, not the service directly.
2. Use SvelteKit `load` functions (`+page.server.ts` or `+page.ts`) for data fetching — never fetch in components.
3. Auth-gated routes belong under `(client)/` or `(admin)/`; `+layout.server.ts` enforces JWT validity.
4. Surface loading/error states with DaisyUI components — no raw HTML alerts.

## Commands (from repo root)

```bash
pnpm --filter @tempsdarret/frontend dev      # Vite dev server
pnpm --filter @tempsdarret/frontend check    # svelte-check + tsc
pnpm --filter @tempsdarret/frontend test
pnpm --filter @tempsdarret/frontend lint
```

## Workflow expectations

- **TDD for components** — write the test in `src/**/*.test.ts` first, then the component.
- **Conventional commits**, scope `frontend`: `feat(frontend): wire portfolio page to shoot-service`.
- **Never** hand-edit generated TypeSpec types.
- For UI changes, run `pnpm --filter @tempsdarret/frontend dev` and verify in browser before claiming done.
