# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Temps D'arrêt Studio photography platform.

## What are ADRs?

Architecture Decision Records (ADRs) capture important architectural decisions made during the development of this platform. They document the context, decision, alternatives considered, and consequences of each choice.

## ADR Format

All ADRs follow the template defined in [template.md](./template.md) and are numbered sequentially starting from ADR-001.

## Decision Log

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./adr-001-microservices-architecture.md) | Microservices Architecture with Domain-Driven Design | Accepted | 2025-08-09 |
| [ADR-002](./adr-002-typespec-api-first.md) | TypeSpec for API-First Development | Accepted | 2025-08-09 |
| [ADR-003](./adr-003-magic-link-auth.md) | Magic Link Authentication (Passwordless) | Accepted | 2025-08-09 |
| [ADR-004](./adr-004-mongodb-data-persistence.md) | MongoDB with Mongoose for Data Persistence | Accepted | 2025-08-09 |
| [ADR-005](./adr-005-filesystem-photo-storage.md) | File System Storage for Photography Files | Accepted | 2025-08-09 |
| [ADR-006](./adr-006-sveltekit-frontend.md) | SvelteKit for Photography Portfolio Frontend | Accepted | 2025-08-09 |
| [ADR-007](./adr-007-fastify-backend.md) | Fastify over Express for Backend Services | Accepted | 2025-08-09 |
| [ADR-008](./adr-008-monorepo-structure.md) | Monorepo with npm Workspaces | Accepted | 2025-08-09 |
| [ADR-009](./adr-009-kafka-event-driven.md) | Kafka for Event-Driven Microservices Communication | Accepted | 2025-08-09 |
| [ADR-010](./adr-010-jwt-security.md) | JWT Tokens with Short Expiry for Stateless Authentication | Accepted | 2025-08-09 |
| [ADR-011](./adr-011-nodejs24-runtime.md) | Node.js 24+ Runtime Choice | Accepted | 2025-08-09 |
| [ADR-012](./adr-012-typescript-language.md) | TypeScript as Primary Language | Accepted | 2025-08-09 |
| [ADR-013](./adr-013-api-gateway-pattern.md) | API Gateway Pattern with BFF | Accepted | 2025-08-09 |
| [ADR-014](./adr-014-testing-strategy.md) | Vitest for Frontend Testing, Jest for Backend Services | Accepted | 2025-08-09 |
| [ADR-015](./adr-015-code-quality-rules.md) | Strict ESLint Configuration with Code Quality Rules | Accepted | 2025-08-09 |
| [ADR-016](./adr-016-conventional-commits.md) | Conventional Commits with Photography Domain Scopes | Accepted | 2025-08-09 |
| [ADR-017](./adr-017-progressive-deployment.md) | Progressive Deployment Strategy (V1 → V2 → V3) | Accepted | 2025-08-09 |
| [ADR-018](./adr-018-docker-containerization.md) | Docker Containerization for All Services | Accepted | 2025-08-09 |
| [ADR-019](./adr-019-event-sourcing-audit.md) | Event Sourcing for Business Audit Trail | Accepted | 2025-08-09 |
| [ADR-020](./adr-020-rbac-permissions.md) | Role-Based Access Control with Shoot-Level Permissions | Accepted | 2025-08-09 |
| [ADR-021](./adr-021-tailwindcss-styling.md) | TailwindCSS + DaisyUI for Styling | Accepted | 2025-08-09 |
| [ADR-022](./adr-022-git-hooks-quality.md) | Husky Git Hooks for Quality Gates | Accepted | 2025-08-09 |
| [ADR-023](./adr-023-asyncapi-event-schemas.md) | AsyncAPI for Event Schema Definition | Accepted | 2025-08-09 |
| [ADR-024](./adr-024-schema-first-development.md) | Schema-First Development with Auto-Generation | Accepted | 2025-08-09 |
| [ADR-025](./adr-025-microservice-functional-directory-structure.md) | Microservice Functional Directory Structure | Accepted | 2025-08-09 |
| [ADR-026](./adr-026-download-progress-indicators.md) | Download Progress Indicators | Accepted | 2025-08-17 |
| [ADR-027](./adr-027-file-storage-strategy.md) | File Storage Strategy | Accepted | 2025-08-17 |

## How to Create a New ADR

1. Copy the template: `cp template.md adr-XXX-title.md`
2. Replace XXX with the next sequential number
3. Fill in all sections of the template
4. Add the new ADR to the decision log table above
5. Commit the changes

## ADR Lifecycle

- **Proposed**: The ADR is under discussion
- **Accepted**: The decision has been made and is being implemented
- **Deprecated**: The decision is no longer recommended but may still be in use
- **Superseded**: The decision has been replaced by a newer ADR (link to the replacement)