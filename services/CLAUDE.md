# Services — Agent Guide

Backend microservices for Temps D'arrêt. Read this before touching anything under `services/`.

## Canonical reference

**`services/shoot-service/` is the reference implementation.** When implementing or modifying any other service, mirror its structure and patterns. If shoot-service does something a certain way, default to that pattern unless an ADR says otherwise.

## Standard service structure (ADR-025)

```
services/<name>-service/
├── package.json                # Scripts: dev, build, start, test, test:unit,
│                               #          test:component, test:integration, test:contract,
│                               #          lint, check
├── tsconfig.json
├── vitest.config.ts
├── <name>-service.md           # Functional spec (capabilities, schema, events, endpoints)
├── src/
│   ├── index.ts                # Fastify server bootstrap
│   ├── main.ts                 # Entry / DI wiring
│   ├── config/                 # Env config, constants
│   ├── handlers/               # HTTP layer: <domain>.routes.ts + <domain>.handlers.ts
│   ├── services/               # Business logic (one file per use case)
│   ├── persistence/            # Mongoose repositories: <domain>.repository.ts
│   ├── events/                 # Kafka publishers/ + consumers/
│   └── shared/                 # Service-local helpers (not cross-service)
└── tests/
    ├── unit/                   # Pure logic, no I/O
    ├── component/              # Service in-process, mocked deps
    ├── integration/            # Real Mongo + Kafka via testcontainers
    └── contract/               # Schema/AsyncAPI contract tests
```

Cross-service code lives in `packages/` (workspace deps like `@tempsdarret/shared`, `@tempsdarret/events`). Never duplicate it inside a service.

## Stack constraints (do not violate without an ADR update)

- **Fastify** for HTTP (ADR-007)
- **MongoDB + Mongoose** for persistence (ADR-004)
- **Kafka** for async events; **AsyncAPI** schemas (ADR-009, ADR-023)
- **TypeSpec** API-first — generate types from spec, don't hand-write request/response types (ADR-002, ADR-024)
- **TypeScript strict**, Node >=24 (ADR-012)
- **Vitest + testcontainers** for integration tests (ADR-014)
- **JWT magic-link auth** (15min expiry) (ADR-003)
- **RBAC** via shared package (ADR-020)

## Workflow expectations

- **TDD.** Write the failing test first. Unit for pure logic, component for service-level, integration for cross-system flows.
- **Conventional commits** (ADR-016). Scope by service: `feat(shoot-service): ...`, `fix(invite-service): ...`.
- **No `--no-verify`** on commits or pushes. Fix the hook failure.
- **One logical commit per layer** when implementing: contracts → repo → service → handlers → events → tests → docs.

## Common commands (from repo root)

```bash
pnpm --filter @tempsdarret/<name>-service dev
pnpm --filter @tempsdarret/<name>-service test
pnpm --filter @tempsdarret/<name>-service check    # tsc --noEmit
pnpm --filter @tempsdarret/<name>-service lint
```

## Current state (verify before assuming)

- `shoot-service` — most complete, reference
- `user-service`, `invite-service` — implemented
- `portfolio-service`, `file-service` — partial
- `notification-service` — build skipped, awaiting Payload CMS decision

## Functional spec convention

Each service has a `<service-name>.md` (e.g. `shoot-service.md`) that documents capabilities, schema, endpoints, and Kafka topics. Update it when behaviour changes — it's the contract reviewers and downstream services depend on.
