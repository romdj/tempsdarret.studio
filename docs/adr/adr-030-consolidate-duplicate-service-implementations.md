# ADR-030: Consolidate Duplicate Service Implementations to Canonical `src/services`

## Status

Accepted

## Date

2026-07-13

## Context

While resuming work on the shoot-creation → invitation event flow (Functional
Scenario 1), we discovered that `user-service` and `invite-service` had each
accumulated **two divergent implementations** of their core service class:

| Service | `src/services/` (wired in `main.ts`) | `src/features/…/services/` |
|---|---|---|
| shoot-service (reference) | canonical, only implementation | — none |
| user-service | wired, thinner | not wired, holds the unit tests |
| invite-service | wired, thinner (3 deps) | not wired, richer (extra handlers) |

Only the `src/services/` implementation is mounted by each service's `main.ts`.
The `src/features/` variant is **never wired into a running process**, yet it is
where the unit tests point. This caused three concrete problems:

1. **Tests validated dead code.** The unit tests exercised the unwired
   `src/features/` classes, so the code that actually runs had little or no
   coverage.
2. **Behavioural divergence.** The two copies drifted apart (e.g. the
   `src/features/` invite variant used stale `invite.*` event names and a
   `15-minute` magic-link expiry; it also injected an `emailService` and sent
   email directly).
3. **Ambiguity for contributors** about which file is authoritative.

Crucially, the `src/features/` layout **contradicts [ADR-025]**, which adopted a
functional directory structure organized by role (`handlers/`, `services/`,
`persistence/`, `events/`, `shared/`) and explicitly rejected feature-based
directories as "not beneficial within already-focused microservices". The
reference implementation (shoot-service) has only `src/services/`.

## Decision

**`src/services/` is the single canonical service implementation for every
microservice, per [ADR-025]. The `src/features/` variants are removed.**

Concretely:

1. Treat the wired `src/services/<noun>.service.ts` as authoritative for
   `user-service` and `invite-service`.
2. Port only the **correct** missing logic from the `src/features/` variants
   into `src/services/` before deletion — specifically
   `handleUserVerifiedEvent` (existing-client path) and invitation
   invalidation. Do **not** port behaviour that contradicts the architecture.
3. **Reject** the `src/features/` invite variant's direct email sending. Per
   Functional Scenario 1, the **notification-service** sends email in reaction
   to `invitation.created`; the invite-service must not send email itself.
4. Delete the `src/features/` directories once their useful logic and tests are
   migrated.
5. Place tests under `tests/` mirroring the source layout
   (`tests/services/<noun>.service.test.ts`), as prescribed by [ADR-025].

## Rationale

- **Single source of truth.** One implementation per service removes the
  "which file runs?" ambiguity and guarantees the tested code is the shipped
  code.
- **ADR-025 compliance.** This enforces an already-accepted decision rather than
  introducing a new structural philosophy.
- **Consistency with the reference.** shoot-service already follows this layout;
  aligning the others makes the codebase uniform and lowers onboarding cost.
- **Architecture integrity.** Dropping invite-service's direct email path keeps
  the system purely event-driven (no hidden coupling between invite and email).

## Consequences

### Positive
- The code that runs is the code that is tested.
- Uniform structure across all microservices; easier navigation and review.
- Removes stale event names / expiry values carried by the dead variants.

### Negative
- One-time migration cost: porting the missing handlers and relocating tests.
- Any in-flight branches touching `src/features/` must rebase onto `src/services/`.

### Neutral
- No change to public APIs or event contracts results directly from this ADR;
  it is an internal structural consolidation.

## Related Decisions

Recorded during the same session (candidates for their own ADRs if they grow):

- **Event topic ownership:** the invitation service owns the `invitations`
  topic; canonical event names use the `invitation.*` prefix (per the shared
  `@tempsdarret/events` package). The `invite.*` names were stale.
- **Invitation magic-link expiry:** 48 hours (Scenario 1 + ADR-003), not the
  15 minutes used by the removed variant. 15 minutes remains correct for auth
  JWTs only.
- **Event-chain enrichment:** `user-service` (which owns user data) resolves
  photographer + client details and forwards shoot context so downstream
  services compose the invitation without direct service-to-service calls.

## Compliance

Enforced through code review, microservice templates, and by the removal of the
`src/features/` directories in this change set. Supersedes the drifted structure
in `user-service` and `invite-service`; reaffirms [ADR-025].

[ADR-025]: ./adr-025-microservice-functional-directory-structure.md
