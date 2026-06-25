# ADR-030: Payload CMS v3 for Web Content and Email Templates

## Status
Proposed

Date: 2026-06-25

## Context

Two editorial needs converge on a single tool:

1. **Public website content** — portfolio captions, service descriptions, about-page copy, and other long-form text currently hardcoded in SvelteKit components. The photographer (and any future collaborator) needs to edit copy and swap imagery without a developer-driven deploy.
2. **Email and message templating** — transactional emails (client invite, magic link, gallery-ready, download link) currently planned for the `notification-service`. These templates need editorial control, localization (FR/EN), and versioning, separate from the consumer code that sends them.

Today, `notification-service` ships Payload CMS v2 (`payload@^2.24`, `@payloadcms/bundler-webpack`, `@payloadcms/db-mongodb@^1.5`, `@payloadcms/richtext-slate`) but its build and typecheck scripts are disabled (`echo 'Build temporarily disabled - Payload CMS v2 types need migration'`). The service does not compile in CI. Payload v2 is upstream-unmaintained; the right migration target is Payload v3.

Payload v3 is rebuilt around Next.js: the admin UI and REST/GraphQL API are installed into a Next.js `/app` directory via `@payloadcms/next`. There is no standalone admin server in v3. However, Payload v3 exposes a Local API (`getPayload({ config })`) that can be used from any Node.js process by importing the shared config, which lets non-Next.js services consume CMS data programmatically without going through HTTP.

This means a Payload v3 adoption introduces a new runtime (Next.js) and a new long-lived process (the admin host) into the architecture. It also resolves both editorial needs with a single tool, with type-safe consumption from both SvelteKit (REST API) and `notification-service` (Local API).

## Decision

Adopt **Payload CMS v3** as the single headless CMS for both public website content and email/message templates.

- Run the CMS as a dedicated process under `services/cms/`, hosted by Next.js 15+ as required by `@payloadcms/next`. This is the only Next.js process in the system; all other services remain Fastify (ADR-007).
- Share the existing MongoDB cluster (ADR-004) but isolate CMS data to dedicated collections — Payload owns its own collection namespace; no service writes to or reads from CMS collections directly except via the Local API or the REST API.
- Publish a shared workspace package `packages/cms-config/` that exports the Payload config (collections, globals, access control, localization, hooks). Both `services/cms/` (admin host) and `services/notification-service/` (Local API consumer) import from it; SvelteKit imports type definitions only.
- **SvelteKit consumes content via REST** through Kong (`/cms/api/*`) using `@payloadcms/sdk` or plain `fetch`, with `?locale=` and `?draft=` query parameters as needed.
- **`notification-service` consumes templates via the Local API** (`getPayload({ config })`), renders with Handlebars, inlines CSS with Juice, and sends via Resend (unchanged transport layer).
- **Templates** are stored as a `code` field containing Handlebars syntax; rendering happens in the consumer, not in the CMS. The CMS holds the source-of-truth string and metadata (variables, sample data, locale variants).
- **Localization** — locales `fr` (default) and `en`, field-level `localized: true`, fallback to `fr`.
- **Drafts + versioning** are enabled on all editorial collections. Public REST reads enforce `_status: 'published'` via access control; authenticated admin reads see drafts.
- **Admin auth** is separate from the magic-link RBAC system (ADR-003, ADR-020). CMS admin users live in a Payload `Users` collection and authenticate via Payload's built-in auth. This is acceptable because CMS admin is a developer/photographer surface, not a client surface.

## Alternatives Considered

- **Stay on Payload v2** — Rejected. Upstream is unmaintained; the current build blocker is a symptom of the dead-end, not a fix-once issue.
- **Handlebars-only, no CMS** — Rejected. Solves the email-template editing problem but leaves website content stuck in code. Would require a second editorial tool later, splitting the editor's workflow.
- **Hosted CMS (Sanity, Builder.io, Hygraph)** — Rejected. Recurring cost scales with content volume; vendor lock-in on a long-lived editorial dataset; less control over data residency for FR/QC clients with GDPR concerns; cannot run on the planned on-prem k3s setup (ADR-028).
- **Two CMSes (one for site, one for email)** — Rejected. Operational duplication, inconsistent editor UX, doubled admin auth surface.
- **Strapi** — Rejected. Comparable scope to Payload but the existing code investment (collection definitions, seed scripts, mocks) is in Payload, and v3 has the better TypeScript and Local-API story.
- **Headless Markdown + Git CMS (Decap, TinaCMS)** — Rejected. Suitable for site content but weak for transactional email templating, localization workflows, and draft/publish semantics at the scale we expect.

## Consequences

### Positive
- One editorial surface for both web content and email templates; one auth story for editors
- Type-safe consumption from SvelteKit (`@payloadcms/sdk`) and from `notification-service` (generated types from `payload generate:types`)
- Built-in drafts, versioning, localization, media management — features we would otherwise build
- Unblocks the `notification-service` build and CI (current `echo` no-op replaced with real `tsc`)
- Removes hardcoded content from SvelteKit pages; copy changes no longer require a deploy
- Future-portable database layer (Payload supports Postgres adapter if Mongo becomes wrong)

### Negative
- Introduces **Next.js** as a host runtime for one process. This is a documented deviation from ADR-007 (Fastify) — confined to the admin host, not extended to any service backend
- Adds a new long-lived container (`cms`) to docker-compose, new Kong routes, new admin auth/TLS/backup story
- Estimated 4–5 days of focused work to migrate v2 → v3 and wire both consumers
- Two collection namespaces in one Mongo (CMS + service data) — requires operational discipline to keep them separate; document a naming convention
- SvelteKit pages currently serving hardcoded content need refactoring; risk of empty/missing copy during transition — mitigated with hardcoded fallbacks
- Payload v3 + Next.js 15 represents one more framework version to track for security patches
- CMS admin auth is a second user table (separate from the platform's magic-link users) — accepted because admin users are a small, dev-managed cohort

### Neutral
- Bundler choice for the admin (Vite via Next.js) differs from the rest of the monorepo; isolated to the admin process and does not affect service builds
- BullMQ + Redis queue stays out of MVP scope; revisit when scheduled/delayed sends are needed

## Implementation Notes

Implementation is sequenced as separate logical commits (see ADR-016 conventional commits, ADR-022 hooks):

1. **`packages/cms-config/`** — shared Payload v3 config: collections, globals, access control, localization, hooks. Exports `config` for both consumers.
2. **`services/cms/`** — Next.js 15 app hosting Payload admin and REST API. Uses `@payloadcms/next`, `@payloadcms/db-mongodb@^3`, `@payloadcms/richtext-lexical`, imports config from `packages/cms-config`. Runs on port 3001.
3. **Collections**:
   - `EmailTemplates` — `key`, `subject` (localized), `body` (code field, Handlebars, localized), `variables` (JSON sample), `description`
   - `PortfolioCaptions` — `slug`, `title` (localized), `description` (rich text, localized), `shootRef`
   - `Pages` — `slug`, `sections[]` (block-based, localized) for about, services subpages, contact
   - `Media` — Payload Media collection for uploaded assets
   - `AdminUsers` — Payload auth collection for CMS editors
4. **Migrate v2 seed templates** — port content from `services/notification-service/src/payload/seed-templates.ts` into Payload v3 migrations. Drop v2 PayloadClient and slate config.
5. **Refactor `notification-service`**:
   - Remove `@payloadcms/bundler-webpack`, `@payloadcms/db-mongodb@^1`, `@payloadcms/richtext-slate`, `payload@^2`
   - Add `payload@^3`, `@payloadcms/db-mongodb@^3`, `@tempsdarret/cms-config` (workspace)
   - Replace `src/payload/PayloadClient.ts` with `getPayload({ config })` calls
   - Restore `build` and `check` scripts to real `tsc --noEmit` / `tsc -p tsconfig.json`
   - Keep Handlebars + Juice + Resend transport unchanged
6. **Kong routing** — `/cms/admin/*` → `cms:3001` (authenticated via Payload session cookie), `/cms/api/*` → `cms:3001` (public read with `_status=published` access control enforcement at the collection level).
7. **Docker** — new `cms` service in `docker-compose.yml` with healthcheck, shared Mongo, environment-driven config. Notification-service stays single-process.
8. **SvelteKit** — `src/lib/cms.ts` thin client (`@payloadcms/sdk` or `fetch`). Refactor portfolio captions, about copy, and services descriptions to consume CMS content; keep hardcoded fallbacks for the first release to absorb empty-CMS risk.
9. **Tests** — notification-service component tests mock Local API; CMS gets a small access-control test suite and a REST contract test for published-vs-draft enforcement.
10. **CI** — re-enable notification-service `build`/`check` in workflow; add `cms` build step.

A separate implementation plan (see commit history) sequences the work commit-by-commit.

## Related Decisions
- [ADR-006: SvelteKit Frontend](./adr-006-sveltekit-frontend.md) — primary consumer of CMS REST API
- [ADR-007: Fastify Backend](./adr-007-fastify-backend.md) — explicit carve-out: Payload admin runs on Next.js, not Fastify
- [ADR-004: MongoDB with Mongoose](./adr-004-mongodb-data-persistence.md) — shared cluster, isolated CMS collection namespace
- [ADR-018: Docker Containerization](./adr-018-docker-containerization.md) — new `cms` container
- [ADR-020: RBAC](./adr-020-rbac-permissions.md) — CMS admin auth is separate from platform magic-link RBAC
- [ADR-024: Schema-First Development](./adr-024-schema-first-development.md) — Payload collection definitions ARE the schema for CMS-managed content
- ADR-029: Kong API Gateway — Kong routes the new `/cms/*` paths

## References
- Payload v3 installation: https://payloadcms.com/docs/getting-started/installation
- Payload Local API: https://payloadcms.com/docs/local-api/overview
- Payload REST API: https://payloadcms.com/docs/rest-api/overview
- Payload localization: https://payloadcms.com/docs/configuration/localization
- Payload drafts and versions: https://payloadcms.com/docs/versions/drafts
- Payload rich text (Lexical): https://payloadcms.com/docs/fields/rich-text
