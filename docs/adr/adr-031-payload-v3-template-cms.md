# ADR-031: Payload v3 (Local API only) for Notification Template Storage

## Status

Accepted

Date: 2026-09-04

## Context

`notification-service` stores its email/SMS/Slack/WhatsApp/push templates in Payload CMS v2.32.3, used purely via its `local: true` Local API — no admin server is mounted (`src/payload/server.ts` was written but never wired into the running service), so the CMS's actual admin UI, access control, and drafts/versioning features have never been exercised in production.

A `pnpm audit` pass (2026-09-02, `docs/superpowers` CI hardening work) found the monorepo carrying 209 unique dependency advisories. Bulk semver-range updates and dependency-graph overrides brought that down to 27, but two critical and several high-severity findings remained stuck: `payload@2.32.3` itself (pre-auth account takeover in password recovery, authenticated SSRF, SQL injection in its Postgres adapter query builder) and its own pinned sub-dependencies — `mongoose@6.13.8` (via `@payloadcms/db-mongodb@1.7.5`), `sharp@0.32.6`, `nodemailer@6.9.15`, and `i18next-http-middleware` (critical: prototype pollution). None of these are fixable by bumping within v2's dependency ranges; Payload v2's own dependencies are the vulnerable versions.

Payload v2's default install also pulls in a webpack-based admin bundler (`@payloadcms/bundler-webpack`) and a Slate rich-text editor (`@payloadcms/richtext-slate`) neither of which this service uses — the "notes"/"html" fields in the current collections are read and written as plain strings (see `payload-schemas.ts`'s `templates.html: z.string()`), not Slate's AST structure.

## Decision

Migrate `notification-service` from Payload v2 to **Payload v3, Local API only** — `payload` core + `@payloadcms/db-mongodb` (v3), no `@payloadcms/next` (admin UI), no rich-text editor package. Verified against the published npm metadata for `payload@3.88.0` before deciding: core `dependencies` include no `react`, `next`, or webpack (only `@next/env`, a small `.env`-loading utility) — the v3 core is properly decoupled from its optional Next.js-hosted admin panel, and `@payloadcms/db-mongodb@3.88.0` depends on `mongoose@8.24.1`, aligned with the rest of the monorepo.

The three existing collections (`notification-templates`, `template-variables`, `notification-channels`) carry over to v3 config with equivalent fields. The `users` collection (Payload's own admin-login auth, unrelated to the platform's real `user-service`) is dropped along with it, since there is no admin UI installed to log in to. `TemplateService.ts`'s Handlebars/juice rendering logic does not touch Payload at all and is unaffected.

A full architecture tradeoff analysis (ATAM-style: drivers, quality attribute scenarios, comparison matrix, sensitivity/tradeoff points, risk register) was produced before this decision and is preserved as a Claude Artifact; see References.

## Alternatives Considered

- **ApostropheCMS 4** (MIT, MongoDB-native): the only other Mongo-native candidate evaluated. Rejected because it's architected as a full page-building CMS that mounts its own Express app and expects to own routing — not a library called from inside a Fastify request handler, which is what this service needs.
- **Strapi 5** (MIT community edition): largest community of the alternatives (756K downloads/month vs. Payload's 2.69M), but MongoDB support was explicitly dropped by Strapi's own team starting in v4 (under 0.4% of projects used it) with no plans to reintroduce it. Adopting it means standing up a second database technology (Postgres/MySQL/SQLite) in a Mongo-only stack for three collections.
- **KeystoneJS 8**: SQL-only via Prisma, same new-infra cost as Strapi. Smallest community of the five candidates evaluated (38K downloads/month) and had just absorbed a major Prisma-version bump (Prisma 7, July 2026) at time of evaluation — compounded early-adopter and maintenance risk on top of the infra cost.
- **Directus 12**: SQL-only, wraps an existing relational schema rather than defining collections in code. Licensed under the Business Source License (BSL 1.1) — self-hosting is free until revenue crosses a stated threshold, at which point a commercial agreement is required. Ruled out on license grounds regardless of technical fit.
- **Drop the CMS entirely, use a plain Mongoose repository**: initially proposed (matches every other service in this monorepo, which use `src/persistence/*.repository.ts` over Mongoose directly). Rejected per explicit product direction — a CMS is wanted here, not just a typed data layer, for the future option of non-technical template editing without a code deploy.

## Consequences

### Positive

- Clears both remaining `pnpm audit --audit-level=high` critical findings and most of the remaining highs in one migration (payload itself, its pinned old mongoose/sharp/nodemailer, and `i18next-http-middleware`).
- Modern, MIT-licensed, actively maintained dependency (2.69M downloads/month — largest community of any candidate evaluated, including the SQL-first alternatives).
- Admin UI remains a genuine future option — `@payloadcms/next` is an additive install, not baggage carried from day one the way v2's webpack bundler was.
- Smallest realistic migration distance: same vendor, same collection/field mental model, existing template-rendering logic untouched.

### Negative

- Real migration work, not a version-range bump: collection configs, the CMS client wrapper, the zod boundary schemas, and the seed script all need rewriting against v3's API surface.
- Payload v3's Local API is documented primarily around its own `payload run` script runner and `@payload-config` alias, both built for standalone scripts rather than embedding inside a long-running Fastify service — the embedding pattern here (lazy `getPayload()` call inside `PayloadClient`, mirroring the existing v2 lazy-init design) is a reasonable extrapolation from documented behavior, not a directly-documented one, since Payload's docs don't specifically address this shape.

### Neutral

- No admin UI is installed in this pass — if/when non-technical template editing becomes an actual near-term need, adding `@payloadcms/next` and wiring it into a Next.js-hosted admin route is a separate, later, deliberate decision.

## Implementation Notes

1. Replace `payload@2.32.3`, `@payloadcms/bundler-webpack`, `@payloadcms/db-mongodb@1.7.5`, `@payloadcms/richtext-slate` with `payload@^3.88.0` + `@payloadcms/db-mongodb@^3.88.0` in `services/notification-service/package.json`.
2. Rewrite `src/payload/payload.config.ts`: `buildConfig`/`CollectionConfig` now import from `'payload'` directly (not `'payload/config'` / `'payload/types'`); drop the `admin`/`editor` blocks and the `Users` collection entirely (no admin UI installed).
3. Simplify the `html`/`notes` fields in `NotificationTemplates`/`TemplateVariables` from `richText` to plain `textarea` — already treated as plain strings by `payload-schemas.ts` and `TemplateService.ts`, and this removes any need for a rich-text editor package.
4. Rewrite `PayloadClient.ts`'s lazy init to call `getPayload({ config })` (v3) instead of `payload.init()` (v2); `find`/`create`/`update` call sites are unchanged.
5. Delete `src/payload/server.ts` (the never-wired admin Express server) and the `Users` collection.
6. Re-seed via a standalone script using the same `getPayload({ config })` pattern, replacing `seed-templates.ts`'s v2 calls.
7. Update `services/common/tests/mocks/payload.mock.ts` (or equivalent) and re-run `TemplateService.test.ts` against the new client shape.
8. Confirm with `pnpm audit --audit-level=high` that the payload-rooted critical/high cluster clears.

## Related Decisions

- [ADR-004: MongoDB with Mongoose for Data Persistence](./adr-004-mongodb-data-persistence.md)
- [ADR-007: Fastify over Express for Backend Services](./adr-007-fastify-backend.md)
- [ADR-025: Microservice Functional Directory Structure](./adr-025-microservice-functional-directory-structure.md)

## References

- ATAM analysis (drivers, quality attribute scenarios, comparison matrix, sensitivity/tradeoff points, risk register): Claude Artifact, "Template CMS Tradeoffs" — https://claude.ai/code/artifact/d424c7c4-d9ac-4109-8406-cb2b27f56fad
- [Payload Local API — Outside Next.js](https://payloadcms.com/docs/local-api/outside-nextjs)
- `pnpm audit` baseline and remediation: CI hardening session, 2026-09-01 through 2026-09-04 (see `.github/workflows/ci.yml` `code-quality-sonar`/`security-audit` job comments and commits `6f579f1`, `d84154e`, `5bd492c`, `6f63ab0`)
