# Backlog

The prioritized list of stories to implement. Complementary to the roadmap
(`ROADMAP.md` / the `*_roadmap.md` planning docs): the roadmap sets direction and
phases; this backlog is the actionable, groomed story list.

**Ownership:** the **product owner** owns and grooms this file (and the roadmap).
The **QA auditor** may append findings to the *QA Findings* section below; the
product owner then triages them into prioritized stories.

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `SKIPPED`
Priority: `P1` (do now) · `P2` (soon) · `P3` (later)

---

## QA Findings — E2E test suite audit (2026-07)

Source: QA auditor review of the scenario-1 E2E suite and harness
(`services/common/tests/`). These block deterministic, unattended E2E runs and
must be addressed before/while adding E2E to CI.

| ID | Pri | Status | Story |
|----|-----|--------|-------|
| QA-1 | P1 | TODO | Notification health gate blocks E2E setup |
| QA-2 | P1 | TODO | Wire test isolation / cleanup |
| QA-3 | P1 | TODO | Missing `docker-compose.test.yml` |
| QA-4 | P1 | TODO | Quarantine stale sibling E2E files (02/03) |
| QA-5 | P2 | TODO | Deterministic Kafka topic/consumer-group lifecycle |
| QA-6 | P2 | TODO | Replace vacuous "no direct calls" assertion |
| QA-7 | P3 | TODO | Remove/back the unused email inbox stub |
| QA-8 | P3 | TODO | Enable the two skipped scenario-1 cases (needs features) |

### QA-1 · P1 · Notification health gate blocks E2E setup
`e2e-setup.ts:167` polls `${notificationService}/health`, but notification-service
runs no HTTP server, so `waitForServices()` exhausts its retries and setup throws
before any test runs.
**Acceptance criteria**
- Given the stack is up, When the E2E setup runs, Then it no longer waits on a
  non-existent notification HTTP health endpoint.
- Notification liveness is verified another way (a real health endpoint, or
  consumer-group membership) OR notification is removed from the HTTP health list.
- The scenario-1 E2E reaches its first assertion without a setup timeout.

### QA-2 · P1 · Wire test isolation / cleanup
`cleanDatabase()` exists (`e2e-setup.ts:246`) but is only a commented-out line in
`test-helpers.ts:347`; `beforeEach` clears only the in-memory event collector.
Mongo state (users/shoots/invitations/magic-links) leaks across tests and runs,
making order-dependent tests (e.g. "existing client") flaky.
**Acceptance criteria**
- Given any test run, When each test starts (or ends), Then all Mongo state it
  touches is reset — and cleanup runs on BOTH success and failure.
- Kafka consumer-group offsets/state do not leak between runs.
- Running the suite twice back-to-back yields identical results.

### QA-3 · P1 · Missing `docker-compose.test.yml`
`package.json` `setup`/`teardown` scripts reference `docker-compose.test.yml`,
which does not exist, so `npm run setup` fails and there is no defined infra
bring-up for the suite.
**Acceptance criteria**
- An infra-only compose file (Mongo, Kafka, Zookeeper) exists for the tests.
- `npm run setup` / `npm run teardown` bring the E2E infra up/down cleanly
  (`down -v` leaves no residual volumes).

### QA-4 · P1 · Quarantine stale sibling E2E files (02/03)
`vitest.config.ts` runs all `e2e/**/*.e2e.test.ts`. `02-portfolio-curation` and
`03-client-gallery-access` target unimplemented endpoints and have wrong config
(e.g. `03:32` uses port 3003 — invitation-service — for `fileServiceUrl`, which
is 3006). They fail and turn the whole suite red regardless of scenario 1.
**Acceptance criteria**
- The stale E2E files are skipped/quarantined (or CI is scoped to `01`) so a
  green scenario-1 run isn't masked by unrelated failures.
- Each quarantined file carries a note on what must exist before it's re-enabled.

### QA-5 · P2 · Deterministic Kafka topic/consumer-group lifecycle
The harness relies on Kafka auto-creating topics, which caused rebalance storms
and ghost consumer-group members in real runs.
**Acceptance criteria**
- Topics (`shoots`, `users`, `invitations`, `notifications`, `magic-links`) are
  pre-created by the setup step before services start.
- Each run uses fresh/uniquely-scoped consumer groups (or resets them), so no
  ghost members split partition assignments.

### QA-6 · P2 · Replace vacuous "no direct calls" assertion
`test-helpers.ts:193` hardcodes `getDirectServiceCallsCount(): 0`, so the happy
path's `expect(directCallsCount).toBe(0)` proves nothing about the event-only
(no direct service-to-service call) invariant.
**Acceptance criteria**
- The invariant is either genuinely verified (e.g. network spy / no inter-service
  HTTP observed) or the misleading assertion is removed.

### QA-7 · P3 · Remove/back the unused email inbox stub
`test-helpers.ts:103` `getSentEmails()` is an in-memory stub nothing populates.
Dead scaffolding that invites misuse now that `01` verifies delivery via the
`invitation.sent` event.
**Acceptance criteria**
- The stub is removed, or backed by the notification dry-run mailer so it
  reflects real sends.

### QA-8 · P3 · Enable the two skipped scenario-1 cases
`01:168` (invalidate previous invitation) and `01:206` (resilience on service
down) are `it.skip`. Invalidation logic isn't implemented; the resilience test's
`stop/start` helpers are `console.warn` no-ops (`test-helpers.ts:301`).
**Acceptance criteria**
- Invitation-service invalidates prior magic links for an email; the invalidation
  test is un-skipped and passes.
- Real service stop/start control + a retry/DLQ mechanism exist; the resilience
  test is un-skipped and passes.

---

## Product stories

_(Product-owner-groomed feature stories go here — e.g. frontend↔backend wiring,
client gallery access, guest permissions. To be populated.)_
